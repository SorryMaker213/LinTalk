# LinTalk Server

LinTalk 后端服务，基于 Express + ws，负责鉴权、聊天业务、通知推送、在线状态同步、文件/音视频信令转发，以及机器人回复能力。

## 核心能力

- 登录鉴权
	- 登录前口令校验。
	- JWT 鉴权 + user_session 会话校验。
	- 同账号异地登录顶替。
- 聊天业务
	- 群聊与私聊。
	- 消息发送、历史分页、撤回。
	- 聊天列表未读数维护。
- 实时通信
	- WebSocket 消息推送。
	- 用户上线/下线通知。
	- 系统通知广播。
	- 文件与音视频信令中转。
- 数据支持
	- SQLite 和 MySQL 双模式。
	- 自动建表与初始化默认通知。
	- IP 归属解析与历史修复脚本。

## 运行要求

- Node.js >= 20
- npm >= 10

## 快速开始

### 1. 本地开发（默认 SQLite）

```bash
npm install
npm run dev
```

默认端口：

- HTTP: 9200
- WebSocket: 9100

健康检查：

```bash
curl http://127.0.0.1:9200/health
```

说明：未提供独立 .env.example 时，可直接使用默认配置启动。

### 2. 切换到 MySQL

配置环境变量后启动：

```env
DB_CLIENT=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=LinTalk
MYSQL_USER=root
MYSQL_PASSWORD=123456
```

```bash
npm run dev
```

## 关键环境变量

```env
# 端口
HTTP_PORT=9200
WS_PORT=9100

# JWT
JWT_SECRET=LinTalk-node-jwt-secret
JWT_EXPIRES_IN=7d

# 数据库
DB_CLIENT=sqlite
DB_FILE=./data/LinTalk.db

# MySQL（DB_CLIENT=mysql 生效）
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=LinTalk
MYSQL_USER=root
MYSQL_PASSWORD=123456

# 聊天室
LINTALK_PASSWORD=linqia
LINTALK_LIMIT=100
LINTALK_NAME=LinTalk在线聊天室
LINTALK_EXPIRES=7

# 机器人
LINTALK_DOUBAO_API_KEY=
LINTALK_DOUBAO_COUNT_LIMIT=5
LINTALK_DOUBAO_LENGTH_LIMIT=50
LINTALK_DOUBAO_MODEL=doubao-seed-2-0-mini-260215
BOT_USER_ID=doubao
BOT_USER_NAME=豆包

# 跨域
CORS_ORIGIN=*
```

## 接口与通信说明

- 健康检查
	- GET /health
- 登录与用户
	- /api/v1/login/public-key
	- /api/v1/login/verify
	- /api/v1/login
	- /api/v1/user/*
- 聊天与消息
	- /api/v1/chat-list/*
	- /api/v1/message/*
- 通知
	- /api/v1/notify/get
	- /api/v1/admin/notify
- 信令
	- /api/v1/video/*
	- /api/v1/file/*

WebSocket：

- 连接地址：ws://host:WS_PORT/ws?x-token=TOKEN
- 推送类型：msg、notify、video、file

## 项目结构

```text
LinTalk-server/
├─ src/
│  ├─ index.js           # 启动入口
│  ├─ routes/api.js      # API 路由
│  ├─ services.js        # 业务逻辑
│  ├─ ws.js              # WebSocket
│  ├─ db.js              # 数据库初始化
│  ├─ auth.js            # 鉴权中间件
│  ├─ session-store.js   # 会话存储
│  ├─ ip-region.js       # IP 归属解析
│  └─ ai-doubao.js       # 机器人调用
├─ scripts/
│  ├─ backfill-ip-ownership.js
│  └─ normalize-ip-ownership.js
└─ https/nginx.conf
```

## npm scripts

- npm run dev: 启动服务（开发）
- npm run start: 启动服务（生产）
- npm run backfill:ip: 回填历史消息 IP 归属
- npm run normalize:ip-ownership: 标准化历史消息 IP 归属

## 与前端联调

前端建议配置：

```env
VITE_HTTP_URL=http://127.0.0.1:9200
VITE_WS_URL=ws://127.0.0.1:9100
```

## 部署提示

- 推荐从仓库根目录使用 docker-compose.yml 统一部署。
- 生产环境请务必替换 JWT_SECRET、数据库密码、LINTALK_PASSWORD 与机器人 Key。
