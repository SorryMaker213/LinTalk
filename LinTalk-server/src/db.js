const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

let db;
let dbType = 'sqlite';

function nowIso() {
  const d = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

async function initDb() {
  dbType = config.dbClient === 'mysql' ? 'mysql' : 'sqlite';

  if (dbType === 'mysql') {
    const pool = mysql.createPool({
      host: config.mysqlHost,
      port: config.mysqlPort,
      user: config.mysqlUser,
      password: config.mysqlPassword,
      database: config.mysqlDatabase,
      waitForConnections: true,
      connectionLimit: 10
    });

    db = {
      type: 'mysql',
      async run(sql, params = []) {
        const [result] = await pool.execute(sql, params);
        return {
          changes: result.affectedRows || 0,
          lastID: result.insertId || 0
        };
      },
      async get(sql, params = []) {
        const [rows] = await pool.execute(sql, params);
        return rows && rows.length ? rows[0] : null;
      },
      async all(sql, params = []) {
        const [rows] = await pool.execute(sql, params);
        return rows || [];
      }
    };

    await initMysqlSchema(db);
  } else {
    const dir = path.dirname(config.dbFile);
    fs.mkdirSync(dir, { recursive: true });

    const sqliteDb = await open({
      filename: config.dbFile,
      driver: sqlite3.Database
    });

    db = {
      type: 'sqlite',
      run: (sql, params = []) => sqliteDb.run(sql, params),
      get: (sql, params = []) => sqliteDb.get(sql, params),
      all: (sql, params = []) => sqliteDb.all(sql, params)
    };

    await initSqliteSchema(sqliteDb);
  }

  await ensureBotUsers();

  await db.run(
    'UPDATE notify SET notify_content = ? WHERE notify_content = ?',
    ['欢迎来到 LinTalk', '欢迎来到 LinTalk Node Server']
  );

  const latestNotify = await db.get('SELECT id FROM notify ORDER BY create_time DESC LIMIT 1');
  if (!latestNotify) {
    const id = uuidv4();
    const time = nowIso();
    await db.run(
      'INSERT INTO notify (id, notify_title, notify_content, type, create_time, update_time) VALUES (?, ?, ?, ?, ?, ?)',
      [id, '欢迎使用', '欢迎来到 LinTalk', 'system', time, time]
    );
  }

  return db;
}

async function initSqliteSchema(sqliteDb) {
  await sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'user',
      avatar TEXT,
      email TEXT,
      badge TEXT,
      login_time TEXT,
      create_time TEXT NOT NULL,
      update_time TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "group" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      create_time TEXT NOT NULL,
      update_time TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_list (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_info TEXT NOT NULL,
      unread_count INTEGER DEFAULT 0,
      last_message TEXT,
      type TEXT,
      create_time TEXT NOT NULL,
      update_time TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS message (
      id TEXT PRIMARY KEY,
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      from_info TEXT NOT NULL,
      message TEXT,
      reference_msg TEXT,
      at_user TEXT,
      is_show_time INTEGER DEFAULT 0,
      type TEXT,
      source TEXT,
      create_time TEXT NOT NULL,
      update_time TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_message_from_to ON message(from_id, to_id);

    CREATE TABLE IF NOT EXISTS notify (
      id TEXT PRIMARY KEY,
      notify_title TEXT,
      notify_content TEXT,
      type TEXT,
      create_time TEXT NOT NULL,
      update_time TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_session (
      user_id TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      expires_at TEXT,
      create_time TEXT NOT NULL,
      update_time TEXT NOT NULL
    );
  `);
}

async function initMysqlSchema(database) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS user (
      id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(255) DEFAULT NULL,
      avatar TEXT DEFAULT NULL,
      email VARCHAR(255) DEFAULT NULL,
      badge TEXT DEFAULT NULL,
      login_time timestamp(3) NULL DEFAULT NULL,
      create_time timestamp(3) NOT NULL,
      update_time timestamp(3) NOT NULL,
      PRIMARY KEY (id)
    )`,
    `CREATE TABLE IF NOT EXISTS \`group\` (
      id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      avatar TEXT DEFAULT NULL,
      create_time timestamp(3) NOT NULL,
      update_time timestamp(3) NOT NULL,
      PRIMARY KEY (id)
    )`,
    `CREATE TABLE IF NOT EXISTS chat_list (
      id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      target_id VARCHAR(255) NOT NULL,
      target_info TEXT NOT NULL,
      unread_count INT DEFAULT 0,
      last_message TEXT DEFAULT NULL,
      type VARCHAR(255) DEFAULT NULL,
      create_time timestamp(3) NOT NULL,
      update_time timestamp(3) NOT NULL,
      PRIMARY KEY (id)
    )`,
    `CREATE TABLE IF NOT EXISTS message (
      id VARCHAR(255) NOT NULL,
      from_id VARCHAR(255) NOT NULL,
      to_id VARCHAR(255) NOT NULL,
      from_info TEXT NOT NULL,
      message TEXT DEFAULT NULL,
      reference_msg TEXT DEFAULT NULL,
      at_user TEXT DEFAULT NULL,
      is_show_time TINYINT(1) DEFAULT 0,
      type VARCHAR(255) DEFAULT NULL,
      source VARCHAR(255) DEFAULT NULL,
      create_time timestamp(3) NOT NULL,
      update_time timestamp(3) NOT NULL,
      PRIMARY KEY (id),
      INDEX idx_message_from_to (from_id, to_id)
    )`,
    `CREATE TABLE IF NOT EXISTS notify (
      id VARCHAR(255) NOT NULL,
      notify_title VARCHAR(255) DEFAULT NULL,
      notify_content TEXT DEFAULT NULL,
      type VARCHAR(255) DEFAULT NULL,
      create_time timestamp(3) NOT NULL,
      update_time timestamp(3) NOT NULL,
      PRIMARY KEY (id)
    )`,
    `CREATE TABLE IF NOT EXISTS user_session (
      user_id VARCHAR(255) NOT NULL,
      token TEXT NOT NULL,
      expires_at timestamp(3) NULL DEFAULT NULL,
      create_time timestamp(3) NOT NULL,
      update_time timestamp(3) NOT NULL,
      PRIMARY KEY (user_id)
    )`
  ];

  for (const sql of statements) {
    await database.run(sql);
  }
}

async function ensureBotUsers() {
  const bots = [
    { id: config.botUserId || 'doubao', name: config.botUserName || '璞嗗寘' }
  ];
  const time = nowIso();

  for (const bot of bots) {
    const existed = await db.get('SELECT id FROM user WHERE id = ?', [bot.id]);
    if (!existed) {
      await db.run(
        'INSERT INTO user (id, name, type, avatar, email, create_time, update_time, login_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [bot.id, bot.name, 'bot', '', `${bot.id}@robot.com`, time, time, time]
      );
    }
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database is not initialized');
  }
  return db;
}

module.exports = {
  initDb,
  getDb,
  getDbType: () => dbType,
  nowIso,
  uuidv4
};

