// Points the shop at a test database and refuses anything that could be the live one.
// The tests and the demo seed truncate or fill shop tables, so this check must run before any query.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** The Supabase project reference, from the pooler user (postgres.<ref>) or the direct host (db.<ref>.supabase.co). */
function projectRef(url) {
  const { username, hostname } = new URL(url);
  if (username.includes(".")) {
    return username.split(".").slice(1).join(".");
  }
  const direct = /^db\.([a-z0-9]+)\.supabase\.co$/.exec(hostname);
  return direct ? direct[1] : null;
}

/** Sets SHOP_DATABASE_URL to SHOP_TEST_DATABASE_URL, or throws when that could be the live database. */
export function useTestDatabase() {
  const testUrl = process.env.SHOP_TEST_DATABASE_URL;
  const liveUrl = process.env.SHOP_DATABASE_URL;

  if (!testUrl) {
    throw new Error("Set SHOP_TEST_DATABASE_URL to a test database. Never point tests at production.");
  }
  if (testUrl === liveUrl) {
    throw new Error("SHOP_TEST_DATABASE_URL must not be the live database.");
  }
  if (!LOCAL_HOSTS.has(new URL(testUrl).hostname)) {
    const ref = projectRef(testUrl);
    if (!ref) {
      throw new Error("Cannot confirm that the test database is not the live one. Use a local database or a Supabase test project.");
    }
    if (liveUrl && ref === projectRef(liveUrl)) {
      throw new Error("SHOP_TEST_DATABASE_URL points at the live Supabase project.");
    }
  }

  process.env.SHOP_DATABASE_URL = testUrl;
}
