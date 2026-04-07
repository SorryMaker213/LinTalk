# LinTalk Node Server

LinTalk 后端服务（Express + WebSocket），提供登录、消息、通知、文件/视频信令等接口。

## 环境要求

- Node.js >= 20
- npm >= 10

## 本地启动（默认 SQLite）

1. 安装依赖

```bash
npm install
```

2. 启动开发服务

```bash
npm run dev
```

3. 验证服务

```bash
curl http://127.0.0.1:9200/health
```

默认端口：

- HTTP: 9200
- WebSocket: 9100

说明：当前仓库未提供 `.env.example`，不创建 `.env` 也可按默认值启动。

## 可选环境变量

```env
# 端口
HTTP_PORT=9200
WS_PORT=9100

# 数据库：sqlite 或 mysql（默认 sqlite）
DB_CLIENT=sqlite
DB_FILE=./data/LinTalk.db

# MySQL（当 DB_CLIENT=mysql 时生效）
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=LinTalk
MYSQL_USER=root
MYSQL_PASSWORD=123456

# 登录与聊天室
LINTALK_PASSWORD=linqia
LINTALK_LIMIT=100
LINTALK_NAME=LinTalk在线聊天室

# 豆包机器人
LINTALK_DOUBAO_API_KEY=
LINTALK_DOUBAO_COUNT_LIMIT=5
LINTALK_DOUBAO_LENGTH_LIMIT=50
LINTALK_DOUBAO_MODEL=doubao-seed-2-0-mini-260215
```

## npm scripts

- `npm run dev`：开发模式启动（src/index.js）
- `npm run start`：生产启动（src/index.js）
- `npm run backfill:ip`：回填历史消息 IP 归属
- `npm run normalize:ip-ownership`：标准化消息 IP 归属

## 与前端联调

前端 `.env` 建议配置：

```env
VITE_HTTP_URL=http://127.0.0.1:9200
VITE_WS_URL=ws://127.0.0.1:9100
```
