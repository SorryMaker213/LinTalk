# LinTalk

LinTalk 是一个基于 Vue 3 + Node.js 的在线聊天室项目，包含前端应用、后端 API 服务、WebSocket 实时通信、可选 AI 机器人回复，以及 Docker Compose 一体化部署能力。

项目由两部分组成：

- `LinTalk-web`：聊天前端（Vite + Vue 3）
- `LinTalk-server`：后端服务（Express + ws）

默认支持群聊、私聊、消息记录、撤回、系统通知、主题切换，以及文件/音视频通话信令转发。

## 项目简介

LinTalk 提供了一个轻量但完整的即时通信示例：

- 通过 HTTP API 完成登录、用户管理、聊天列表与消息查询。
- 通过 WebSocket 推送消息、通知与在线状态。
- 支持 SQLite（本地开发）和 MySQL（生产部署）两种数据后端。
- 可通过豆包大模型实现被 @ 后自动回复。

## 核心功能

- 登录与鉴权
  - 登录前密码校验（支持 RSA 公钥加密传输）。
  - JWT 鉴权 + 服务端会话表（`user_session`）双重校验。
  - 同账号单点在线控制（异地登录可踢下线）。
- 聊天能力
  - 群聊与私聊。
  - 消息历史分页加载。
  - 消息撤回（当前逻辑限制 2 分钟内可撤回）。
  - @ 用户与引用消息。
  - 表情消息。
- 实时能力
  - WebSocket 在线状态同步（上线/下线通知）。
  - 系统通知实时广播。
  - 文件传输信令（offer/answer/candidate/invite/accept/cancel）。
  - 音视频信令（offer/answer/candidate/invite/accept/hangup）。
- 用户与界面
  - 在线用户列表与私聊入口。
  - 用户信息编辑（昵称、邮箱、头像）。
  - 多主题切换（light/dark/yellow/red/purple/green）。
  - Pinia 持久化用户与主题状态。
- 机器人能力
  - 群聊中 @ 机器人触发豆包回复。
  - 支持调用次数限制、内容长度限制与模型配置。
- 消息来源标记
  - 消息发送方 IP 归属语义化（如“内网/机器人/地区”）。
  - 提供历史数据修复脚本。

## 技术栈

- 前端
  - Vue 3
  - Vue Router
  - Pinia + pinia-plugin-persistedstate
  - Vite
  - Axios
- 后端
  - Node.js 20
  - Express
  - ws（WebSocket）
  - jsonwebtoken
  - dotenv
- 数据层
  - SQLite（默认本地开发）
  - MySQL 8（生产推荐）
- 部署
  - Docker Compose
  - Nginx（前端静态资源 + `/api` 与 `/ws` 反向代理）

## 快速开始

### 方式一：本地开发（推荐）

环境要求：

- Node.js >= 20
- npm >= 10

1. 启动后端（默认 SQLite）

```bash
cd LinTalk-server
npm install
npm run dev
```

默认端口：

- HTTP: `9200`
- WS: `9100`

2. 启动前端

```bash
cd LinTalk-web
npm install
```

在 `LinTalk-web/.env` 中配置（若无则新建）：

```env
VITE_HTTP_URL=http://127.0.0.1:9200
VITE_WS_URL=ws://127.0.0.1:9100
VITE_LINYU_VERSION=1.1.3
```

然后启动：

```bash
npm run dev
```

访问：`http://localhost:5173`

### 方式二：Docker Compose 一体化部署

在项目根目录执行：

```bash
docker compose up -d --build
```

说明：

- 统一使用根目录 `docker-compose.yml` 作为部署入口。
- 默认暴露 `18080`（Nginx），对外统一入口为前端页面与反向代理。
- 服务健康检查通过后，访问 `http://<你的主机IP>:18080`。

常用检查命令：

```bash
docker compose config
docker compose ps
docker compose logs -f nginx lintalk-server lintalk-web mysql
```

## 环境变量说明（关键项）

根目录 `.env` 用于 compose 编排和服务配置，常用项如下：

- 服务与跨域
  - `HTTP_PORT`、`WS_PORT`
  - `VITE_HTTP_URL`、`VITE_WS_URL`
  - `CORS_ORIGIN`
- 鉴权
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
- 业务
  - `LINTALK_PASSWORD`（登录口令）
  - `LINTALK_LIMIT`（在线人数上限）
  - `LINTALK_NAME`（聊天室名称）
- 数据库
  - `DB_CLIENT`（`sqlite` 或 `mysql`）
  - `DB_FILE`（SQLite 文件路径）
  - `MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_DATABASE`、`MYSQL_USER`、`MYSQL_PASSWORD`
- 机器人
  - `LINTALK_DOUBAO_API_KEY`
  - `LINTALK_DOUBAO_COUNT_LIMIT`
  - `LINTALK_DOUBAO_LENGTH_LIMIT`
  - `LINTALK_DOUBAO_MODEL`

## 项目结构

```text
LinTalk/
├─ docker-compose.yml          # 一体化部署入口（MySQL + Server + Web + Nginx）
├─ DEPLOY.md                   # 部署说明入口
├─ .env                        # 根环境变量（compose 使用）
├─ LinTalk-server/             # Node 后端
│  ├─ src/
│  │  ├─ index.js              # 服务启动入口
│  │  ├─ routes/api.js         # 业务 API 路由
│  │  ├─ ws.js                 # WebSocket 服务与推送
│  │  ├─ db.js                 # SQLite/MySQL 初始化与建表
│  │  ├─ services.js           # 核心业务逻辑
│  │  ├─ ai-doubao.js          # 机器人调用
│  │  └─ ...
│  ├─ scripts/
│  │  ├─ backfill-ip-ownership.js
│  │  └─ normalize-ip-ownership.js
│  └─ https/nginx.conf         # compose 中 nginx 使用的配置
└─ LinTalk-web/                # Vue 前端
   ├─ src/
   │  ├─ views/                # ChatPage / LoginPage
   │  ├─ api/                  # 前端接口封装
   │  ├─ stores/               # Pinia 状态
   │  ├─ components/           # UI 与消息组件
   │  └─ ...
   └─ deploy/                  # 前端容器部署脚本与 nginx 配置
```

## 部署说明

### 反向代理路径

在当前根部署方案中：

- `/` -> 前端静态资源
- `/api/` -> 后端 HTTP（`lintalk-server:9200`）
- `/ws` -> 后端 WebSocket（`lintalk-server:9100`）

### 推荐上线流程

1. 按实际域名/IP 修改根目录 `.env` 中 `VITE_HTTP_URL`、`VITE_WS_URL`、`CORS_ORIGIN`。
2. 修改默认密钥与密码（尤其 `JWT_SECRET`、数据库密码、`LINTALK_PASSWORD`、机器人 Key）。
3. 执行 `docker compose up -d --build`。
4. 用 `docker compose ps` 和 `docker compose logs` 观察健康状态。

### HTTPS 说明

仓库中保留了证书目录 `LinTalk-server/https/ssl/`。如果需要 HTTPS/WSS，请在 Nginx 配置中启用 TLS，并提供证书文件后再部署。

## 运维脚本

后端提供两类历史数据修复脚本：

```bash
cd LinTalk-server
npm run backfill:ip
npm run normalize:ip-ownership
```

用途：

- 回填或规范化历史消息中的 `fromInfo.ipOwnership` 字段。

## 常用命令

后端：

```bash
cd LinTalk-server
npm run dev
npm run start
```

前端：

```bash
cd LinTalk-web
npm run dev
npm run build
npm run preview
npm run lint
npm run format
```

## 注意事项

- 当前仓库中未提供根级 `.env.example`，建议自行整理一份模板用于团队协作。
- 生产环境请避免使用默认密码和默认密钥。
- 对外部署时，建议统一走 Nginx（同源访问可减少跨域与 WS 配置复杂度）。
