import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bolt } from '../components/Icons'
import { BlueMascot, RedMascot, Sparks } from '../components/Mascots'
import GeneratingOverlay from '../components/GeneratingOverlay'
import { ApiError, generateReply, type StyleKey } from '../lib/api'
import { track } from '../lib/analytics'
import { useToast } from '../components/Toast'

const RELATIONS = [
  { key: 'couple', label: '情侣', emoji: '💖' },
  { key: 'friend', label: '朋友', emoji: '🧃' },
  { key: 'work', label: '同事', emoji: '💼' },
  { key: 'family', label: '家人', emoji: '🏠' },
] as const

const STYLES: { key: StyleKey; label: string; icon: string; desc: string }[] = [
  { key: 'savage', label: '爽文反击', icon: '⚡', desc: '直球硬刚' },
  { key: 'logic', label: '逻辑碾压', icon: '🔥', desc: '讲道理到你服' },
  { key: 'sarcasm', label: '阴阳怪气', icon: '😏', desc: '拐弯抹角扎你' },
  { key: 'calm', label: '冷静终结', icon: '🧊', desc: '不带情绪压一下' },
]

export default function HomePage() {
  const nav = useNavigate()
  const toast = useToast()
  const [text, setText] = useState('')
  const [rel, setRel] = useState<(typeof RELATIONS)[number]['key']>('couple')
  const [style, setStyle] = useState<StyleKey>('savage')
  const [firing, setFiring] = useState(false)
  const [generating, setGenerating] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  const canSubmit = text.trim().length > 0 && !generating

  const onSubmit = async () => {
    if (!canSubmit) return
    setFiring(true)
    btnRef.current?.classList.add('animate-pressBounce')
    setTimeout(() => btnRef.current?.classList.remove('animate-pressBounce'), 360)
    setTimeout(() => setFiring(false), 520)
    setGenerating(true)

    const trimmed = text.trim()
    const t0 = Date.now()
    track('generate_submit', {
      relation: rel,
      style,
      text_length: trimmed.length,
    })
    try {
      const reply = await generateReply({
        text: trimmed,
        relation: rel,
        style,
      })
      track('generate_success', {
        relation: rel,
        style,
        latency_ms: Date.now() - t0,
      })
      nav('/result', { state: { text: trimmed, rel, reply, style } })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'unknown'
      track('generate_error', { code, style, relation: rel })
      const message =
        err instanceof ApiError ? err.message : '生成失败，请重试'
      toast.show(message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="relative min-h-dvh">
      <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_70%)]" />

      <header className="relative px-5 pt-14 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bolt className="w-5 h-5 text-accent" />
          <span className="text-sm text-white/80 tracking-wide">吵架模拟器</span>
        </div>
        <span className="text-[11px] text-muted">v0.1</span>
      </header>

      {/* Hero */}
      <section className="relative px-5 pt-4">
        <h1 className="font-heavy font-black leading-[1.05] text-[34px]">
          <span className="block title-skew">把没吵赢的架</span>
          <span className="block title-skew">
            重新
            <span className="relative mx-1 inline-block">
              <span className="relative z-10 text-primary">吵赢</span>
              <span className="absolute inset-x-0 bottom-1 h-3 bg-accent/80 -z-0 -skew-x-6 rounded-sm" />
            </span>
            一遍
          </span>
        </h1>

        <div className="relative mt-6 h-[170px]">
          <Sparks className="absolute inset-0 w-full h-full" />
          <div className="absolute left-2 top-1 w-[140px] animate-float">
            <RedMascot className="w-full drop-shadow-[0_10px_20px_rgba(255,59,77,0.45)]" />
          </div>
          <div
            className="absolute right-2 top-3 w-[140px] animate-float"
            style={{ animationDelay: '400ms' }}
          >
            <BlueMascot className="w-full drop-shadow-[0_10px_20px_rgba(59,130,246,0.4)]" />
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-[conic-gradient(from_180deg,rgba(255,122,69,.35),rgba(255,59,77,.35),rgba(139,92,246,.35),rgba(59,130,246,.35),rgba(255,122,69,.35))] blur-xl" />
        </div>

        <p className="mt-2 text-center text-[13px] text-muted">
          AI 帮你复盘 · 生成反击 · 模拟对吵
        </p>
      </section>

      {/* Input */}
      <section className="relative px-5 mt-5">
        <div className="relative rounded-2xl bg-card/80 backdrop-blur border border-white/5 p-4 shadow-card before:absolute before:inset-0 before:rounded-2xl before:pointer-events-none before:bg-[radial-gradient(ellipse_at_top_left,rgba(255,59,77,0.08),transparent_50%)]">
          <label className="sr-only" htmlFor="fight">
            把对方说的话贴进来
          </label>
          <textarea
            id="fight"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={'把对方说的话贴进来…\n比如：他把我当透明人'}
            className="relative w-full resize-none bg-transparent text-[15px] placeholder:text-muted/80 outline-none"
          />

          <div className="relative mt-3 flex flex-wrap gap-2">
            {RELATIONS.map((r) => {
              const on = r.key === rel
              return (
                <button
                  key={r.key}
                  onClick={() => setRel(r.key)}
                  className={`h-8 px-3 rounded-full border text-[12.5px] transition-all ${
                    on
                      ? 'border-primary/60 bg-primary/15 text-white shadow-[inset_0_0_0_1px_rgba(255,59,77,0.4)]'
                      : 'border-white/10 bg-white/5 text-white/70 hover:text-white'
                  }`}
                >
                  <span className="mr-1">{r.emoji}</span>
                  {r.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-muted px-1 mb-2">
            <span>选风格</span>
            <span>
              {STYLES.find((s) => s.key === style)?.desc}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {STYLES.map((s) => {
              const on = s.key === style
              return (
                <button
                  key={s.key}
                  onClick={() => setStyle(s.key)}
                  className={`h-[62px] rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                    on
                      ? 'border-transparent bg-cta-gradient text-white shadow-glowOrange scale-[1.02]'
                      : 'border-white/10 bg-white/5 text-white/80 hover:text-white'
                  }`}
                >
                  <span className="text-[18px] leading-none">{s.icon}</span>
                  <span className="text-[11.5px] font-heavy font-black">
                    {s.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <button
          ref={btnRef}
          disabled={!canSubmit}
          onClick={onSubmit}
          className={`btn-sweep ${firing ? 'is-firing' : ''}
            mt-4 w-full h-14 rounded-2xl font-heavy font-black text-[17px] tracking-wide flex items-center justify-center gap-2 transition-all
            ${
              canSubmit
                ? 'bg-cta-gradient text-white shadow-glow animate-pulseGlow active:scale-[0.98]'
                : 'bg-white/5 text-white/50 cursor-not-allowed'
            }
          `}
        >
          <Bolt className="w-5 h-5" />
          帮我吵回来
        </button>

        <p className="mt-3 text-center text-[11px] text-muted">
          点击 · 按钮缩→弹 + 闪电划过 · 进入「正在帮你想更狠的回复」
        </p>
      </section>

      {generating && <GeneratingOverlay />}
    </div>
  )
}
