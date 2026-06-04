import OpenAI from 'openai'

// Single place to build the DeepSeek client. Both /api/generate and
// /api/train/next go through this so retry + timeout tuning lives in
// one file.
export function buildDeepSeekClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    const err = new Error('DEEPSEEK_API_KEY is not set') as Error & {
      code?: string
    }
    err.code = 'NO_API_KEY'
    throw err
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    // Retry transient upstream blips (5xx, 429, connection errors) with
    // exponential backoff before propagating to the user.
    maxRetries: Number(process.env.DEEPSEEK_MAX_RETRIES) || 2,
    // Kill any single attempt that exceeds this so a stuck upstream doesn't
    // hold an Express handler open indefinitely.
    timeout: Number(process.env.DEEPSEEK_TIMEOUT_MS) || 30_000,
  })
}

export function getDeepSeekModel(): string {
  return process.env.DEEPSEEK_MODEL || 'deepseek-chat'
}
