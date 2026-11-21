export async function insertLoginFailure(db, clientKey) {
  await db`insert into shop.login_attempts (client_key) values (${clientKey})`;
}

/** Failure times for one client inside the window, newest first, as milliseconds. The caller needs at most `limit`. */
export async function listRecentLoginFailures(db, clientKey, windowSeconds, limit) {
  const rows = await db`
    select failed_at from shop.login_attempts
    where client_key = ${clientKey} and failed_at > now() - make_interval(secs => ${windowSeconds})
    order by failed_at desc
    limit ${limit}`;
  return rows.map((row) => new Date(row.failedAt).getTime());
}

export async function deleteLoginFailures(db, clientKey) {
  await db`delete from shop.login_attempts where client_key = ${clientKey}`;
}

export async function deleteOldLoginFailures(db, olderThanSeconds) {
  await db`delete from shop.login_attempts where failed_at < now() - make_interval(secs => ${olderThanSeconds})`;
}
