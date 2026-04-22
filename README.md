# fight-simulator · 吵架模拟器

Argue Simulator is an AI app that helps you craft smarter, sharper comebacks.
Replay conversations, simulate arguments, and generate shareable chat
screenshots — all for fun, expression, and the perfect response.

> 把没吵赢的架，重新吵赢一遍。

## Stack

- Vite + React 18 + TypeScript + TailwindCSS（前端）
- Express + OpenAI SDK → DeepSeek API（后端，OpenAI 兼容协议）
- React Router

## Design tokens (V1 motion handbook)

| Token        | Value     |
| ------------ | --------- |
| Primary 红   | `#FF3B4D` |
| Accent 橙    | `#FF7A45` |
| AI Blue      | `#3B82F6` |
| Purple       | `#8B5CF6` |
| Background   | `#0F1115` |
| Card         | `#1C1F26` |

Fonts: 标题 Noto Sans SC Heavy · 正文 Noto Sans SC Medium · 数字 Inter SemiBold.

## Pages

- `/` — 首页 / 输入页（Home / Input）
- `/result` — 结果页（多风格 Tab，AI 生成）
- `/share` — 截图页（可分享）

## Environment

复制 `.env.example` 为 `.env`，填入 DeepSeek key（[platform.deepseek.com](https://platform.deepseek.com)）：

```
DEEPSEEK_API_KEY=sk-xxxxx
# 可选：
# DEEPSEEK_MODEL=deepseek-chat
# DEEPSEEK_BASE_URL=https://api.deepseek.com
# PORT=8787
```

未配置 key 时前端会自动走本地兜底文案，UI 不会崩。

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` 会同时起：

- 前端 Vite — http://localhost:5173
- 后端 Express — http://localhost:8787（Vite 代理 `/api` → 8787）

打开 http://localhost:5173 即可。

## Deployment

生产环境是 **单进程 Express**：Express 既服务 `/api/*`，又托管 `dist/` 的
SPA，并在 `/r/:id` 注入动态 OG meta。不需要额外的 nginx / CDN。

### Docker（推荐）

```bash
docker build -t fight-simulator .
docker run -d --name fightsim \
  -p 8787:8787 \
  -v fightsim-data:/data \
  -e DEEPSEEK_API_KEY=sk-xxxxx \
  -e PUBLIC_ORIGIN=https://your-domain.com \
  -e CORS_ORIGINS=https://your-domain.com \
  fight-simulator
```

- SQLite 文件写在 `/data`（volume 持久化）
- `PUBLIC_ORIGIN` 用于 `/r/:id` 的 og:url / og:image 绝对路径
- `CORS_ORIGINS` 逗号分隔，白名单生产域名

### 裸机

```bash
npm ci
npm run build
DEEPSEEK_API_KEY=sk-xxxxx PUBLIC_ORIGIN=https://your-domain.com npm run start:api
```

### 环境变量

| Name | Default | Note |
|---|---|---|
| `DEEPSEEK_API_KEY` | — | 必填（没有则前端走兜底） |
| `DEEPSEEK_MODEL` | `deepseek-chat` | |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | |
| `PORT` | `8787` | |
| `DATABASE_PATH` | `./data/fightsim.sqlite` | Docker 镜像内默认 `/data/fightsim.sqlite` |
| `PUBLIC_ORIGIN` | 自动从请求 host 推断 | 建议显式设置，保证 OG 链接一致 |
| `CORS_ORIGINS` | `localhost:5173` | 逗号分隔 |
| `DAILY_LIMIT` | `1000` | 全局每日生成次数上限 |
| `PER_IP_PER_MINUTE` | `10` | 每 IP 限流 |
| `REPLAY_WRITES_PER_MINUTE` | `20` | 每 IP 存 replay 限流 |
| `ADMIN_TOKEN` | 未设则禁用管理 API | `DELETE /api/replays/:id` 用 |
| `SENTRY_DSN` | 未设则禁用 | 后端错误上报 |
| `DEEPSEEK_MAX_RETRIES` | `2` | 5xx/429/网络错误的自动重试次数 |
| `DEEPSEEK_TIMEOUT_MS` | `30000` | 单次 DeepSeek 调用超时（毫秒） |
| `SHUTDOWN_TIMEOUT_MS` | `10000` | SIGTERM 时 drain 老请求的超时（毫秒） |
| `HOST` | `0.0.0.0` | Express 绑定地址（Fly / IPv6 场景需保持默认） |

### Fly.io 部署

`fly.toml` 已经配好，主区域 `hkg`（香港），SQLite 挂 `/data` volume。

首次上线 5 步：

```bash
# 1. 装 flyctl（一次性）
curl -L https://fly.io/install.sh | sh

# 2. 登录（浏览器自动打开）
flyctl auth login

# 3. 创建 app（不要部署，只写配置）
flyctl launch --no-deploy --copy-config --name fight-simulator

# 4. 创建持久化 volume 给 SQLite（1 GiB 够跑很久）
flyctl volumes create fightsim_data --region hkg --size 1

# 5. 把密钥灌进去（这些会加密存在 Fly 侧，不要写进 fly.toml）
flyctl secrets set \
  DEEPSEEK_API_KEY=sk-xxxxxxxxxxxx \
  PUBLIC_ORIGIN=https://fight-simulator.fly.dev \
  CORS_ORIGINS=https://fight-simulator.fly.dev

# （可选）Sentry / PostHog / 管理员令牌
flyctl secrets set SENTRY_DSN=... ADMIN_TOKEN=... VITE_POSTHOG_KEY=...

# 6. 部署
flyctl deploy
```

部署完打开 `https://fight-simulator.fly.dev` 就能看到。后续改代码重跑
`flyctl deploy` 即可。

常用运维命令：

```bash
flyctl logs                        # 实时日志
flyctl ssh console                 # SSH 进 VM
flyctl status                      # 实例状态
flyctl secrets list                # 列出已设密钥（不显示值）
flyctl scale count 1               # 固定 1 台（关掉 auto-stop）
flyctl volumes snapshots list fightsim_data  # SQLite 备份快照
```

**SQLite 备份**：Fly 会每日自动给 volume 做快照（保留 5 天），
想手动恢复：`flyctl volumes snapshots create fightsim_data` → 新建 volume
from snapshot → 重新 `flyctl deploy`。生产量大的话建议加 [litestream]
(https://litestream.io/)。

**绑自定义域名**：

```bash
flyctl certs add fight.yourdomain.com
# DNS 加一条 CNAME 指向 fight-simulator.fly.dev
```

设完记得用 `flyctl secrets set` 更新 `PUBLIC_ORIGIN` 和 `CORS_ORIGINS`
指向新域名。

## CI

`.github/workflows/ci.yml` 在 PR 和 push 到 `main` / `claude/**` 分支时跑
`typecheck + build + test`。
