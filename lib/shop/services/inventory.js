// Depots, tanks, stock receipts and dip readings. Book stock is always the sum of stock movements.

import { PRODUCT_LABELS } from "../constants.js";
import { currentDb, transaction } from "../db.js";
import { ShopError, notFoundError } from "../errors.js";
import { formatLitres } from "../money.js";
import {
  dipsForTank,
  findDepot,
  findDepotByCode,
  findTank,
  findTankByDepotAndName,
  insertDepot,
  insertDip,
  insertMovement,
  insertTank,
  listDepots,
  listTankRows,
  movementsForTank,
  productStockTotals,
  tankBookLitres,
} from "../repositories/inventory.js";
import { nullable } from "../repositories/rows.js";
import { recordAudit } from "./audit.js";
import { readSettings } from "./settings.js";

const TANK_HISTORY_LIMIT = 40;
const DIP_HISTORY_LIMIT = 20;

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Adds fill level, low-stock and variance flags to a tank row. */
export function decorateTank(tank, { lowStockPercent, tolerancePercent }) {
  const fillPercent = tank.capacityLitres > 0 ? (tank.bookLitres / tank.capacityLitres) * 100 : 0;
  const dipBase = tank.lastDipBookLitres ?? 0;
  const variancePercent =
    tank.lastVarianceLitres === null || tank.lastVarianceLitres === undefined || dipBase <= 0
      ? null
      : roundTo((tank.lastVarianceLitres / dipBase) * 100, 2);

  return {
    ...tank,
    productLabel: PRODUCT_LABELS[tank.productCode] ?? tank.productCode,
    fillPercent: roundTo(fillPercent, 1),
    isLow: fillPercent < lowStockPercent,
    variancePercent,
    hasVarianceAlert: variancePercent !== null && Math.abs(variancePercent) > tolerancePercent,
  };
}

export async function getInventoryOverview() {
  const db = currentDb();
  const settings = await readSettings(db);
  const thresholds = {
    lowStockPercent: settings.operations.lowStockPercent,
    tolerancePercent: settings.operations.varianceTolerancePercent,
  };

  const tanks = (await listTankRows(db)).map((tank) => decorateTank(tank, thresholds));
  const depots = (await listDepots(db)).map((depot) => ({
    ...depot,
    tanks: tanks.filter((tank) => tank.depotId === depot.id),
  }));

  const productTotals = (await productStockTotals(db)).map((row) => ({
    ...row,
    label: PRODUCT_LABELS[row.productCode] ?? row.productCode,
    fillPercent: row.capacityLitres > 0 ? roundTo((row.bookLitres / row.capacityLitres) * 100, 1) : 0,
  }));

  return {
    depots,
    tanks,
    productTotals,
    ...thresholds,
    alerts: tanks.filter((tank) => tank.isLow || tank.hasVarianceAlert),
  };
}

export async function createDepot(input, actor) {
  return transaction(async (db) => {
    if (await findDepotByCode(db, input.code)) {
      throw new ShopError(`A depot with code ${input.code} already exists.`, { fieldErrors: { code: "This code is already used." } });
    }

    const id = await insertDepot(db, {
      code: input.code,
      name: input.name,
      location: nullable(input.location),
      is_active: true,
    });

    await recordAudit(db, { actor, action: "depot.created", entityType: "depot", entityId: id, summary: `Added depot ${input.code} ${input.name}` });
    return { message: `${input.name} added.` };
  });
}

export async function createTank(input, actor) {
  return transaction(async (db) => {
    const depot = await findDepot(db, input.depotId);
    if (!depot) {
      throw notFoundError("Depot");
    }
    if (await findTankByDepotAndName(db, depot.id, input.name)) {
      throw new ShopError(`${depot.name} already has a tank called ${input.name}.`, { fieldErrors: { name: "Use a different tank name." } });
    }

    const id = await insertTank(db, {
      depot_id: depot.id,
      name: input.name,
      product_code: input.productCode,
      capacity_litres: input.capacityLitres,
      is_active: true,
    });

    await recordAudit(db, {
      actor,
      action: "tank.created",
      entityType: "tank",
      entityId: id,
      summary: `Added ${input.name} at ${depot.name} for ${PRODUCT_LABELS[input.productCode]}, ${formatLitres(input.capacityLitres)} L`,
    });

    return { message: `${input.name} added to ${depot.name}.` };
  });
}

export async function receiveStock(input, actor) {
  return transaction(async (db) => {
    const tank = await findTank(db, input.tankId);
    if (!tank) {
      throw notFoundError("Tank");
    }
    if (!tank.isActive) {
      throw new ShopError(`${tank.name} is inactive and cannot take stock.`);
    }

    const bookBefore = await tankBookLitres(db, tank.id);
    const freeLitres = tank.capacityLitres - bookBefore;
    if (input.litres > freeLitres) {
      throw new ShopError(
        `${tank.name} has room for ${formatLitres(freeLitres)} more litres. Reduce the quantity or receive the rest separately.`,
        { fieldErrors: { litres: `Only ${formatLitres(freeLitres)} litres of space left.` } },
      );
    }

    await insertMovement(db, {
      tank_id: tank.id,
      movement_type: "receipt",
      litres: input.litres,
      reference: nullable(input.reference),
      occurred_on: input.occurredOn,
      created_by: actor,
    });

    await recordAudit(db, {
      actor,
      action: "stock.received",
      entityType: "tank",
      entityId: tank.id,
      summary: `${formatLitres(input.litres)} L of ${PRODUCT_LABELS[tank.productCode]} received into ${tank.name}${input.reference ? ` (${input.reference})` : ""}`,
    });

    return { message: `${formatLitres(input.litres)} litres received into ${tank.name}.` };
  });
}

/**
 * Records a physical dip. The difference from book stock is the variance. It can be posted as an adjustment,
 * which makes the measured figure the new book stock.
 */
export async function recordDip(input, actor) {
  return transaction(async (db) => {
    const tank = await findTank(db, input.tankId);
    if (!tank) {
      throw notFoundError("Tank");
    }
    if (input.measuredLitres > tank.capacityLitres) {
      throw new ShopError(`The measured ${formatLitres(input.measuredLitres)} litres is more than ${tank.name} can hold.`, {
        fieldErrors: { measuredLitres: "More than the tank capacity." },
      });
    }

    const bookLitres = await tankBookLitres(db, tank.id);
    const varianceLitres = input.measuredLitres - bookLitres;
    // The adjusted column is NOT NULL, so the flag is always a real boolean.
    const shouldAdjust = Boolean(input.postAdjustment) && varianceLitres !== 0;

    await insertDip(db, {
      tank_id: tank.id,
      measured_on: input.measuredOn,
      measured_litres: input.measuredLitres,
      book_litres: bookLitres,
      variance_litres: varianceLitres,
      adjusted: shouldAdjust,
      notes: nullable(input.notes),
      created_by: actor,
    });

    if (shouldAdjust) {
      await insertMovement(db, {
        tank_id: tank.id,
        movement_type: "adjustment",
        litres: varianceLitres,
        reference: `Dip ${input.measuredOn}`,
        occurred_on: input.measuredOn,
        created_by: actor,
      });
    }

    await recordAudit(db, {
      actor,
      action: "stock.dip",
      entityType: "tank",
      entityId: tank.id,
      summary: `${tank.name} dip ${formatLitres(input.measuredLitres)} L against book ${formatLitres(bookLitres)} L (variance ${formatLitres(varianceLitres)} L)${shouldAdjust ? ", adjusted" : ""}`,
    });

    if (varianceLitres === 0) {
      return { message: "Dip recorded. Book and physical stock agree." };
    }

    const sign = varianceLitres > 0 ? "+" : "";
    const adjustNote = shouldAdjust ? " and posted as an adjustment." : ". Not adjusted yet.";
    return { message: `Dip recorded. Variance ${sign}${formatLitres(varianceLitres)} litres${adjustNote}` };
  });
}

export async function getTankHistory(tankId) {
  const db = currentDb();
  const tank = await findTank(db, tankId);
  if (!tank) {
    throw notFoundError("Tank");
  }

  return {
    tank: {
      ...tank,
      bookLitres: await tankBookLitres(db, tank.id),
      productLabel: PRODUCT_LABELS[tank.productCode] ?? tank.productCode,
    },
    movements: await movementsForTank(db, tank.id, TANK_HISTORY_LIMIT),
    dips: await dipsForTank(db, tank.id, DIP_HISTORY_LIMIT),
  };
}

export async function listDepotOptions() {
  const db = currentDb();
  return (await listDepots(db)).filter((depot) => depot.isActive);
}
