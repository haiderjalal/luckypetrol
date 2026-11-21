// Query helpers shared by repositories. postgres.js already returns camelCase objects, so no row conversion is needed.

/** Optional values become NULL. Empty strings are stored as NULL, not as "". */
export function nullable(value) {
  return value === undefined || value === null || value === "" ? null : value;
}

/** Builds an ILIKE pattern that matches anywhere in the text. Backslash is Postgres's default escape character. */
export function likePattern(text) {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Joins SQL conditions with AND. With no conditions it returns an empty fragment. */
export function whereAll(db, conditions) {
  if (conditions.length === 0) {
    return db``;
  }
  const [first, ...rest] = conditions;
  return db`where ${rest.reduce((combined, condition) => db`${combined} and ${condition}`, first)}`;
}
