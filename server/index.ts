import 'dotenv/config'
import * as Sentry from '@sentry/node'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  })
}

import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import OpenAI from 'openai'
import { ZodError } from 'zod'
import { GenerateRequest, generateReply } from './generate.js'
import { log } from './logger.js'
import {
  ReplayInput,
  adminRemoveReplay,
  createReplay,
  getReplay,
  listPublicFeed,
  reportReplay,
} from './replays.js'
import { screenUserInput } from './safety.js'
import { TrainRequest, trainTurn } from './train.js'

const app = express()

app.set('trust proxy', 1)

const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_ORIGINS

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (allowedOrigins.includes(origin)) return cb(null, true)
      cb(new Error(`CORS blocked: ${origin}`))
    },
  }),
)

app.use(express.json({ limit: '8kb' }))

app.use((req, res, next) => {
  const t0 = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - t0
    const ip = req.ip || req.socket.remoteAddress || '-'
    log.info('request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms,
      ip,
    })
  })
  next()
})

const dailyCap = Number(process.env.DAILY_LIMIT) || 1000
let dailyCount = 0
let dailyWindowStart = startOfUtcDay()

function startOfUtcDay(): number {
  const d = new Date()
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function rolloverDailyCounterIfNeeded() {
  const today = startOfUtcDay()
  if (today !== dailyWindowStart) {
    dailyWindowStart = today
    dailyCount = 0
  }
}

function dailyCapGuard(_req: Request, res: Response, next: NextFunction) {
  rolloverDailyCounterIfNeeded()
  if (dailyCount >= dailyCap) {
    return res.status(429).json({
      error: 'daily_cap_reached',
      message: '今日生成次数已用尽，明天再来吵',
    })
  }
  next()
}

const perIpLimiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.PER_IP_PER_MINUTE) || 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'rate_limited',
      message: '手速太快了，歇一会儿再来',
    })
  },
})

const replayWriteLimiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.REPLAY_WRITES_PER_MINUTE) || 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'rate_limited' })
  },
})

app.get('/api/health', (_req, res) => {
  rolloverDailyCounterIfNeeded()
  res.json({
    ok: true,
    hasKey: !!process.env.DEEPSEEK_API_KEY,
    daily: { used: dailyCount, cap: dailyCap },
  })
})

app.post('/api/generate', perIpLimiter, dailyCapGuard, async (req, res) => {
  const parsed = GenerateRequest.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'bad_request', issues: parsed.error.issues })
  }

  const safety = screenUserInput(parsed.data.text)
  if (!safety.ok) {
    log.warn('safety_blocked', { code: safety.code })
    return res.status(400).json({ error: safety.code, message: safety.reason })
  }

  try {
    const reply = await generateReply(parsed.data)
    dailyCount += 1
    res.json(reply)
  } catch (err) {
    if (err instanceof ZodError) {
      log.error('schema_mismatch', { issues: err.issues })
      return res.status(502).json({ error: 'bad_model_output' })
    }
    const code = err instanceof Error ? (err as Error & { code?: string }).code : undefined
    if (code === 'NO_API_KEY') {
      return res.status(503).json({ error: 'no_api_key' })
    }
    if (code === 'BAD_OUTPUT') {
      return res.status(502).json({
        error: 'bad_model_output',
        message: '生成内容没通过内容审核，请再试一次',
      })
    }
    if (err instanceof OpenAI.APIError) {
      log.error('openai_error', { status: err.status, message: err.message })
      Sentry.captureException(err)
      return res
        .status(err.status ?? 502)
        .json({ error: 'upstream_error', message: err.message })
    }
    log.error('internal_error', { err: err instanceof Error ? err.message : String(err) })
    Sentry.captureException(err)
    res.status(500).json({ error: 'internal' })
  }
})

app.post('/api/train/next', perIpLimiter, dailyCapGuard, async (req, res) => {
  const parsed = TrainRequest.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'bad_request', issues: parsed.error.issues })
  }
  // Safety-screen the opening + latest user message (don't re-scan whole history every turn).
  const latestMe = [...parsed.data.history].reverse().find((m) => m.role === 'me')
  const toScreen = `${parsed.data.opening}\n${latestMe?.text ?? ''}`.trim()
  if (toScreen) {
    const safety = screenUserInput(toScreen)
    if (!safety.ok) {
      log.warn('train_safety_blocked', { code: safety.code })
      return res.status(400).json({ error: safety.code, message: safety.reason })
    }
  }
  try {
    const result = await trainTurn(parsed.data)
    dailyCount += 1
    res.json(result)
  } catch (err) {
    if (err instanceof ZodError) {
      log.error('train_schema_mismatch', { issues: err.issues })
      return res.status(502).json({ error: 'bad_model_output' })
    }
    if (
      err instanceof Error &&
      (err as Error & { code?: string }).code === 'NO_API_KEY'
    ) {
      return res.status(503).json({ error: 'no_api_key' })
    }
    if (err instanceof OpenAI.APIError) {
      log.error('train_openai_error', { status: err.status, message: err.message })
      Sentry.captureException(err)
      return res
        .status(err.status ?? 502)
        .json({ error: 'upstream_error', message: err.message })
    }
    log.error('train_internal_error', { err: err instanceof Error ? err.message : String(err) })
    Sentry.captureException(err)
    res.status(500).json({ error: 'internal' })
  }
})

app.post('/api/replays', replayWriteLimiter, (req, res) => {
  const parsed = ReplayInput.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'bad_request', issues: parsed.error.issues })
  }
  const safety = screenUserInput(
    `${parsed.data.them}\n${parsed.data.me}\n${parsed.data.dialog
      .map((d) => `${d.them}\n${d.me}`)
      .join('\n')}`,
  )
  if (!safety.ok) {
    log.warn('replay_blocked', { code: safety.code })
    return res.status(400).json({ error: safety.code, message: safety.reason })
  }
  const replay = createReplay(parsed.data)
  res.status(201).json({ id: replay.id, url: `/r/${replay.id}` })
})

app.get('/api/replays/top', (_req, res) => {
  const feed = listPublicFeed(30)
  res.json({ items: feed })
})

app.get('/api/replays/:id', (req, res) => {
  const id = req.params.id
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(id)) {
    return res.status(400).json({ error: 'bad_request' })
  }
  const replay = getReplay(id)
  if (!replay) {
    return res.status(404).json({ error: 'not_found' })
  }
  res.json({
    id: replay.id,
    them: replay.them,
    me: replay.me,
    dialog: replay.dialog,
    style: replay.style,
    createdAt: replay.createdAt,
  })
})

const reportLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'rate_limited' })
  },
})

app.post('/api/replays/:id/report', reportLimiter, (req, res) => {
  const id = req.params.id
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(id)) {
    return res.status(400).json({ error: 'bad_request' })
  }
  const result = reportReplay(id)
  if (!result.ok) {
    return res.status(404).json({ error: result.code })
  }
  log.info('replay_reported', {
    id,
    reportCount: result.reportCount,
    removed: result.removed,
  })
  res.json({ removed: result.removed, reportCount: result.reportCount })
})

app.delete('/api/replays/:id', (req, res) => {
  const token = process.env.ADMIN_TOKEN
  if (!token) {
    return res.status(503).json({ error: 'admin_disabled' })
  }
  const header = req.header('authorization') || ''
  const expected = `Bearer ${token}`
  if (header !== expected) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  const id = req.params.id
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(id)) {
    return res.status(400).json({ error: 'bad_request' })
  }
  const removed = adminRemoveReplay(id)
  if (!removed) {
    return res.status(404).json({ error: 'not_found' })
  }
  log.info('replay_admin_removed', { id })
  res.json({ ok: true })
})

const port = Number(process.env.PORT) || 8787
app.listen(port, () => {
  log.info('api_listening', {
    port,
    hasKey: !!process.env.DEEPSEEK_API_KEY,
    dailyCap,
    cors: allowedOrigins,
    sentry: !!process.env.SENTRY_DSN,
  })
})
