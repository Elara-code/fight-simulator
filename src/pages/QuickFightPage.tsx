import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bolt } from '../components/Icons'
import GeneratingOverlay from '../components/GeneratingOverlay'
import {
  ApiError,
  generateReply,
  type Relation,
  type StyleKey,
} from '../lib/api'
import { track } from '../lib/analytics'
import { useToast } from '../components/Toast'
import { getStylePref, setStylePref } from '../lib/prefs'

// Quick-fight: the entry behind the bottom `+` button. No scenarios, no
// filter tabs, no hero — just paste → pick relation + style → fire.
// HomePage remains the rich discovery entry; this one is for users who
// already know what they want to say.

const RELATIONS: { key: Relation; label: string; emoji: string }[] = [
  { key: 'couple', label: '情侣', emoji: '💖' },
  { key: 'friend', label: '朋友', emoji: '🧃' },
  { key: 'work', label: '同事', emoji: '💼' },
  { key: 'family', label: '家人', emoji: '🏠' },
]

const STYLES: { key: StyleKey; label: string; icon: string; desc: string }[] = [
  { key: 'savage', label: '爽文反击', icon: '⚡', desc: '直球硬刚' },
  { key: 'logic', label: '逻辑碾压', icon: '🔥', desc: '讲道理到你服' },
  { key: 'sarcasm', label: '阴阳怪气', icon: '😏', desc: '拐弯抹角扎你' },
  { key: 'calm', label: '冷静终结', icon: '🧊', desc: '不带情绪压一下' },
  { key: 'classic', label: '腹有诗书', icon: '📜', desc: '引经据典 优雅压制' },
]

export default function QuickFightPage() {
  const nav = useNavigate()
  const toast = useToast()
  const [text, setText] = useState('')
  const [rel, setRel] = useState<Relation>('couple')
  const [style, setStyle] = useState<StyleKey>(() => getStylePref() ?? 'savage')
  const [generating, setGenerating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const canSubmit = text.trim().length > 0 && !generating

  const onSubmit = async () => {
    if (!canSubmit) return
    setGenerating(true)
    const trimmed = text.trim()
    const t0 = Date.now()
    track('generate_submit', {
      relation: rel,
      style,
      text_length: trimmed.length,
      from: 'quick',
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
        from: 'quick',
      })
      nav('/result', { state: { text: trimmed, rel, reply, style } })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'unknown'
      track('generate_error', { code, style, relation: rel, from: 'quick' })
      const message =
        err instanceof ApiError ? err.message : '生成失败，请重试'
      toast.show(message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="relative min-h-dvh">
      <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_70%)]" />

      <header className="relative px-5 pt-14 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[22px]">⚡</span>
          <h1 className="font-heavy font-black text-[22px] leading-tight">
            快速吵一句
          </h1>
        </div>
        <p className="mt-1 text-[13px] text-muted">
          不用挑场景，直接贴原话、选风格、发射
        </p>
      </header>

      <section className="relative px-5">
        <div className="relative rounded-2xl bg-card/80 backdrop-blur border border-white/5 p-4 shadow-card">
          <label className="sr-only" htmlFor="quick-input">
            把对方说的话贴进来
          </label>
          <textarea
            ref={textareaRef}
            id="quick-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            autoFocus
            placeholder={'把对方说的话贴进来…\n例如：你怎么这点事都做不好'}
            className="relative w-full resize-none bg-transparent text-[15px] placeholder:text-muted/80 outline-none"
          />
          <div className="mt-1 text-right text-[11px] text-muted/70">
            {text.length}/500
          </div>
        </div>

        <div className="mt-5">
          <div className="text-[12px] text-muted px-1 mb-2">关系</div>
          <div className="flex flex-wrap gap-2">
            {RELATIONS.map((r) => {
              const on = r.key === rel
              return (
                <button
                  key={r.key}
                  onClick={() => setRel(r.key)}
                  className={`h-9 px-3.5 rounded-full border text-[13px] transition-all ${
                    on
                      ? 'border-primary/60 bg-primary/15 text-white'
                      : 'border-white/10 bg-white/5 text-white/70'
                  }`}
                >
                  <span className="mr-1">{r.emoji}</span>
                  {r.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[12px] text-muted px-1 mb-2">
            <span>风格</span>
            <span className="text-white/70">
              {STYLES.find((s) => s.key === style)?.desc}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {STYLES.map((s) => {
              const on = s.key === style
              return (
                <button
                  key={s.key}
                  onClick={() => {
                    setStyle(s.key)
                    setStylePref(s.key)
                  }}
                  className={`h-[62px] rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all px-1 ${
                    on
                      ? 'border-transparent bg-cta-gradient text-white shadow-glowOrange scale-[1.02]'
                      : 'border-white/10 bg-white/5 text-white/80'
                  }`}
                >
                  <span className="text-[17px] leading-none">{s.icon}</span>
                  <span className="text-[10.5px] font-heavy font-black whitespace-nowrap">
                    {s.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <button
          disabled={!canSubmit}
          onClick={onSubmit}
          className={`mt-6 w-full h-14 rounded-2xl font-heavy font-black text-[17px] flex items-center justify-center gap-2 transition-all ${
            canSubmit
              ? 'bg-cta-gradient text-white shadow-glow active:scale-[0.98]'
              : 'bg-white/5 text-white/50 cursor-not-allowed'
          }`}
        >
          <Bolt className="w-5 h-5" />
          帮我吵回来
        </button>

        <button
          onClick={() => nav('/')}
          className="mt-3 w-full h-10 text-[12px] text-muted/80 active:text-white/80"
        >
          想看看别人都在怎么吵 → 回首页
        </button>
      </section>

      {generating && <GeneratingOverlay />}
    </div>
  )
}
