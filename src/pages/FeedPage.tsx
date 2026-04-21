import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Back, Bolt, Refresh } from '../components/Icons'
import { ApiError, listFeed, type FeedItem, type StyleKey } from '../lib/api'
import { track } from '../lib/analytics'

const STYLE_CHIP: Record<StyleKey, { label: string; tone: string }> = {
  savage: { label: '⚡ 爽文反击', tone: 'from-primary/30 to-accent/30 text-white' },
  logic: { label: '🔥 逻辑碾压', tone: 'from-orange-500/30 to-amber-500/30 text-white' },
  sarcasm: { label: '😏 阴阳怪气', tone: 'from-purple-500/30 to-pink-500/30 text-white' },
  calm: { label: '🧊 冷静终结', tone: 'from-sky-500/30 to-blue-500/30 text-white' },
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return `${Math.floor(diff / 86_400_000)} 天前`
}

export default function FeedPage() {
  const nav = useNavigate()
  const [items, setItems] = useState<FeedItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await listFeed()
      setItems(rows)
      track('feed_view', { count: rows.length })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const onOpen = (id: string) => {
    track('feed_item_click', { id })
    nav(`/r/${id}`)
  }

  return (
    <div className="relative min-h-dvh pb-24">
      <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_70%)]" />

      <header className="relative flex items-center justify-between px-4 pt-12 pb-3">
        <button
          onClick={() => nav(-1)}
          className="w-9 h-9 grid place-items-center rounded-xl bg-white/5 border border-white/10 active:scale-95"
          aria-label="返回"
        >
          <Back className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1.5">
          <Bolt className="w-4 h-4 text-accent" />
          <h1 className="font-heavy font-black text-[17px]">吵架榜</h1>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="w-9 h-9 grid place-items-center rounded-xl bg-white/5 border border-white/10 active:scale-95 disabled:opacity-50"
          aria-label="刷新"
        >
          <Refresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <section className="relative px-4 pt-1">
        <p className="text-[12px] text-muted mb-3 px-1">
          大家主动公开的战绩 · 最多保留 7 天 · 举报三次自动下架
        </p>

        {loading && !items && (
          <div className="mt-16 grid place-items-center">
            <div className="inline-flex gap-1.5">
              <Dot />
              <Dot delay={120} />
              <Dot delay={240} />
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="mt-16 text-center px-6">
            <div className="text-5xl mb-3">🥀</div>
            <div className="font-heavy font-black text-[16px]">{error}</div>
            <button
              onClick={load}
              className="mt-4 h-10 px-4 rounded-xl bg-cta-gradient text-white font-heavy font-black shadow-glow active:scale-95"
            >
              重试
            </button>
          </div>
        )}

        {!loading && !error && items && items.length === 0 && (
          <div className="mt-16 text-center px-6">
            <div className="text-5xl mb-3">🥊</div>
            <div className="font-heavy font-black text-[16px]">榜单还是空的</div>
            <p className="mt-2 text-[13px] text-muted">
              去生成一条战绩，保存时打开「上榜」开关，
              <br />
              你的金句就能出现在这里。
            </p>
            <button
              onClick={() => nav('/')}
              className="mt-5 h-10 px-4 rounded-xl bg-cta-gradient text-white font-heavy font-black shadow-glow active:scale-95"
            >
              去吵一局
            </button>
          </div>
        )}

        {items && items.length > 0 && (
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.id}>
                <button
                  onClick={() => onOpen(it.id)}
                  className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] active:scale-[0.99] transition p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full bg-gradient-to-r ${STYLE_CHIP[it.style].tone}`}
                    >
                      {STYLE_CHIP[it.style].label}
                    </span>
                    <span className="text-[11px] text-muted shrink-0">
                      {relativeTime(it.createdAt)}
                    </span>
                  </div>
                  <div className="mt-3 rounded-xl bg-white/5 border border-white/5 p-2.5">
                    <div className="text-[11px] text-muted mb-0.5">对方说</div>
                    <div className="text-[13.5px] text-white/90 line-clamp-2 whitespace-pre-line">
                      {it.them}
                    </div>
                  </div>
                  <div className="mt-2 rounded-xl bg-primary/10 border border-primary/25 p-2.5">
                    <div className="text-[11px] text-primary/90 mb-0.5">我回</div>
                    <div className="text-[13.5px] text-white line-clamp-3 whitespace-pre-line">
                      {it.me}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
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
