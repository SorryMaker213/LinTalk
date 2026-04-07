const { initDb, getDb } = require('../src/db');
const { resolveIpOwnership } = require('../src/ip-region');

async function main() {
  await initDb();
  const db = getDb();

  const rows = await db.all('SELECT id, from_id, from_info FROM message ORDER BY create_time ASC');
  const users = await db.all('SELECT id, type FROM user');
  const userTypeMap = new Map(users.map((u) => [u.id, u.type || 'user']));
  const updates = [];

  for (const row of rows) {
    let fromInfo;
    try {
      fromInfo = row.from_info ? JSON.parse(row.from_info) : {};
    } catch {
      fromInfo = {};
    }

    const currentOwnership = fromInfo.ipOwnership;
    const userType = userTypeMap.get(row.from_id) || 'user';
    const nextOwnership = await resolveIpOwnership(userType, currentOwnership || '');

    if (nextOwnership === currentOwnership) {
      continue;
    }

    fromInfo.ipOwnership = nextOwnership;
    updates.push({
      id: row.id,
      fromInfo: JSON.stringify(fromInfo)
    });
  }

  for (const item of updates) {
    await db.run('UPDATE message SET from_info = ? WHERE id = ?', [item.fromInfo, item.id]);
  }

  console.log(`Backfill completed. Updated ${updates.length} message rows.`);
}

main().catch((err) => {
  console.error('Backfill failed:', err.message);
  process.exit(1);
});
