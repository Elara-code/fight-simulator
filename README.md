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
