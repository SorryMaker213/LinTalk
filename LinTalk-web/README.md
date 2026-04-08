# LinTalk Web

LinTalk 前端应用，基于 Vue 3 + Vite，提供登录、群聊私聊消息界面、在线用户列表、通知弹窗、文件传输与音视频呼叫交互。

## 核心能力

- 登录流程
	- 登录前口令校验。
	- 使用 RSA 公钥加密口令后提交。
- 聊天体验
	- 群聊与私聊切换。
	- 消息列表分页加载与新消息提示。
	- 文本、表情、撤回、引用、@ 用户展示。
- 实时交互
	- WebSocket 实时接收消息、通知、文件与音视频信令。
	- 在线状态展示与私聊快捷入口。
- 用户与主题
	- 用户资料修改。
	- 主题切换（light/dark/yellow/red/purple/green）。
	- Pinia 持久化用户与主题状态。

## 运行要求

- Node.js >= 20
- npm >= 10

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

建议在当前目录创建或修改 .env：

```env
VITE_HTTP_URL=http://127.0.0.1:9200
VITE_WS_URL=ws://127.0.0.1:9100
VITE_LINYU_VERSION=1.1.3
```

说明：

- 若未配置 VITE_HTTP_URL 和 VITE_WS_URL，前端会回退到同源地址。
- 本地联调前请先启动后端服务（默认 9200/9100）。

### 3. 启动开发服务

```bash
npm run dev
```

默认访问地址：

- http://localhost:5173

## 构建与预览

```bash
npm run build
npm run preview
```

构建产物目录：

- dist

## 与后端通信说明

- HTTP 请求
	- 前缀：/api/v1/*
	- 通过 x-token 请求头携带令牌。
- WebSocket
	- 路径：/ws?x-token=TOKEN
	- 事件类型：msg、notify、video、file

## 项目结构

```text
LinTalk-web/
├─ src/
│  ├─ views/             # LoginPage / ChatPage
│  ├─ router/            # 路由与登录守卫
│  ├─ api/               # 接口封装
│  ├─ stores/            # Pinia 状态
│  ├─ components/        # 聊天与基础组件
│  ├─ utils/             # axios/ws/工具函数
│  ├─ constant/          # 常量定义
│  └─ assets/            # 样式与主题资源
├─ public/
├─ deploy/               # Nginx 配置与运行时替换脚本
├─ vite.config.js
└─ package.json
```

## npm scripts

- npm run dev: 启动 Vite 开发服务
- npm run build: 构建生产产物
- npm run preview: 本地预览生产构建
- npm run lint: 运行并修复 ESLint 问题
- npm run format: 使用 Prettier 格式化 src

## 部署提示

- 推荐通过仓库根目录 docker-compose.yml 统一部署。
- 在容器部署场景下，deploy/set-server-url.sh 会在启动时替换前端产物中的 API/WS 地址。
- 若走同源反代，建议由 Nginx 统一代理 /api 与 /ws，减少跨域配置复杂度。
