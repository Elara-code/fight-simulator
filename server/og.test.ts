import { describe, expect, it } from 'vitest'
import { renderReplayHtml } from './og'
import type { Replay } from './replays'

const baseReplay: Replay = {
  id: 'abc123xyz',
  them: '你怎么又忘了我们的纪念日？',
  me: '忘了不是常态，\n但被你当成常态就是问题。',
  dialog: [{ them: '又来了', me: '又来的是你的敷衍' }],
  style: 'savage',
  createdAt: Date.now(),
  isPublic: true,
}

describe('og html renderer', () => {
  it('injects per-replay og:title and og:description', () => {
    const html = renderReplayHtml(baseReplay, 'https://example.com')
    expect(html).toMatch(/<meta property="og:title" content="[^"]*爽文反击[^"]*"/)
    expect(html).toMatch(/<meta property="og:description" content="[^"]*忘了我们的纪念日[^"]*"/)
    expect(html).toMatch(
      /<meta property="og:url" content="https:\/\/example\.com\/r\/abc123xyz"/,
    )
  })

  it('emits twitter card tags', () => {
    const html = renderReplayHtml(baseReplay, 'https://x.y')
    expect(html).toMatch(/<meta name="twitter:card" content="summary_large_image"/)
    expect(html).toMatch(/<meta name="twitter:image" content="https:\/\/x\.y\/og-cover\.png"/)
  })

  it('escapes HTML in user-supplied text', () => {
    const html = renderReplayHtml(
      { ...baseReplay, them: '<script>alert(1)</script>', me: '"&\'' },
      'https://example.com',
    )
    expect(html).not.toMatch(/<script>alert\(1\)<\/script>/)
    expect(html).toMatch(/&lt;script&gt;/)
    expect(html).toMatch(/&quot;/)
  })

  it('strips the default site-wide og tags from the shell', () => {
    const html = renderReplayHtml(baseReplay, 'https://example.com')
    // Only one og:title — the dynamic one.
    const matches = html.match(/<meta property="og:title"/g) || []
    expect(matches.length).toBe(1)
  })

  it('maps each style to its Chinese label', () => {
    const styles = ['savage', 'logic', 'sarcasm', 'calm'] as const
    const labels = ['爽文反击', '逻辑碾压', '阴阳怪气', '冷静终结']
    styles.forEach((s, i) => {
      const html = renderReplayHtml({ ...baseReplay, style: s }, 'https://e.x')
      expect(html).toContain(labels[i])
    })
  })
})
