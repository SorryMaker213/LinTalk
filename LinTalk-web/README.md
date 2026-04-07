# LinTalk Web

LinTalk 前端项目，基于 Vue 3 + Vite 构建。

## 环境要求

- Node.js >= 20
- npm >= 10

## 开发运行

```bash
npm install

# 配置后端地址（按需修改）
# Windows:
#   notepad .env
# macOS/Linux:
#   vi .env

npm run dev
```

默认访问地址：

- http://localhost:5173

推荐 `.env`：

```env
VITE_HTTP_URL=http://127.0.0.1:9200
VITE_WS_URL=ws://127.0.0.1:9100
VITE_LINYU_VERSION=1.1.3
```

说明：前端会优先使用 `.env` 中的 `VITE_HTTP_URL` 和 `VITE_WS_URL`，未配置时才回退到同源地址。

## 生产构建

```bash
npm run build
npm run preview
```

## npm scripts

- `npm run dev`：启动 Vite 开发服务器
- `npm run build`：构建生产产物（dist）
- `npm run preview`：本地预览生产构建
- `npm run lint`：执行并修复 ESLint 问题
- `npm run format`：使用 Prettier 格式化 src 目录

## 说明

- 主题切换支持 light/dark/yellow/red/purple/green
- 本地联调前请先启动后端服务（默认 9200/9100）
