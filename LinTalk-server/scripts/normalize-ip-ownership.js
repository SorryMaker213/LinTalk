const { initDb, getDb } = require('../src/db');
const { normalizeIp, isIpv4, isPrivateIpv4 } = require('../src/ip-region');

const UNKNOWN_LABEL = '未知(网络异常)';

function isUnknownLike(value) {
  if (value === null || value === undefined) return true;
  const text = String(value).trim().toLowerCase();
  return (
    !text ||
    text === '未知' ||
    text === 'unknown' ||
    text === 'null' ||
    text === 'undefined' ||
    text === '-'
  );
}

function normalizeOwnership(currentOwnership, userType, fromInfo = {}) {
  if (userType === 'bot' || fromInfo.type === 'bot') {
    return '机器人';
  }

  const rawOwnership = currentOwnership === undefined ? '' : String(currentOwnership).trim();
  const normalized = normalizeIp(rawOwnership);

  if (normalized && isIpv4(normalized) && isPrivateIpv4(normalized)) {
    return '内网';
  }

  // Keep existing concrete region labels unchanged.
  if (!isUnknownLike(rawOwnership) && rawOwnership !== '内网' && rawOwnership !== '机器人') {
    return rawOwnership;
  }

  return UNKNOWN_LABEL;
}

async function main() {
  await initDb();
  const db = getDb();

  const users = await db.all('SELECT id, type FROM user');
  const userTypeMap = new Map(users.map((u) => [String(u.id), u.type || 'user']));

  const rows = await db.all('SELECT id, from_id, from_info FROM message ORDER BY create_time ASC');

  let updated = 0;
  for (const row of rows) {
    let fromInfo;
    try {
      fromInfo = row.from_info ? JSON.parse(row.from_info) : {};
    } catch {
      fromInfo = {};
    }

    const userType = userTypeMap.get(String(row.from_id)) || fromInfo.type || 'user';
    const currentOwnership = fromInfo.ipOwnership;
    const nextOwnership = normalizeOwnership(currentOwnership, userType, fromInfo);

    if (nextOwnership === currentOwnership) {
      continue;
    }

    fromInfo.ipOwnership = nextOwnership;
    await db.run('UPDATE message SET from_info = ? WHERE id = ?', [JSON.stringify(fromInfo), row.id]);
    updated += 1;
  }

  console.log(`Normalize completed. Updated ${updated} message rows.`);
}

main().catch((err) => {
  console.error('Normalize failed:', err.message || err);
  process.exit(1);
});
