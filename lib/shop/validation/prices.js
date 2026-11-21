import { z } from "zod";

import { PRODUCT_CODES } from "../constants.js";
import { isoDateField, moneyField, selectField } from "./common.js";

export const rateSchema = z.object({
  productCode: selectField(PRODUCT_CODES, "product"),
  rate: moneyField("Rate per litre", { required: true, allowZero: false }),
  effectiveFrom: isoDateField("Effective date"),
});
