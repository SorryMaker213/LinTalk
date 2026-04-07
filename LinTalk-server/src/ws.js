const WebSocket = require('ws');
const url = require('url');
const config = require('./config');
const { parseToken } = require('./utils/jwt');
const { wsByUserId, userIdByWs } = require('./state');
const { listUsersMap } = require('./services');
const { getSessionTokenByUserId } = require('./session-store');

let wss = null;

function sendWrapped(ws, type, content) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type, content }));
}

function sendToUser(userId, type, content) {
  const ws = wsByUserId.get(String(userId));
  sendWrapped(ws, type, content);
}

function broadcast(type, content) {
  wsByUserId.forEach((ws) => sendWrapped(ws, type, content));
}

async function broadcastUserStatus(type, userId) {
  const map = await listUsersMap();
  const user = map[String(userId)];
  if (!user) return;

  const notify = {
    type,
    content: JSON.stringify(user),
    time: new Date().toISOString(),
    ext: ''
  };
  broadcast('notify', notify);
}

function bindWebSocketServer() {
  wss = new WebSocket.Server({
    port: config.wsPort,
    path: '/ws'
  });

  wss.on('connection', async (ws, req) => {
    const query = url.parse(req.url, true).query || {};
    const token = query['x-token'];

    if (!token) {
      sendWrapped(ws, 'msg', { code: -1, msg: '认证失效', data: null });
      ws.close();
      return;
    }

    let claims;
    try {
      claims = parseToken(token);
    } catch {
      sendWrapped(ws, 'msg', { code: -1, msg: '认证失效', data: null });
      ws.close();
      return;
    }

    const userId = String(claims.userId || '');
    const cacheToken = await getSessionTokenByUserId(userId);
    if (!cacheToken) {
      sendWrapped(ws, 'msg', { code: -1, msg: '认证失效', data: null });
      ws.close();
      return;
    }

    if (cacheToken !== token) {
      sendWrapped(ws, 'msg', { code: -3, msg: '您的账号已在其它地方登录，请重新登录', data: null });
      ws.close();
      return;
    }

    const old = wsByUserId.get(userId);
    if (old && old !== ws) {
      sendWrapped(old, 'msg', { code: -3, msg: '您的账号已在其它地方登录，请重新登录', data: null });
      old.close();
    }

    wsByUserId.set(userId, ws);
    userIdByWs.set(ws, userId);
    await broadcastUserStatus('web-online', userId);

    ws.on('message', () => {
      // 前端会定时发送 heart，这里无需处理。
    });

    ws.on('close', async () => {
      const uid = userIdByWs.get(ws);
      if (!uid) return;
      userIdByWs.delete(ws);
      wsByUserId.delete(uid);
      await broadcastUserStatus('web-offline', uid);
    });

    ws.on('error', () => {
      ws.close();
    });
  });

  return wss;
}

module.exports = {
  bindWebSocketServer,
  sendWrapped,
  sendToUser,
  broadcast
};
