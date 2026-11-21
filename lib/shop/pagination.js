export const PAGE_SIZE = 25;

/** Turns a ?page= value into SQL LIMIT and OFFSET. Anything invalid falls back to page 1. */
export function paginate(rawPage, pageSize = PAGE_SIZE) {
  const parsed = Number.parseInt(String(rawPage ?? "1"), 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  return { page, pageSize, limit: pageSize, offset: (page - 1) * pageSize };
}

export function pageCount(total, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}
