import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Back } from '../components/Icons'
import {
  ApiError,
  listScenarioTop,
  type ScenarioTopItem,
  type StyleKey,
  type Verdict,
} from '../lib/api'
import { track } from '../lib/analytics'
import { getScenario } from '../lib/scenarios'

const STYLE_CHIP: Record<StyleKey, { icon: string; label: string }> = {
  savage: { icon: '⚡', label: '爽文反击' },
  logic: { icon: '🔥', label: '逻辑碾压' },
  sarcasm: { icon: '😏', label: '阴阳怪气' },
  calm: { icon: '🧊', label: '冷静终结' },
}

const VERDICT_COLORS: Record<Verdict, { from: string; to: string }> = {
  碾压: { from: '#FF3B4D', to: '#8B5CF6' },
  完胜: { from: '#FF3B4D', to: '#FF7A45' },
  险胜: { from: '#FF7A45', to: '#FBBF24' },
  打平: { from: '#3B82F6', to: '#8B5CF6' },
  失利: { from: '#3A3F4B', to: '#1C1F26' },
}

export default function ScenarioTopPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [items, setItems] = useState<ScenarioTopItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const scenario = id ? getScenario(id) : undefined

  useEffect(() => {
    if (!id) {
      setError('场景不存在')
      setLoading(false)
      return
    }
    track('scenario_top_view', { id })
    let cancelled = false
    listScenarioTop(id)
      .then((r) => {
        if (cancelled) return
        setItems(r)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : '加载失败，请重试')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id])

  const onTryThis = () => {
    if (!scenario) return
    nav('/', {
      state: { seedText: scenario.text },
    })
  }

  return (
    <div className="relative min-h-dvh">
      <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_70%)]" />

      <header className="relative flex items-center justify-between px-4 pt-12 pb-3">
        <button
          onClick={() => nav(-1)}
          className="w-9 h-9 grid place-items-center rounded-xl bg-white/5 border border-white/10 active:scale-95"
          aria-label="返回"
        >
          <Back className="w-5 h-5" />
        </button>
        <h1 className="font-heavy font-black text-[17px]">本话题排行</h1>
        <span className="w-9 h-9" />
      </header>

      <section className="relative px-4 pt-2">
        {scenario ? (
          <div className="rounded-2xl border border-white/10 bg-card/70 p-4">
            <div className="flex items-start gap-3">
              <span className="text-[28px] leading-none">{scenario.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-heavy font-black text-white/90">
                  {scenario.title}
                </div>
                <div className="mt-1 text-[13px] text-muted leading-snug">
                  对方说：「{scenario.text}」
                </div>
              </div>
            </div>
            <button
              onClick={onTryThis}
              className="mt-3 w-full h-10 rounded-xl bg-cta-gradient text-white text-[13px] font-heavy font-black active:scale-[0.98]"
            >
              我也来吵这个
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-card/70 p-4 text-[13px] text-muted">
            这个场景不存在或已下线。
          </div>
        )}

        <div className="mt-5">
          <div className="flex items-center justify-between text-[12px] text-muted px-1 mb-2">
            <span>大家都是怎么吵的 · 按 AI 评分排</span>
            {items && items.length > 0 && (
              <span>{items.length} 条</span>
            )}
          </div>

          {loading && (
            <div className="rounded-xl bg-white/5 py-10 grid place-items-center text-muted text-[13px]">
              加载中…
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 text-red-100 px-4 py-3 text-[13px] flex items-center justify-between">
              <span>⚠️ {error}</span>
              <button
                onClick={() => location.reload()}
                className="underline underline-offset-2 text-red-200/80"
              >
                重试
              </button>
            </div>
          )}

          {!loading && !error && items && items.length === 0 && (
            <div className="rounded-xl bg-white/5 py-10 grid place-items-center text-center px-6">
              <div className="text-3xl mb-2">💭</div>
              <div className="text-[13px] text-white/80">
                还没人吵过这个话题
              </div>
              <div className="mt-1 text-[11px] text-muted/80">
                你第一个吵赢了，就能上榜
              </div>
            </div>
          )}

          {!loading && !error && items && items.length > 0 && (
            <ol className="space-y-2">
              {items.map((it, i) => (
                <li key={it.id}>
                  <Link
                    to={`/r/${it.id}`}
                    onClick={() =>
                      track('scenario_top_click', {
                        scenario_id: id,
                        replay_id: it.id,
                        rank: i + 1,
                      })
                    }
                    className="block rounded-xl border border-white/10 bg-card/60 p-3 active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 shrink-0 rounded-lg bg-white/10 grid place-items-center font-heavy font-black text-[14px] text-white/90 font-num">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] text-muted/90">
                            {STYLE_CHIP[it.style].icon} {STYLE_CHIP[it.style].label}
                          </span>
                          {typeof it.score === 'number' && (
                            <span className="text-[11px] font-heavy font-black text-white/90 font-num">
                              {it.score}分
                            </span>
                          )}
                          {it.verdict && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded text-white font-heavy font-black"
                              style={{
                                background: `linear-gradient(135deg, ${
                                  VERDICT_COLORS[it.verdict].from
                                } 0%, ${VERDICT_COLORS[it.verdict].to} 100%)`,
                              }}
                            >
                              {it.verdict}
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] text-white/90 leading-snug whitespace-pre-line line-clamp-3">
                          {it.highlight ? `「${it.highlight}」` : it.me}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  )
}
