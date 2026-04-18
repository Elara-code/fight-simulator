# fight-simulator · 吵架模拟器

Argue Simulator is an AI app that helps you craft smarter, sharper comebacks.
Replay conversations, simulate arguments, and generate shareable chat
screenshots — all for fun, expression, and the perfect response.

> 把没吵赢的架，重新吵赢一遍。

## Stack

- Vite + React 18 + TypeScript
- TailwindCSS (dark-first, mobile-first)
- React Router

## Design tokens

| Token          | Value     |
| -------------- | --------- |
| Primary (主色) | `#FF4D6D` |
| Accent (强调)  | `#FFB703` |
| AI Blue (AI蓝) | `#00E5FF` |
| Background     | `#0B0F14` |
| Card           | `#141922` |
| Text           | `#FFFFFF` |

Fonts: 标题 Noto Sans SC Heavy · 正文 Noto Sans SC Medium · 数字 Inter SemiBold.

## Pages

- `/` — 首页 / 输入页 (Home / Input)
- `/result` — 结果页（多风格）(Results with style tabs)
- `/share` — 截图页（可分享）(Share screenshot)

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173.
