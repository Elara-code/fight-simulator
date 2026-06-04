import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bolt } from '../components/Icons'
import { useToast } from '../components/Toast'
import {
  ApiError,
  getReplay,
  reportReplay,
  type Replay,
  type Verdict,
} from '../lib/api'
import { track } from '../lib/analytics'

const VERDICT_COLORS: Record<Verdict, { from: string; to: string }> = {
  碾压: { from: '#FF3B4D', to: '#8B5CF6' },
  完胜: { from: '#FF3B4D', to: '#FF7A45' },
  险胜: { from: '#FF7A45', to: '#FBBF24' },
  打平: { from: '#3B82F6', to: '#8B5CF6' },
  失利: { from: '#3A3F4B', to: '#1C1F26' },
}

type Line = { side: 'left' | 'right'; text: string }

export default function ReplayPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const toast = useToast()
  const [replay, setReplay] = useState<Replay | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [shown, setShown] = useState(0)
  const [reported, setReported] = useState(false)
  const [reporting, setReporting] = useState(false)

  useEffect(() => {
    if (!id) {
      setError('链接不合法')
      setLoading(false)
      return
    }
    let cancelled = false
    getReplay(id)
      .then((r) => {
        if (cancelled) return
        setReplay(r)
        setError(null)
        track('replay_view', { id: r.id, style: r.style })
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : '加载失败，请重试')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const lines: Line[] = replay
    ? [
        { side: 'left', text: replay.them },
        { side: 'right', text: replay.me },
        ...replay.dialog.flatMap<Line>((d) => [
          { side: 'left', text: d.them },
          { side: 'right', text: d.me },
        ]),
      ]
    : []

  useEffect(() => {
    if (!replay) return
    if (shown >= lines.length) return
    const t = setTimeout(() => setShown((n) => n + 1), 420)
    return () => clearTimeout(t)
  }, [replay, shown, lines.length])

  const onCta = () => {
    if (!replay) return
    track('replay_cta_click', { id: replay.id })
    nav('/', { state: { seedText: replay.them } })
  }

  const onReport = async () => {
    if (!replay || reported || reporting) return
    if (!window.confirm('确认举报这条战绩？包含不当内容会被下架。')) return
    setReporting(true)
    try {
      const res = await reportReplay(replay.id)
      track('replay_report', { id: replay.id, removed: res.removed })
      setReported(true)
      toast.show(
        res.removed ? '已下架，感谢你的反馈' : '已收到举报，我们会审核',
        'success',
      )
    } catch (err) {
      if (err instanceof ApiError && err.code === 'rate_limited') {
        toast.show('举报太频繁，稍后再试', 'info')
      } else {
        toast.show('举报失败，请重试', 'error')
      }
    } finally {
      setReporting(false)
    }
  }

  return (
    <div className="relative min-h-dvh">
      <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_70%)]" />

      <header className="relative flex items-center justify-between px-5 pt-12 pb-3">
        <button
          onClick={() => nav('/')}
          className="flex items-center gap-1.5 text-white/80 active:scale-95"
          aria-label="回首页"
        >
          <Bolt className="w-4 h-4 text-accent" />
          <span className="text-sm font-heavy font-black">吵架模拟器</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted">战绩回放</span>
          {replay && (
            <button
              onClick={onReport}
              disabled={reported || reporting}
              className="text-[11px] text-muted/80 underline-offset-2 hover:underline disabled:opacity-60 active:scale-95"
              aria-label="举报这条战绩"
            >
              {reported ? '已举报' : reporting ? '举报中…' : '举报'}
            </button>
          )}
        </div>
      </header>

      <section className="relative px-4 pb-[140px]">
        {loading && (
          <div className="mt-24 grid place-items-center">
            <div className="inline-flex gap-1.5">
              <Dot />
              <Dot delay={120} />
              <Dot delay={240} />
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="mt-20 text-center px-6">
            <div className="text-5xl mb-3">🕳️</div>
            <h2 className="font-heavy font-black text-[18px]">{error}</h2>
            <p className="mt-2 text-[13px] text-muted">
              战绩只保留 7 天，过期会自动清理。
            </p>
            <button
              onClick={() => nav('/')}
              className="mt-6 h-11 px-5 rounded-xl bg-cta-gradient text-white font-heavy font-black shadow-glow active:scale-95"
            >
              回首页自己来一局
            </button>
          </div>
        )}

        {replay && !error && (
          <>
            <div className="rounded-[22px] bg-[#ECECEC] p-4 shadow-card mt-2 relative">
              {replay.verdict && (
                <div className="absolute -top-2 right-4 -rotate-6">
                  <VerdictBadge verdict={replay.verdict} />
                </div>
              )}
              <div className="space-y-3 min-h-[260px] pt-1">
                {lines.slice(0, shown).map((l, i) => (
                  <div
                    key={i}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className="animate-typeIn"
                  >
                    <Row side={l.side} text={l.text} />
                  </div>
                ))}
                {shown < lines.length && (
                  <Row side={lines[shown].side} text="…" typing />
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-black/10 text-center">
                <div className="text-[11px] text-black/60 tracking-wide">
                  来自「吵架模拟器」
                </div>
              </div>
            </div>

            {(typeof replay.score === 'number' || replay.highlight) && (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  {typeof replay.score === 'number' && (
                    <div>
                      <div className="text-[11px] text-muted">AI 评分</div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="font-heavy font-black text-[32px] leading-none font-num text-white">
                          {replay.score}
                        </span>
                        <span className="text-[12px] text-muted">/ 100</span>
                      </div>
                    </div>
                  )}
                  {replay.verdict && <VerdictBadge verdict={replay.verdict} big />}
                </div>
                {replay.highlight && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="text-[11px] text-muted">AI 认为最狠的一句</div>
                    <blockquote className="mt-1 text-[14px] text-white/90 leading-snug before:content-['“'] after:content-['”'] before:text-accent after:text-accent">
                      {replay.highlight}
                    </blockquote>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {replay && !error && shown >= lines.length && (
        <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-6 pt-4 bg-gradient-to-t from-bg via-bg/95 to-transparent">
          <div className="text-center text-[13px] text-white/80 mb-3">
            你也遇到过这种话？
          </div>
          <button
            onClick={onCta}
            className="w-full h-14 rounded-2xl bg-cta-gradient text-white font-heavy font-black text-[17px] flex items-center justify-center gap-2 shadow-glow animate-pulseGlow active:scale-[0.98]"
          >
            <Bolt className="w-5 h-5" />
            帮我也吵一局
          </button>
        </div>
      )}
    </div>
  )
}

function Row({
  side,
  text,
  typing,
}: {
  side: 'left' | 'right'
  text: string
  typing?: boolean
}) {
  const right = side === 'right'
  return (
    <div
      className={`flex ${right ? 'justify-end' : 'justify-start'} items-start gap-2`}
    >
      {!right && <Ava />}
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13.5px] leading-snug shadow-sm whitespace-pre-line ${
          right
            ? 'bg-[#95EC69] text-[#0b0f14] rounded-tr-[4px]'
            : 'bg-white text-black rounded-tl-[4px]'
        } ${typing ? 'opacity-80' : ''}`}
      >
        {typing ? (
          <span className="inline-flex gap-1">
            <DarkDot /> <DarkDot delay={120} /> <DarkDot delay={240} />
          </span>
        ) : (
          text
        )}
      </div>
      {right && <Ava />}
    </div>
  )
}

function Ava() {
  return (
    <div className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-primary to-[#C5163A] grid place-items-center text-white shadow">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M8 10h.01M12 10h.01M16 10h.01" />
        <path d="M21 12a8 8 0 1 1-3.3-6.5L21 5l-1 3.5A8 8 0 0 1 21 12Z" />
      </svg>
    </div>
  )
}

function VerdictBadge({ verdict, big }: { verdict: Verdict; big?: boolean }) {
  const { from, to } = VERDICT_COLORS[verdict]
  return (
    <div
      className={`relative font-heavy font-black text-white rounded-xl shadow-card ${
        big ? 'text-[18px] px-4 py-2' : 'text-[13px] px-3 py-1.5'
      }`}
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      {verdict}
    </div>
  )
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full bg-white/70 animate-float"
      style={{ animationDelay: `${delay}ms`, animationDuration: '700ms' }}
    />
  )
}

function DarkDot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-black/40 animate-float"
      style={{ animationDelay: `${delay}ms`, animationDuration: '700ms' }}
    />
  )
}
