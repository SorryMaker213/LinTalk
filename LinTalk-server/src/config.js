const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const rootDir = path.resolve(__dirname, '..');

module.exports = {
  rootDir,
  env: process.env.NODE_ENV || 'development',
  httpPort: Number(process.env.HTTP_PORT || 9200),
  wsPort: Number(process.env.WS_PORT || 9100),
  jwtSecret: process.env.JWT_SECRET || 'LinTalk-node-jwt-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbClient: (process.env.DB_CLIENT || 'sqlite').toLowerCase(),
  dbFile: path.resolve(rootDir, process.env.DB_FILE || './data/LinTalk.db'),
  mysqlHost: process.env.MYSQL_HOST || '127.0.0.1',
  mysqlPort: Number(process.env.MYSQL_PORT || 3306),
  mysqlDatabase: process.env.MYSQL_DATABASE || 'LinTalk',
  mysqlUser: process.env.MYSQL_USER || 'root',
  mysqlPassword: process.env.MYSQL_PASSWORD || '123456',
  lintalkPassword: process.env.LINTALK_PASSWORD || 'linqia',
  lintalkLimit: Number(process.env.LINTALK_LIMIT || 100),
  lintalkName: process.env.LINTALK_NAME || 'LinTalk在线聊天室',
  lintalkExpires: Number(process.env.LINTALK_EXPIRES || 7),
  doubaoApiKey: process.env.LINTALK_DOUBAO_API_KEY || 'e9d21c1c-75e8-4fcd-9207-f8f2c4ecddb2',
  doubaoCountLimit: Number(process.env.LINTALK_DOUBAO_COUNT_LIMIT || 5),
  doubaoLengthLimit: Number(process.env.LINTALK_DOUBAO_LENGTH_LIMIT || 50),
  doubaoModel: process.env.LINTALK_DOUBAO_MODEL || 'doubao-seed-2-0-mini-260215',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  botUserId: process.env.BOT_USER_ID || 'doubao',
  botUserName: process.env.BOT_USER_NAME || '豆包'
};
