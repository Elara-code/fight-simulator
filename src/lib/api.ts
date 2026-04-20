export type StyleKey = 'savage' | 'logic' | 'sarcasm' | 'calm'
export type Relation = 'couple' | 'friend' | 'work' | 'family'

export type Reply = {
  me: string
  dialog: { them: string; me: string }[]
}

export type GenerateRequest = {
  text: string
  relation: Relation
  style: StyleKey
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const DEFAULT_TIMEOUT_MS = 20_000

export async function generateReply(
  body: GenerateRequest,
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<Reply> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort()
    else opts.signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      const code = typeof payload.error === 'string' ? payload.error : `http_${res.status}`
      const message = typeof payload.message === 'string' ? payload.message : undefined
      throw new ApiError(res.status, code, message ?? mapCodeToMessage(code, res.status))
    }
    return (await res.json()) as Reply
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(0, 'timeout', '网络超时，请重试')
    }
    throw new ApiError(0, 'network', '网络异常，请检查连接')
  } finally {
    clearTimeout(timer)
  }
}

function mapCodeToMessage(code: string, status: number): string {
  switch (code) {
    case 'rate_limited':
      return '手速太快了，歇一会儿再来'
    case 'daily_cap_reached':
      return '今日生成次数已用尽，明天再来吵'
    case 'no_api_key':
      return '服务暂未配置，请稍后再试'
    case 'bad_model_output':
      return '模型返回格式异常，请再来一句'
    case 'upstream_error':
      return '模型服务暂不可用'
    case 'bad_request':
      return '输入不合法，请检查后重试'
    case 'spam':
      return '输入看起来是无意义重复，请好好说话'
    case 'hard_block':
      return '这条内容我们没法帮你生成，换一句试试'
    default:
      return status >= 500 ? '服务临时抽风，请重试' : '请求失败，请重试'
  }
}
