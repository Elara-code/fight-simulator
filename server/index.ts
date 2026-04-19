import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'
import { ZodError } from 'zod'
import { GenerateRequest, generateReply } from './generate.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '32kb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasKey: !!process.env.DEEPSEEK_API_KEY })
})

app.post('/api/generate', async (req, res) => {
  const parsed = GenerateRequest.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: 'bad_request', issues: parsed.error.issues })
  }

  try {
    const reply = await generateReply(parsed.data)
    res.json(reply)
  } catch (err) {
    if (err instanceof ZodError) {
      console.error('[generate] schema mismatch from model:', err.issues)
      return res.status(502).json({ error: 'bad_model_output' })
    }
    if (
      err instanceof Error &&
      (err as Error & { code?: string }).code === 'NO_API_KEY'
    ) {
      return res.status(503).json({ error: 'no_api_key' })
    }
    if (err instanceof OpenAI.APIError) {
      console.error('[generate] openai error:', err.status, err.message)
      return res
        .status(err.status ?? 502)
        .json({ error: 'upstream_error', message: err.message })
    }
    console.error('[generate] unknown error:', err)
    res.status(500).json({ error: 'internal' })
  }
})

const port = Number(process.env.PORT) || 8787
app.listen(port, () => {
  const hasKey = !!process.env.DEEPSEEK_API_KEY
  console.log(
    `[fight-sim] api listening on :${port}  (DEEPSEEK_API_KEY=${hasKey ? 'set' : 'MISSING'})`,
  )
})
