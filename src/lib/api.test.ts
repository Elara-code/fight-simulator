import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, generateReply } from './api'

type FetchArgs = Parameters<typeof fetch>

function mockFetchOnce(
  impl: (input: FetchArgs[0], init?: FetchArgs[1]) => Promise<Response> | Response,
) {
  const spy = vi.fn(impl) as unknown as typeof fetch
  ;(globalThis as { fetch: typeof fetch }).fetch = spy
  return spy as unknown as ReturnType<typeof vi.fn>
}

describe('generateReply', () => {
  const body = { text: 'hi', relation: 'couple', style: 'savage' } as const

  beforeEach(() => {
    vi.useRealTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves with the parsed JSON payload on success', async () => {
    const payload = { me: 'zap', dialog: [] }
    mockFetchOnce(
      () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    await expect(generateReply(body)).resolves.toEqual(payload)
  })

  it('maps rate_limited 429 to ApiError with Chinese message', async () => {
    mockFetchOnce(
      () =>
        new Response(JSON.stringify({ error: 'rate_limited' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    await expect(generateReply(body)).rejects.toMatchObject({
      status: 429,
      code: 'rate_limited',
    })
  })

  it('uses server message when present', async () => {
    mockFetchOnce(
      () =>
        new Response(
          JSON.stringify({ error: 'hard_block', message: '自定义原因' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
    )
    const err = await generateReply(body).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).message).toBe('自定义原因')
    expect((err as ApiError).code).toBe('hard_block')
  })

  it('falls back to http_status code when payload has no error field', async () => {
    mockFetchOnce(() => new Response('oops', { status: 500 }))
    const err = await generateReply(body).catch((e) => e)
    expect((err as ApiError).code).toBe('http_500')
    expect((err as ApiError).status).toBe(500)
  })

  it('classifies AbortError as timeout', async () => {
    mockFetchOnce(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(() => {
            reject(new DOMException('aborted', 'AbortError'))
          }, 0)
        }),
    )
    const err = await generateReply(body, { timeoutMs: 5 }).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).code).toBe('timeout')
    expect((err as ApiError).status).toBe(0)
  })

  it('classifies generic fetch failure as network', async () => {
    mockFetchOnce(() => Promise.reject(new TypeError('Failed to fetch')))
    const err = await generateReply(body).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).code).toBe('network')
  })

  it('respects caller-provided abort signal', async () => {
    const controller = new AbortController()
    mockFetchOnce(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'))
          })
        }),
    )
    const pending = generateReply(body, { signal: controller.signal })
    controller.abort()
    const err = await pending.catch((e) => e)
    expect((err as ApiError).code).toBe('timeout')
  })
})
