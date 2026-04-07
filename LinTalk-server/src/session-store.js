const jwt = require('jsonwebtoken');
const { getDb, getDbType, nowIso } = require('./db');

function getExpireIsoFromToken(token) {
  const decoded = jwt.decode(token);
  if (!decoded || !decoded.exp) return null;
  const d = new Date(decoded.exp * 1000);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

async function upsertSession(userId, token) {
  const db = getDb();
  const now = nowIso();
  const expiresAt = getExpireIsoFromToken(token);
  if (getDbType() === 'mysql') {
    await db.run(
      `INSERT INTO user_session (user_id, token, expires_at, create_time, update_time)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         token = VALUES(token),
         expires_at = VALUES(expires_at),
         update_time = VALUES(update_time)`,
      [String(userId), token, expiresAt, now, now]
    );
  } else {
    await db.run(
      `INSERT INTO user_session (user_id, token, expires_at, create_time, update_time)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         token = excluded.token,
         expires_at = excluded.expires_at,
         update_time = excluded.update_time`,
      [String(userId), token, expiresAt, now, now]
    );
  }
}

async function getSessionTokenByUserId(userId) {
  const db = getDb();
  const row = await db.get('SELECT token, expires_at FROM user_session WHERE user_id = ?', [String(userId)]);
  if (!row) return null;

  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    await db.run('DELETE FROM user_session WHERE user_id = ?', [String(userId)]);
    return null;
  }

  return row.token;
}

async function deleteSessionByUserId(userId) {
  const db = getDb();
  await db.run('DELETE FROM user_session WHERE user_id = ?', [String(userId)]);
}

async function clearExpiredSessions() {
  const db = getDb();
  await db.run('DELETE FROM user_session WHERE expires_at IS NOT NULL AND expires_at <= ?', [nowIso()]);
}

module.exports = {
  upsertSession,
  getSessionTokenByUserId,
  deleteSessionByUserId,
  clearExpiredSessions
};
