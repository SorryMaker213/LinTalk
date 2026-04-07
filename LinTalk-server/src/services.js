const config = require('./config');
const { getDb, getDbType, nowIso, uuidv4 } = require('./db');
const { wsByUserId } = require('./state');
const { resolveIpOwnership } = require('./ip-region');

function parseJsonSafe(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toUserDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    type: row.type || 'user',
    avatar: row.avatar || '',
    email: row.email || '',
    badge: parseJsonSafe(row.badge, null)
  };
}

function withStatus(user) {
  if (!user) return null;
  const online = wsByUserId.has(user.id);
  return { ...user, status: online ? ['web'] : [] };
}

async function getUserById(userId) {
  const db = getDb();
  const row = await db.get('SELECT * FROM user WHERE id = ?', [userId]);
  return toUserDto(row);
}

async function getUserByNameOrEmail(name, email) {
  const db = getDb();
  return db.get('SELECT * FROM user WHERE name = ? OR email = ?', [name, email]);
}

async function createOrLoginUser(name, email) {
  const db = getDb();
  const found = await getUserByNameOrEmail(name, email);
  const time = nowIso();

  if (found) {
    if (name === found.name && email !== found.email) {
      const err = new Error('用户名已被使用~');
      err.statusCode = 400;
      throw err;
    }
    if (name !== found.name && email === found.email) {
      const err = new Error('邮箱已被使用~');
      err.statusCode = 400;
      throw err;
    }
    await db.run('UPDATE user SET login_time = ?, update_time = ? WHERE id = ?', [time, time, found.id]);
    return (await db.get('SELECT * FROM user WHERE id = ?', [found.id]));
  }

  const id = uuidv4();
  await db.run(
    'INSERT INTO user (id, name, type, avatar, email, create_time, update_time, login_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, 'user', '', email, time, time, time]
  );
  return db.get('SELECT * FROM user WHERE id = ?', [id]);
}

async function listUsers() {
  const db = getDb();
  const rows = await db.all('SELECT * FROM user ORDER BY CASE WHEN type = "bot" THEN 0 ELSE 1 END, login_time DESC');
  return rows.map((r) => withStatus(toUserDto(r)));
}

async function listUsersMap() {
  const users = await listUsers();
  const map = {};
  users.forEach((u) => {
    map[u.id] = u;
  });
  return map;
}

async function updateUser(userId, payload) {
  const db = getDb();
  const old = await db.get('SELECT * FROM user WHERE id = ?', [userId]);
  if (!old) return false;

  const name = payload.name || old.name;
  const email = payload.email || old.email;
  const avatar = payload.avatar === undefined ? old.avatar : payload.avatar;

  const conflict = await db.get('SELECT id, name, email FROM user WHERE (name = ? OR email = ?) AND id != ?', [name, email, userId]);
  if (conflict) {
    const err = new Error('用户名或邮箱已被使用~');
    err.statusCode = 400;
    throw err;
  }

  await db.run('UPDATE user SET name = ?, email = ?, avatar = ?, update_time = ? WHERE id = ?', [name, email, avatar, nowIso(), userId]);
  return true;
}

function getGroupTargetInfo() {
  return {
    id: '1',
    name: config.lintalkName,
    avatar: '',
    type: 'group'
  };
}

async function ensureGroupChatForUser(userId) {
  const db = getDb();
  const existed = await db.get('SELECT * FROM chat_list WHERE user_id = ? AND target_id = ? AND type = ?', [userId, '1', 'group']);
  if (existed) return existed;

  const id = uuidv4();
  const time = nowIso();
  await db.run(
    'INSERT INTO chat_list (id, user_id, target_id, target_info, unread_count, last_message, type, create_time, update_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, userId, '1', JSON.stringify(getGroupTargetInfo()), 0, null, 'group', time, time]
  );
  return db.get('SELECT * FROM chat_list WHERE id = ?', [id]);
}

function mapChatList(row) {
  return {
    id: row.id,
    userId: row.user_id,
    targetId: row.target_id,
    targetInfo: parseJsonSafe(row.target_info, {}),
    unreadCount: row.unread_count || 0,
    lastMessage: parseJsonSafe(row.last_message, null),
    type: row.type,
    createTime: row.create_time,
    updateTime: row.update_time
  };
}

async function getGroupChat(userId) {
  const row = await ensureGroupChatForUser(userId);
  return mapChatList(row);
}

async function listPrivateChat(userId) {
  const db = getDb();
  const rows = await db.all('SELECT * FROM chat_list WHERE user_id = ? AND type = ? ORDER BY update_time DESC', [userId, 'user']);
  return rows.map(mapChatList);
}

async function createPrivateChat(userId, targetId) {
  const db = getDb();
  if (userId === targetId) {
    const err = new Error('不能和自己私聊~');
    err.statusCode = 400;
    throw err;
  }

  const target = await getUserById(targetId);
  if (!target) {
    const err = new Error('目标用户不存在~');
    err.statusCode = 404;
    throw err;
  }

  const existed = await db.get('SELECT * FROM chat_list WHERE user_id = ? AND target_id = ? AND type = ?', [userId, targetId, 'user']);
  if (existed) return mapChatList(existed);

  const id = uuidv4();
  const time = nowIso();
  await db.run(
    'INSERT INTO chat_list (id, user_id, target_id, target_info, unread_count, last_message, type, create_time, update_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, userId, targetId, JSON.stringify(target), 0, null, 'user', time, time]
  );
  const row = await db.get('SELECT * FROM chat_list WHERE id = ?', [id]);
  return mapChatList(row);
}

async function readChat(userId, targetId) {
  const db = getDb();
  await db.run('UPDATE chat_list SET unread_count = 0, update_time = ? WHERE user_id = ? AND target_id = ?', [nowIso(), userId, targetId]);
  return true;
}

async function deleteChat(userId, chatListId) {
  const db = getDb();
  const result = await db.run('DELETE FROM chat_list WHERE id = ? AND user_id = ?', [chatListId, userId]);
  return result.changes > 0;
}

function parseMessageRow(row) {
  return {
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
    fromInfo: parseJsonSafe(row.from_info, {}),
    message: row.message,
    referenceMsg: parseJsonSafe(row.reference_msg, null),
    atUser: parseJsonSafe(row.at_user, null),
    isShowTime: !!row.is_show_time,
    type: row.type,
    source: row.source,
    createTime: row.create_time,
    updateTime: row.update_time
  };
}

async function getLastMessageForThread(userId, targetId, source) {
  const db = getDb();
  if (source === 'group') {
    return db.get('SELECT * FROM message WHERE source = ? ORDER BY create_time DESC LIMIT 1', ['group']);
  }

  return db.get(
    `SELECT * FROM message
     WHERE source = 'user'
       AND ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))
     ORDER BY create_time DESC LIMIT 1`,
    [userId, targetId, targetId, userId]
  );
}

function calcShowTime(last) {
  if (!last) return 1;
  const prev = new Date(last.update_time).getTime();
  const now = Date.now();
  return now - prev > 5 * 60 * 1000 ? 1 : 0;
}

async function saveMessage(userId, payload) {
  const db = getDb();
  const fromUser = await getUserById(userId);
  if (!fromUser) {
    const err = new Error('用户不存在~');
    err.statusCode = 404;
    throw err;
  }

  const targetId = String(payload.targetId);
  const source = payload.source === 'group' ? 'group' : 'user';
  const last = await getLastMessageForThread(userId, targetId, source);
  const id = uuidv4();
  const time = nowIso();
  const ipOwnership = await resolveIpOwnership(fromUser.type, payload.userIp || fromUser.ipOwnership || '');
  const fromInfo = {
    ...fromUser,
    ipOwnership
  };

  let referenceMsg = null;
  if (payload.referenceMsgId) {
    const ref = await db.get('SELECT * FROM message WHERE id = ?', [payload.referenceMsgId]);
    if (ref) {
      const parsed = parseMessageRow(ref);
      parsed.referenceMsg = null;
      referenceMsg = parsed;
    }
  }

  await db.run(
    `INSERT INTO message (id, from_id, to_id, from_info, message, reference_msg, at_user, is_show_time, type, source, create_time, update_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      targetId,
      JSON.stringify(fromInfo),
      payload.msgContent,
      referenceMsg ? JSON.stringify(referenceMsg) : null,
      null,
      calcShowTime(last),
      payload.type,
      source,
      time,
      time
    ]
  );

  const row = await db.get('SELECT * FROM message WHERE id = ?', [id]);
  return parseMessageRow(row);
}

async function upsertPrivateChat(userId, targetId, message, increaseUnread) {
  const db = getDb();
  const targetInfo = await getUserById(targetId);
  const existed = await db.get('SELECT * FROM chat_list WHERE user_id = ? AND target_id = ? AND type = ?', [userId, targetId, 'user']);
  const time = nowIso();

  if (!existed) {
    const id = uuidv4();
    await db.run(
      'INSERT INTO chat_list (id, user_id, target_id, target_info, unread_count, last_message, type, create_time, update_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId, targetId, JSON.stringify(targetInfo), increaseUnread ? 1 : 0, JSON.stringify(message), 'user', time, time]
    );
    return;
  }

  const unread = Math.max(0, (existed.unread_count || 0) + (increaseUnread ? 1 : 0));
  await db.run('UPDATE chat_list SET last_message = ?, unread_count = ?, update_time = ? WHERE id = ?', [JSON.stringify(message), unread, time, existed.id]);
}

async function updateChatListOnMessage(message) {
  const db = getDb();
  if (message.source === 'group') {
    const users = await db.all('SELECT id FROM user');
    for (const u of users) {
      const group = await ensureGroupChatForUser(u.id);
      const unread = u.id === message.fromId ? group.unread_count || 0 : (group.unread_count || 0) + 1;
      await db.run('UPDATE chat_list SET last_message = ?, unread_count = ?, update_time = ? WHERE id = ?', [JSON.stringify(message), unread, nowIso(), group.id]);
    }
    return;
  }

  await upsertPrivateChat(message.fromId, message.toId, message, false);
  await upsertPrivateChat(message.toId, message.fromId, message, true);
}

async function listMessageRecord(userId, targetId, index, num) {
  const db = getDb();
  const i = Math.max(0, Number(index || 0) || 0);
  const n = Math.min(100, Math.max(1, Number(num || 20) || 20));
  const limitSql = ` LIMIT ${n} OFFSET ${i} `;
  let rows;

  if (String(targetId) === '1') {
    if (getDbType() === 'mysql') {
      rows = await db.all(
        `SELECT * FROM message
         WHERE source = 'group'
         ORDER BY create_time DESC${limitSql}`
      );
    } else {
      rows = await db.all(
        `SELECT * FROM message
         WHERE source = 'group'
         ORDER BY create_time DESC
         LIMIT ? OFFSET ?`,
        [n, i]
      );
    }
  } else {
    if (getDbType() === 'mysql') {
      rows = await db.all(
        `SELECT * FROM message
         WHERE source = 'user'
           AND ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))
         ORDER BY create_time DESC${limitSql}`,
        [userId, String(targetId), String(targetId), userId]
      );
    } else {
      rows = await db.all(
        `SELECT * FROM message
         WHERE source = 'user'
           AND ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))
         ORDER BY create_time DESC
         LIMIT ? OFFSET ?`,
        [userId, String(targetId), String(targetId), userId, n, i]
      );
    }
  }

  await readChat(userId, String(targetId));
  return rows.map(parseMessageRow);
}

async function recallMessage(userId, msgId) {
  const db = getDb();
  const row = await db.get('SELECT * FROM message WHERE id = ?', [msgId]);
  if (!row) {
    const err = new Error('消息不存在~');
    err.statusCode = 404;
    throw err;
  }

  if (row.from_id !== userId) {
    const err = new Error('仅能撤回自己的消息~');
    err.statusCode = 403;
    throw err;
  }

  const tooLate = Date.now() - new Date(row.create_time).getTime() > 2 * 60 * 1000;
  if (tooLate) {
    const err = new Error('消息已超过2分钟，无法撤回~');
    err.statusCode = 400;
    throw err;
  }

  await db.run('UPDATE message SET type = ?, message = ?, update_time = ? WHERE id = ?', ['recall', '', nowIso(), msgId]);
  const updated = await db.get('SELECT * FROM message WHERE id = ?', [msgId]);
  const msg = parseMessageRow(updated);
  await updateChatListOnMessage(msg);
  return msg;
}

async function getLatestNotify() {
  const db = getDb();
  const row = await db.get('SELECT * FROM notify ORDER BY create_time DESC LIMIT 1');
  if (!row) return null;
  return {
    id: row.id,
    notifyTitle: row.notify_title,
    notifyContent: row.notify_content,
    type: row.type,
    createTime: row.create_time,
    updateTime: row.update_time
  };
}

async function createNotify(title, content, type = 'system') {
  const db = getDb();
  const id = uuidv4();
  const time = nowIso();
  await db.run(
    'INSERT INTO notify (id, notify_title, notify_content, type, create_time, update_time) VALUES (?, ?, ?, ?, ?, ?)',
    [id, title, content, type, time, time]
  );
}

function buildSignalMessage(action, fromId, body) {
  return {
    ...body,
    type: action,
    fromId,
    time: nowIso()
  };
}

module.exports = {
  toUserDto,
  withStatus,
  getUserById,
  createOrLoginUser,
  listUsers,
  listUsersMap,
  updateUser,
  getGroupTargetInfo,
  getGroupChat,
  listPrivateChat,
  createPrivateChat,
  readChat,
  deleteChat,
  saveMessage,
  updateChatListOnMessage,
  listMessageRecord,
  recallMessage,
  getLatestNotify,
  createNotify,
  buildSignalMessage
};
