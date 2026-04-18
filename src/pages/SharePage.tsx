import { useLocation, useNavigate } from 'react-router-dom'
import { Back, Download, Home, Share, User } from '../components/Icons'

const STICKERS = [
  { label: '吵赢了', from: '#FF4D6D', to: '#FFB703' },
  { label: '905分', from: '#00E5FF', to: '#6366F1' },
  { label: '碾压', from: '#A855F7', to: '#FF4D6D' },
  { label: '绝杀', from: '#0B0F14', to: '#141922' },
]

export default function SharePage() {
  const nav = useNavigate()
  const { state } = useLocation() as { state?: { them?: string; me?: string } }
  const them = state?.them || '你最近怎么这么敷衍我？'
  const me =
    state?.me ||
    '敷衍？是你先把我当背景板的。\n我一直在回应，你却在习惯性忽视。\n如果不在乎，就别来要求我理解。'

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
          {/* faux status watermark */}
          <div className="absolute top-2 right-3 text-[10px] text-black/20 tracking-widest font-num">
            299599
          </div>

          {/* badge */}
          <div className="absolute -top-2 right-4 -rotate-6 animate-pop">
            <Badge label="吵赢了" from="#FF4D6D" to="#FFB703" big />
          </div>

          <div className="pt-6 space-y-3">
            <Row side="left" text={them} />
            <Row
              side="right"
              text={
                '敷衍？是你先把我当背景板的。\n我一直在回应，你却在习惯性忽视。\n如果不在乎，就别来要求我理解。'
              }
            />
            <Row side="left" text={'你怎么突然这么敏感？'} />
            <Row
              side="right"
              text={
                '敏感？你迟到三次我都没说什么，\n这次只是想让你意识到我的感受。'
              }
            />
            <div className="pt-2 text-center text-[11px] text-black/40">
              <span className="inline-flex items-center gap-1">
                📷 来自「吵架模拟器」
              </span>
            </div>
          </div>
          {/* hidden anchor to keep the `me` variable referenced for share payloads */}
          <span className="hidden">{me}</span>
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
          <button className="flex-1 h-14 rounded-2xl bg-cta-gradient text-white font-heavy font-black flex items-center justify-center gap-2 shadow-glow active:scale-[0.99]">
            <Download className="w-5 h-5" />
            保存到相册
          </button>
          <button className="h-14 w-14 rounded-2xl bg-share-gradient grid place-items-center shadow-card active:scale-95">
            <Share className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-muted">
          截图生成 · 对话框「喵」地合成 · 伴随音效「ding!」
        </p>
      </section>
    </div>
  )
}

function Row({ side, text }: { side: 'left' | 'right'; text: string }) {
  const right = side === 'right'
  return (
    <div className={`flex ${right ? 'justify-end' : 'justify-start'} items-start gap-2`}>
      {!right && <Ava tone="red" />}
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13.5px] leading-snug shadow-sm whitespace-pre-line ${
          right ? 'bg-[#95EC69] text-[#0b0f14] rounded-tr-[4px]' : 'bg-white text-black rounded-tl-[4px]'
        }`}
      >
        {text}
      </div>
      {right && <Ava tone="red" />}
    </div>
  )
}

function Ava({ tone }: { tone: 'red' | 'blue' }) {
  const bg =
    tone === 'red'
      ? 'bg-gradient-to-br from-primary to-[#C5163A]'
      : 'bg-gradient-to-br from-ai to-[#1E6FB8]'
  return (
    <div className={`w-7 h-7 rounded-[10px] ${bg} grid place-items-center text-white shadow`}>
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
      className={`relative font-heavy font-black text-white ${big ? 'text-[18px] px-4 py-2' : 'text-[13px] px-3 py-1.5'} rounded-xl shadow-card`}
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
