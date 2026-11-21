export async function listSettingRows(db) {
  const rows = await db`select key, value from shop.settings`;
  return [...rows];
}

/** Stores a settings document. `value` is an object, saved as jsonb. The database sets updated_at. */
export async function upsertSetting(db, key, value) {
  await db`
    insert into shop.settings (key, value) values (${key}, ${db.json(value)})
    on conflict (key) do update set value = excluded.value`;
}
