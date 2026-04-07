const express = require('express');
const cors = require('cors');
const config = require('./config');
const { initDb } = require('./db');
const { authMiddleware } = require('./auth');
const apiRouter = require('./routes/api');
const { bindWebSocketServer } = require('./ws');
const { clearExpiredSessions } = require('./session-store');

async function bootstrap() {
  await initDb();
  await clearExpiredSessions();

  const app = express();
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.use(authMiddleware);
  app.use(apiRouter);

  app.use((err, _, res, __) => {
    console.error(err);
    res.status(200).json({ code: -2, msg: err.message || '服务器异常', data: null });
  });

  app.listen(config.httpPort, () => {
    console.log(`[HTTP] listening on ${config.httpPort}`);
  });

  bindWebSocketServer();
  console.log(`[WS] listening on ${config.wsPort}`);

  // Keep session table compact.
  setInterval(() => {
    clearExpiredSessions().catch((err) => {
      console.error('Failed to clear expired sessions:', err.message);
    });
  }, 10 * 60 * 1000);
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
