// Helpers shared by repositories. node:sqlite returns snake_case rows with null prototypes.
// The rest of the app expects plain camelCase objects that are safe to pass to React.

function camelKey(key) {
  return key.replace(/_([a-z0-9])/g, (_match, char) => char.toUpperCase());
}

export function toCamelRow(row) {
  if (!row) {
    return null;
  }

  const result = {};
  for (const [key, value] of Object.entries(row)) {
    result[camelKey(key)] = value;
  }
  return result;
}

export function toCamelRows(rows) {
  return rows.map(toCamelRow);
}

/** Optional values become NULL. Empty strings are stored as NULL, not as "". */
export function nullable(value) {
  return value === undefined || value === null || value === "" ? null : value;
}

/** node:sqlite cannot bind undefined, so it is converted to NULL here. */
function bindable(value) {
  return value === undefined ? null : value;
}

/** Builds a LIKE pattern that matches anywhere in the text. Use with ESCAPE '\'. */
export function likePattern(text) {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Inserts one row. `values` keys are real column names, so only pass trusted keys. */
export function insertInto(db, table, values) {
  const columns = Object.keys(values);
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
  const result = db.prepare(sql).run(...columns.map((column) => bindable(values[column])));
  return Number(result.lastInsertRowid);
}

/** Updates one row by id. `values` keys are real column names, so only pass trusted keys. */
export function updateRow(db, table, id, values) {
  const columns = Object.keys(values);
  const sql = `UPDATE ${table} SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`;
  return db.prepare(sql).run(...columns.map((column) => bindable(values[column])), id).changes;
}
