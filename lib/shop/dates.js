// Business dates are YYYY-MM-DD in Pakistan time (Asia/Karachi, UTC+5, no daylight saving).
// Timestamps stored in the database are ISO strings in UTC.

export const BUSINESS_TIME_ZONE = "Asia/Karachi";

export const AGING_BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MS_PER_DAY = 86400000;

const karachiDateParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const karachiDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Today's date in Pakistan time, as YYYY-MM-DD. */
export function todayIso(now = new Date()) {
  const parts = Object.fromEntries(karachiDateParts.formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isIsoDate(value) {
  if (typeof value !== "string" || !ISO_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isTimeOfDay(value) {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

/** Adds calendar days to an ISO date. Negative values move backwards. */
export function addDays(isoDate, days) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Whole days from one ISO date to another (negative when `toIso` is earlier). */
export function daysBetween(fromIso, toIso) {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / MS_PER_DAY);
}

export function monthStart(isoDate) {
  return `${isoDate.slice(0, 8)}01`;
}

/** Pakistan's financial year runs 1 July to 30 June, so it is labelled 2026-27 for July 2026 to June 2027. */
export function fiscalYearStart(isoDate) {
  const [year, month] = isoDate.split("-").map(Number);
  const startYear = month >= 7 ? year : year - 1;
  return `${startYear}-07-01`;
}

export function fiscalYearLabel(isoDate) {
  const startYear = Number(fiscalYearStart(isoDate).slice(0, 4));
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/** Display format: "21 Nov 2026". Returns an empty string for missing input. */
export function formatDate(isoDate) {
  if (!isoDate) {
    return "";
  }

  const [year, month, day] = isoDate.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

/** Display format for timestamps in Pakistan time: "21 Nov 2026, 14:05". */
export function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return karachiDateTime.format(date);
}

/** Maps days past due to an aging bucket. Zero or fewer days means not yet due. */
export function agingBucket(daysPastDue) {
  if (daysPastDue <= 0) {
    return "current";
  }
  if (daysPastDue <= 30) {
    return "1-30";
  }
  if (daysPastDue <= 60) {
    return "31-60";
  }
  if (daysPastDue <= 90) {
    return "61-90";
  }
  return "90+";
}
