import { NextResponse } from "next/server";

import { logger } from "@/lib/shop/logger.js";
import { isShopError } from "@/lib/shop/errors.js";
import { getSignedInUser } from "@/lib/shop/session-guard.js";
import { buildCsvExport, REPORT_KEYS } from "@/lib/shop/services/reports.js";

export const dynamic = "force-dynamic";

/** Downloads one report as CSV. Requires a shop session; middleware also blocks unauthenticated requests. */
export async function GET(request) {
  const user = await getSignedInUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Sign in to download reports." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const report = searchParams.get("report") ?? "";
  if (!REPORT_KEYS.includes(report)) {
    return NextResponse.json({ success: false, message: "Choose a report to download." }, { status: 400 });
  }

  try {
    const { filename, csv } = await buildCsvExport(report, {
      from: searchParams.get("from") ?? "",
      to: searchParams.get("to") ?? "",
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (isShopError(error)) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    logger.error("Shop report export failed", { error, report });
    return NextResponse.json({ success: false, message: "The report could not be created. Please try again." }, { status: 500 });
  }
}
