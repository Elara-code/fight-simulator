import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Back, Download, Home, Share, User } from '../components/Icons'
import Fireworks from '../components/Fireworks'

const STICKERS = [
  { label: '吵赢了', from: '#FF3B4D', to: '#FF7A45' },
  { label: '905分', from: '#3B82F6', to: '#8B5CF6' },
  { label: '碾压', from: '#8B5CF6', to: '#FF3B4D' },
  { label: '绝杀', from: '#0F1115', to: '#1C1F26' },
]

type Line = { side: 'left' | 'right'; text: string }

export default function SharePage() {
  const nav = useNavigate()
  const { state } = useLocation() as { state?: { them?: string; me?: string } }
  const them = state?.them || '你最近怎么这么敷衍我？'
  const me =
    state?.me ||
    '敷衍？是你先把我当背景板的。\n我一直在回应，你却在习惯性忽视。\n如果不在乎，就别来要求我理解。'

  const lines: Line[] = [
    { side: 'left', text: them },
    { side: 'right', text: me },
    { side: 'left', text: '你怎么突然这么敏感？' },
    { side: 'right', text: '敏感？你迟到三次我都没说什么，\n这次只是想让你意识到我的感受。' },
  ]

  const [shown, setShown] = useState(0)
  const [dinged, setDinged] = useState(false)
  const [fireworks, setFireworks] = useState(false)

  // 气泡一条条出现（像打字）
  useEffect(() => {
    if (shown >= lines.length) {
      const t = setTimeout(() => setDinged(true), 260)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setShown((n) => n + 1), 380)
    return () => clearTimeout(t)
  }, [shown, lines.length])

  const onSave = () => {
    setDinged(false)
    requestAnimationFrame(() => setDinged(true))
  }

  return (
    <div className="relative min-h-dvh">
      <header className="relative flex items-center justify-between px-4 pt-12 pb-3">
        <button
          onClick={() => nav(-1)}
          className="w-9 h-9 grid place-items-center rounded-xl bg-white/5 border border-white/10 active:scale-95"
        >
          <Back className="w-5 h-5" />
        </button>
        <h1 className="font-heavy font-black text-[17px]">战绩截图</h1>
        <div className="flex gap-2">
          <button
            onClick={() => nav('/')}
            className="w-9 h-9 grid place-items-center rounded-xl bg-white/5 border border-white/10"
          >
            <Home className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 grid place-items-center rounded-xl bg-white/5 border border-white/10">
            <User className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Screenshot canvas */}
      <section className="relative px-4">
        <div className="relative rounded-[22px] bg-[#ECECEC] p-4 shadow-card overflow-hidden">
          <div className="absolute top-2 right-3 text-[10px] text-black/20 tracking-widest font-num">
            299599
          </div>

          {/* 叮！贴纸 */}
          {dinged && (
            <div className="absolute -top-2 right-4 -rotate-6 animate-dingPop">
              <Badge label="吵赢了" from="#FF3B4D" to="#FF7A45" big />
            </div>
          )}

          <div className="pt-6 space-y-3 min-h-[320px]">
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
            <div className="pt-2 text-center text-[11px] text-black/40">
              <span className="inline-flex items-center gap-1">
                📷 来自「吵架模拟器」
              </span>
            </div>
          </div>
        </div>

        {/* sticker tray */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          {STICKERS.map((s) => (
            <div
              key={s.label}
              className="aspect-[1.2/1] rounded-2xl border border-white/10 bg-white/[0.04] grid place-items-center"
            >
              <Badge label={s.label} from={s.from} to={s.to} />
            </div>
          ))}
        </div>

        {/* actions */}
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={onSave}
            className="flex-1 h-14 rounded-2xl bg-cta-gradient text-white font-heavy font-black flex items-center justify-center gap-2 shadow-glow active:scale-[0.98]"
          >
            <Download className="w-5 h-5" />
            保存到相册
          </button>
          <button
            onClick={() => setFireworks(true)}
            className="h-14 px-5 rounded-2xl bg-share-gradient text-white font-heavy font-black flex items-center justify-center gap-2 shadow-glowAi active:scale-95"
          >
            <Share className="w-5 h-5" />
            发给朋友
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-muted">
          气泡一条条出现 · 完成「叮」一下 · 分享成功 🎆 小烟花
        </p>
      </section>

      {fireworks && (
        <Fireworks label="分享成功" onDone={() => setFireworks(false)} />
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
      {!right && <Ava tone="red" />}
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13.5px] leading-snug shadow-sm whitespace-pre-line ${
          right
            ? 'bg-[#95EC69] text-[#0b0f14] rounded-tr-[4px]'
            : 'bg-white text-black rounded-tl-[4px]'
        } ${typing ? 'opacity-80' : ''}`}
      >
        {typing ? (
          <span className="inline-flex gap-1">
            <Dot /> <Dot delay={120} /> <Dot delay={240} />
          </span>
        ) : (
          text
        )}
      </div>
      {right && <Ava tone="red" />}
    </div>
  )
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full bg-black/40 animate-float"
      style={{ animationDelay: `${delay}ms`, animationDuration: '700ms' }}
    />
  )
}

function Ava({ tone }: { tone: 'red' | 'blue' }) {
  const bg =
    tone === 'red'
      ? 'bg-gradient-to-br from-primary to-[#C5163A]'
      : 'bg-gradient-to-br from-ai to-[#1E6FB8]'
  return (
    <div
      className={`w-7 h-7 rounded-[10px] ${bg} grid place-items-center text-white shadow`}
    >
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

function Badge({
  label,
  from,
  to,
  big,
}: {
  label: string
  from: string
  to: string
  big?: boolean
}) {
  return (
    <div
      className={`relative font-heavy font-black text-white ${
        big ? 'text-[18px] px-4 py-2' : 'text-[13px] px-3 py-1.5'
      } rounded-xl shadow-card`}
      style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: `0 6px 18px -6px ${from}, inset 0 0 0 2px rgba(255,255,255,0.18)`,
      }}
    >
      <span className="relative z-10">{label}</span>
      <span
        className="absolute inset-0 rounded-xl"
        style={{
          background:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0 6px, transparent 6px 12px)',
          opacity: 0.4,
        }}
      />
    </div>
  )
}
