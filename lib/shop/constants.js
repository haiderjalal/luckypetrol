// Shared labels and allowed values for the shop. Forms, validation, invoices and reports all read from here.

export const PRODUCT_CODES = ["PMG", "HSD", "HOBC"];

export const PRODUCT_LABELS = {
  PMG: "Petrol (PMG)",
  HSD: "Diesel (HSD)",
  HOBC: "High Octane (HOBC)",
};

export const CUSTOMER_TYPE_LABELS = {
  dealer: "Dealer / fuel station",
  shop_owner: "Vendor / shop owner",
  bank: "Bank",
  restaurant: "Restaurant / hotel",
  fast_food_chain: "Fast-food chain outlet",
  logistics: "Logistics / courier",
  industrial: "Industrial / manufacturing",
  textile: "Textile mill",
  construction: "Construction / real estate",
  healthcare: "Hospital / healthcare",
  education: "School / university",
  government: "Government / public sector",
  other: "Other business",
};

export const CUSTOMER_STATUS_LABELS = {
  active: "Active",
  inactive: "Inactive",
  blocked: "Blocked",
};

export const ORDER_SOURCE_LABELS = {
  shop: "Walk-in / shop",
  phone: "Phone",
  whatsapp: "WhatsApp",
  email: "Email",
  website: "Website",
};

export const ORDER_STATUS_LABELS = {
  received: "Received",
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_METHOD_LABELS = {
  cash: "Cash",
  cheque: "Cheque",
  bank_transfer: "Bank transfer",
  online: "Online / app",
  card: "Card",
  other: "Other",
};

export const TAX_MODE_LABELS = {
  inclusive: "Prices include sales tax",
  exclusive: "Sales tax is added on top of prices",
};

export const DELIVERY_STATUS_LABELS = {
  in_transit: "In transit",
  delivered: "Delivered",
};

export const MOVEMENT_TYPE_LABELS = {
  receipt: "Receipt",
  dispatch: "Dispatch",
  return: "Return to depot",
  adjustment: "Dip adjustment",
};

export const INVOICE_STATUS_LABELS = {
  issued: "Issued",
  cancelled: "Cancelled",
};

export const PAYMENT_STATE_LABELS = {
  unpaid: "Unpaid",
  partial: "Part paid",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABELS = {
  posted: "Posted",
  voided: "Voided",
};

export const CUSTOMER_TYPE_VALUES = Object.keys(CUSTOMER_TYPE_LABELS);
export const CUSTOMER_STATUS_VALUES = Object.keys(CUSTOMER_STATUS_LABELS);
export const ORDER_SOURCE_VALUES = Object.keys(ORDER_SOURCE_LABELS);
export const ORDER_STATUS_VALUES = Object.keys(ORDER_STATUS_LABELS);
export const PAYMENT_METHOD_VALUES = Object.keys(PAYMENT_METHOD_LABELS);
export const TAX_MODE_VALUES = Object.keys(TAX_MODE_LABELS);

/** Safety limit on typed litres per product (catches typos such as an extra zero). Not a business rule. */
export const MAX_LITRES_PER_PRODUCT = 1000000;

/** Defaults; both can be changed in Settings. */
export const DEFAULT_LOW_STOCK_PERCENT = 10;
export const DEFAULT_VARIANCE_TOLERANCE_PERCENT = 0.5;
export const DEFAULT_PAYMENT_TERMS_DAYS = 7;
