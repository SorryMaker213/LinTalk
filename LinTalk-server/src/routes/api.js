const express = require('express');
const config = require('../config');
const { createToken } = require('../utils/jwt');
const { getPublicKey, decryptPassword } = require('../utils/rsa');
const { succeed, fail } = require('../utils/response');
const {
  createOrLoginUser,
  toUserDto,
  listUsers,
  listUsersMap,
  updateUser,
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
} = require('../services');
const { wsByUserId } = require('../state');
const { upsertSession } = require('../session-store');
const { sendToUser, broadcast } = require('../ws');
const { askDoubao } = require('../ai-doubao');

const router = express.Router();

function asyncHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      const msg = err && err.message ? err.message : '请求失败';
      res.json(fail(msg));
    }
  };
}

function ensureNotFull() {
  if (wsByUserId.size >= config.lintalkLimit) {
    const err = new Error('聊天室人数已满，请稍后再试~');
    err.statusCode = 400;
    throw err;
  }
}

function parseBotMention(msgContent) {
  const result = {
    hasDoubao: false,
    text: ''
  };

  try {
    const parts = JSON.parse(msgContent);
    if (!Array.isArray(parts)) return result;

    for (const part of parts) {
      if (!part || typeof part !== 'object') continue;
      if (part.type === 'text' && part.content) {
        result.text += String(part.content);
      }
      if (part.type === 'at' && part.content) {
        try {
          const atUser = JSON.parse(part.content);
          if (atUser && atUser.type === 'bot' && atUser.id === 'doubao') {
            result.hasDoubao = true;
          }
        } catch {
        }
      }
    }
  } catch {
  }

  return result;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  let ip = '';

  if (typeof forwarded === 'string' && forwarded.trim()) {
    ip = forwarded.split(',')[0].trim();
  } else if (typeof realIp === 'string' && realIp.trim()) {
    ip = realIp.trim();
  } else if (typeof req.ip === 'string' && req.ip.trim()) {
    ip = req.ip.trim();
  } else if (req.socket && req.socket.remoteAddress) {
    ip = req.socket.remoteAddress;
  }

  // Normalize IPv6-mapped IPv4: ::ffff:127.0.0.1 -> 127.0.0.1
  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }
  if (ip === '::1') {
    return '127.0.0.1';
  }
  return ip || '未知';
}

async function sendDoubaoReplyAsync(userMessage) {
  const parsed = parseBotMention(userMessage.message);
  if (!parsed.hasDoubao) {
    return;
  }

  try {
    const ask = await askDoubao(userMessage.fromId, parsed.text);
    const botMessage = await saveMessage('doubao', {
      targetId: '1',
      source: 'group',
      msgContent: JSON.stringify([
        {
          type: 'at',
          content: JSON.stringify(userMessage.fromInfo)
        },
        {
          type: 'text',
          content: ask
        }
      ]),
      type: 'text'
    });
    await updateChatListOnMessage(botMessage);
    broadcast('msg', botMessage);
  } catch (err) {
    console.error('Doubao async reply failed:', err && err.message ? err.message : err);
  }
}

router.get('/api/v1/login/public-key', asyncHandler(async (_, res) => {
  res.json(succeed(getPublicKey()));
}));

router.post('/api/v1/login/verify', asyncHandler(async (req, res) => {
  ensureNotFull();
  const encrypted = req.body?.password;
  if (!encrypted) {
    res.json(fail('密码不能为空~'));
    return;
  }

  const plain = decryptPassword(encrypted) || String(encrypted);
  if (plain !== config.lintalkPassword) {
    res.json(fail('密码错误~'));
    return;
  }

  const token = createToken({ type: 'verify' });
  res.json(succeed(token));
}));

router.post('/api/v1/login', asyncHandler(async (req, res) => {
  ensureNotFull();
  const { name, email } = req.body || {};
  if (!name || !email) {
    res.json(fail('用户名和邮箱不能为空~'));
    return;
  }

  const row = await createOrLoginUser(name, email);
  const user = toUserDto(row);
  const payload = {
    type: 'user',
    role: 'user',
    userId: user.id,
    userName: user.name,
    email: user.email,
    avatar: user.avatar
  };
  const token = createToken(payload);
  await upsertSession(user.id, token);

  res.json(succeed({
    ...payload,
    token
  }));
}));

router.get('/api/v1/user/list', asyncHandler(async (_, res) => {
  const users = await listUsers();
  res.json(succeed(users));
}));

router.get('/api/v1/user/list/map', asyncHandler(async (_, res) => {
  const map = await listUsersMap();
  res.json(succeed(map));
}));

router.get('/api/v1/user/online/web', asyncHandler(async (_, res) => {
  res.json(succeed(Array.from(wsByUserId.keys())));
}));

router.post('/api/v1/user/update', asyncHandler(async (req, res) => {
  const ok = await updateUser(req.user.userId, req.body || {});
  res.json(ok ? succeed(true) : fail('更新失败'));
}));

router.get('/api/v1/chat-list/group', asyncHandler(async (req, res) => {
  const chat = await getGroupChat(req.user.userId);
  res.json(succeed(chat));
}));

router.get('/api/v1/chat-list/list/private', asyncHandler(async (req, res) => {
  const chats = await listPrivateChat(req.user.userId);
  res.json(succeed(chats));
}));

router.post('/api/v1/chat-list/create', asyncHandler(async (req, res) => {
  const chat = await createPrivateChat(req.user.userId, String(req.body?.targetId || ''));
  res.json(succeed(chat));
}));

router.post('/api/v1/chat-list/read', asyncHandler(async (req, res) => {
  const ok = await readChat(req.user.userId, String(req.body?.targetId || ''));
  res.json(ok ? succeed(true) : fail('设置已读失败'));
}));

router.post('/api/v1/chat-list/delete', asyncHandler(async (req, res) => {
  const ok = await deleteChat(req.user.userId, String(req.body?.chatListId || ''));
  res.json(ok ? succeed(true) : fail('删除失败'));
}));

router.post('/api/v1/message/send', asyncHandler(async (req, res) => {
  const payload = req.body || {};
  payload.userIp = getClientIp(req);
  const message = await saveMessage(req.user.userId, payload);
  await updateChatListOnMessage(message);

  if (message.source === 'group') {
    broadcast('msg', message);
  } else {
    sendToUser(message.fromId, 'msg', message);
    sendToUser(message.toId, 'msg', message);
  }

  // Return user message immediately to avoid sender-side waiting.
  res.json(succeed(message));

  // Process bot reply in background so user message always appears first.
  if (message.source === 'group' && message.type === 'text' && typeof message.message === 'string') {
    setTimeout(() => {
      sendDoubaoReplyAsync(message);
    }, 350);
  }
}));

router.post('/api/v1/message/record', asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const data = await listMessageRecord(
    req.user.userId,
    String(payload.targetId || ''),
    Number(payload.index || 0),
    Number(payload.num || 20)
  );
  res.json(succeed(data));
}));

router.post('/api/v1/message/recall', asyncHandler(async (req, res) => {
  const msg = await recallMessage(req.user.userId, String(req.body?.msgId || ''));
  if (msg.source === 'group') {
    broadcast('msg', msg);
  } else {
    sendToUser(msg.fromId, 'msg', msg);
    sendToUser(msg.toId, 'msg', msg);
  }
  res.json(succeed(msg));
}));

router.get('/api/v1/notify/get', asyncHandler(async (_, res) => {
  const latest = await getLatestNotify();
  res.json(succeed(latest));
}));

function bindSignalRoute(basePath, wsType, action) {
  router.post(`${basePath}/${action}`, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const body = req.body || {};
    const targetId = String(body.userId || body.targetId || body.toId || '');
    const signal = buildSignalMessage(action, userId, body);
    if (targetId) {
      sendToUser(targetId, wsType, signal);
    }
    res.json(succeed(true));
  }));
}

['offer', 'answer', 'candidate', 'hangup', 'invite', 'accept'].forEach((a) => {
  bindSignalRoute('/api/v1/video', 'video', a);
});

['offer', 'answer', 'candidate', 'cancel', 'invite', 'accept'].forEach((a) => {
  bindSignalRoute('/api/v1/file', 'file', a);
});

router.post('/api/v1/admin/notify', asyncHandler(async (req, res) => {
  const title = req.body?.title || '系统通知';
  const content = req.body?.content || '这是一条系统通知';
  await createNotify(title, content, 'system');
  const dto = {
    type: 'system',
    content: JSON.stringify({ title, content }),
    time: new Date().toISOString(),
    ext: ''
  };
  broadcast('notify', dto);
  res.json(succeed(true));
}));

module.exports = router;
