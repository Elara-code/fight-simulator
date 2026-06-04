import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Back, Bolt, Copy, Refresh, Share } from '../components/Icons'
import ChatBubble from '../components/ChatBubble'
import { useToast } from '../components/Toast'
import {
  ApiError,
  createChallenge,
  generateReply,
  getScorePercentile,
  type GenerateHint,
  type Relation,
  type Reply,
  type StyleKey,
  type TrainVerdict,
  type Verdict,
} from '../lib/api'
import { track } from '../lib/analytics'
import {
  getEntry,
  newId,
  updateReplies,
  upsertEntry,
  type HistoryEntry,
} from '../lib/history'
import { setHintPref, setStylePref } from '../lib/prefs'

const STYLES: { key: StyleKey; label: string; icon: string }[] = [
  { key: 'savage', label: '爽文反击', icon: '⚡' },
  { key: 'logic', label: '逻辑碾压', icon: '🔥' },
  { key: 'sarcasm', label: '阴阳怪气', icon: '😏' },
  { key: 'calm', label: '冷静终结', icon: '🧊' },
  { key: 'classic', label: '腹有诗书', icon: '📜' },
]

// Maps the 5-tier 中文 verdict (which the AI generates) down to the 3-tier
// win/draw/lose that the challenge endpoint stores. The challenge flow is
// asymmetric — the friend sees "this person beat the game with score X" so
// 险胜 still counts as a win for them to chase.
function toTrainVerdict(v: Verdict | undefined): TrainVerdict {
  if (v === '碾压' || v === '完胜' || v === '险胜') return 'win'
  if (v === '失利') return 'lose'
  return 'draw'
}

const FALLBACK: Record<StyleKey, Reply> = {
  savage: {
    me: '你不回我消息，是手断了还是网断了？\n两样都没断，那就是心断了。',
    dialog: [
      { them: '别说得这么难听。', me: '难听的不是我的话，是你的行为。' },
      { them: '我错了还不行吗？', me: '认错容易，改才难。' },
    ],
  },
  logic: {
    me: '敷衍？是你先把我当背景板的。\n我一直在回应，你却在习惯性忽视。\n如果不在乎，就别来要求我理解。',
    dialog: [
      {
        them: '你怎么突然这么敏感？',
        me: '敏感？你迟到三次我都没说什么，\n这次只是想让你意识到我的感受。',
      },
      { them: '那你想怎么样？', me: '从现在开始，尊重是基本的。' },
    ],
  },
  sarcasm: {
    me: '哦~原来你在乎啊？\n我还以为空气比我更重要呢。',
    dialog: [
      { them: '别这么阴阳好吗？', me: '忙到回消息需要三天？\n那我下次用飞鸽传书好了。' },
      { them: '我只是最近有点忙。', me: '忙不是借口，是选择。' },
    ],
  },
  calm: {
    me: '我理解你最近忙，但忽视是有代价的。\n我们可以聊聊怎么改善。',
    dialog: [{ them: '好，我们谈谈。', me: '谢谢。先听你说。' }],
  },
  classic: {
    me: '《论语》有云：「己所不欲，勿施于人。」\n你受不了被忽视，又为何把同样的冷漠递给我？',
    dialog: [
      {
        them: '少拿大道理压我。',
        me: '不是道理压你，是事实压你。\n苏轼说过：「不识庐山真面目，只缘身在此山中。」',
      },
    ],
  },
}

type LocState = {
  text?: string
  rel?: Relation
  reply?: Reply
  style?: StyleKey
  entryId?: string
  scenarioId?: string | null
}

function loadEntryState(state: LocState | undefined): {
  entry?: HistoryEntry
  initialReplies: Partial<Record<StyleKey, Reply>>
  initialStyle: StyleKey
} {
  if (state?.entryId) {
    const entry = getEntry(state.entryId)
    if (entry) {
      const firstStyle = (state.style ??
        (Object.keys(entry.replies)[0] as StyleKey | undefined) ??
        'savage') as StyleKey
      return { entry, initialReplies: entry.replies, initialStyle: firstStyle }
    }
  }
  const replies: Partial<Record<StyleKey, Reply>> = state?.reply
    ? { savage: state.reply }
    : {}
  return { initialReplies: replies, initialStyle: state?.style ?? 'savage' }
}

export default function ResultsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const { state } = useLocation() as { state?: LocState }
  const loaded = loadEntryState(state)
  const themMsg =
    loaded.entry?.text || state?.text?.trim() || '你最近怎么这么敷衍我？'
  const relation: Relation = loaded.entry?.relation ?? state?.rel ?? 'couple'
  const hasAnyReply = Object.keys(loaded.initialReplies).length > 0
  const isDemo = !hasAnyReply

  const [style, setStyle] = useState<StyleKey>(loaded.initialStyle)
  const cacheRef = useRef<Partial<Record<StyleKey, Reply>>>(loaded.initialReplies)
  const entryIdRef = useRef<string | null>(
    loaded.entry?.id ?? state?.entryId ?? null,
  )
  const [reply, setReply] = useState<Reply>(
    loaded.initialReplies[loaded.initialStyle] ?? FALLBACK[loaded.initialStyle],
  )
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<null | 'one' | 'all'>(null)
  const [error, setError] = useState<string | null>(null)
  const [percentile, setPercentile] = useState<number | null>(null)
  const [challengeState, setChallengeState] = useState<
    { status: 'idle' } | { status: 'creating' } | { status: 'created'; url: string }
  >({ status: 'idle' })

  const persistEntry = (patch: Partial<Record<StyleKey, Reply>>) => {
    if (isDemo) return
    if (entryIdRef.current) {
      updateReplies(entryIdRef.current, patch)
    } else {
      const id = newId()
      entryIdRef.current = id
      upsertEntry({
        id,
        text: themMsg,
        relation,
        replies: { ...cacheRef.current, ...patch },
        createdAt: Date.now(),
      })
    }
  }

  const fetchStyle = async (
    target: StyleKey,
    opts: { force?: boolean; hint?: GenerateHint } = {},
  ) => {
    const { force = false, hint } = opts
    if (!force && !hint && cacheRef.current[target]) {
      setReply(cacheRef.current[target]!)
      setError(null)
      return
    }
    if (isDemo && !force && !hint) {
      setReply(FALLBACK[target])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const t0 = Date.now()
    track('generate_submit', {
      relation,
      style: target,
      text_length: themMsg.length,
      from: 'results',
      hint,
    })
    try {
      const r = await generateReply({
        text: themMsg,
        relation,
        style: target,
        hint,
      })
      track('generate_success', {
        relation,
        style: target,
        latency_ms: Date.now() - t0,
        from: 'results',
        hint,
      })
      cacheRef.current[target] = r
      setReply(r)
      persistEntry({ [target]: r })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'unknown'
      track('generate_error', { code, style: target, relation, from: 'results', hint })
      const message =
        err instanceof ApiError ? err.message : '生成失败，请重试'
      setError(message)
      toast.show(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!entryIdRef.current && hasAnyReply && !isDemo) {
      persistEntry({ ...cacheRef.current })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchStyle(style)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style])

  // Fetch the percentile each time the score changes so users see "击败 X%"
  // alongside the verdict. Hidden in demo mode (no real score) and when the
  // server tells us the sample is too small to anchor on.
  useEffect(() => {
    if (isDemo || typeof reply.score !== 'number') {
      setPercentile(null)
      return
    }
    let cancelled = false
    getScorePercentile(reply.score)
      .then((r) => {
        if (!cancelled) setPercentile(r.percentile)
      })
      .catch(() => {
        if (!cancelled) setPercentile(null)
      })
    return () => {
      cancelled = true
    }
  }, [reply.score, isDemo])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }

  const onCopyOne = async () => {
    const ok = await copyToClipboard(reply.me)
    if (ok) {
      track('copy', { mode: 'one', style })
      setCopied('one')
      setTimeout(() => setCopied(null), 1200)
    } else {
      toast.show('复制失败，请手动长按选中', 'error')
    }
  }

  const onCopyAll = async () => {
    const lines: string[] = [`[对方] ${themMsg}`, `[我] ${reply.me}`]
    reply.dialog.forEach((t) => {
      lines.push(`[对方] ${t.them}`, `[我] ${t.me}`)
    })
    const ok = await copyToClipboard(lines.join('\n'))
    if (ok) {
      track('copy', { mode: 'all', style })
      setCopied('all')
      toast.show('整段对话已复制', 'success')
      setTimeout(() => setCopied(null), 1200)
    } else {
      toast.show('复制失败，请手动长按选中', 'error')
    }
  }

  const onRegenerate = (hint?: GenerateHint) => {
    track('regenerate', { style, hint })
    if (hint) setHintPref(hint)
    delete cacheRef.current[style]
    fetchStyle(style, { force: true, hint })
  }

  const onChallengeFriend = async () => {
    if (challengeState.status === 'creating') return
    if (typeof reply.score !== 'number' || !reply.verdict) {
      toast.show('这条战绩还没拿到 AI 评分，没法发起挑战', 'info')
      return
    }
    setChallengeState({ status: 'creating' })
    track('challenge_create_from_result', { score: reply.score, style })
    try {
      const created = await createChallenge({
        opening: themMsg,
        relation,
        challengerScore: reply.score,
        challengerVerdict: toTrainVerdict(reply.verdict),
      })
      const url = `${window.location.origin}/challenge/${created.id}`
      setChallengeState({ status: 'created', url })
      const text = `我用 AI 吵了一句拿了 ${reply.score} 分（${reply.verdict}）。你来挑战看看？`
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: '吵架模拟器 · 挑战', text, url })
          track('challenge_share', { method: 'native', from: 'result' })
          return
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
        }
      }
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        toast.show('挑战链接已复制，发给朋友吧', 'success')
        track('challenge_share', { method: 'clipboard', from: 'result' })
      } catch {
        toast.show('链接已生成，请长按下方链接复制', 'info')
      }
    } catch (err) {
      setChallengeState({ status: 'idle' })
      const message =
        err instanceof ApiError ? err.message : '生成挑战链接失败，请重试'
      toast.show(message, 'error')
    }
  }

  const HINT_CHIPS: { hint: GenerateHint; icon: string; label: string }[] = [
    { hint: 'harder', icon: '🔥', label: '再狠点' },
    { hint: 'softer', icon: '🕊️', label: '缓和点' },
    { hint: 'different', icon: '🎲', label: '换个角度' },
  ]

  const onStyleSwitch = (next: StyleKey) => {
    if (next === style) return
    track('style_switch', { from: style, to: next })
    setStylePref(next)
    setStyle(next)
  }

  return (
    <div className="relative min-h-dvh">
      <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_70%)]" />

      <header className="relative flex items-center justify-between px-4 pt-12 pb-3">
        <button
          onClick={() => nav(-1)}
          aria-label="返回"
          className="w-9 h-9 grid place-items-center rounded-xl bg-white/5 border border-white/10 active:scale-95"
        >
          <Back className="w-5 h-5" />
        </button>
        <h1 className="font-heavy font-black text-[17px]">吵架结果</h1>
        <button
          onClick={() =>
            nav('/share', {
              state: {
                style,
                them: themMsg,
                me: reply.me,
                dialog: reply.dialog,
                score: reply.score,
                verdict: reply.verdict,
                highlight: reply.highlight,
                scenarioId: state?.scenarioId ?? null,
              },
            })
          }
          aria-label="生成截图分享"
          className="w-9 h-9 grid place-items-center rounded-xl bg-white/5 border border-white/10 active:scale-95"
        >
          <Share className="w-4 h-4" />
        </button>
      </header>

      {/* Style tabs */}
      <div className="relative px-4 no-scrollbar overflow-x-auto">
        <div className="flex items-center gap-2 py-1 min-w-max">
          {STYLES.map((s) => {
            const on = s.key === style
            return (
              <button
                key={s.key}
                disabled={loading && !on}
                onClick={() => onStyleSwitch(s.key)}
                className={`h-9 px-3.5 rounded-full border text-[13px] flex items-center gap-1 transition-all ${
                  on
                    ? 'border-transparent bg-cta-gradient text-white shadow-glowOrange scale-[1.04]'
                    : 'border-white/10 bg-white/5 text-white/70'
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            )
          })}
        </div>
        {error && !loading && (
          <button
            onClick={() => onRegenerate()}
            className="mt-2 w-full text-left text-[12px] rounded-xl border border-red-400/30 bg-red-500/10 text-red-100 px-3 py-2 flex items-center justify-between active:scale-[0.99]"
          >
            <span className="flex items-center gap-1.5">
              <span>⚠️</span>
              {error}
            </span>
            <span className="text-red-200/80 underline underline-offset-2">点这里重试</span>
          </button>
        )}
        {isDemo && !error && (
          <p className="mt-2 text-[11px] text-muted/80">
            这是示例文案 · 回首页输入你的台词生成真实反击
          </p>
        )}
      </div>

      {/* Regenerate hint chips */}
      {!isDemo && (
        <div className="relative px-4 mt-2 no-scrollbar overflow-x-auto">
          <div className="flex items-center gap-2 py-1 min-w-max">
            <span className="text-[11px] text-muted/70 pr-1">不满意？</span>
            {HINT_CHIPS.map((c) => (
              <button
                key={c.hint}
                disabled={loading}
                onClick={() => onRegenerate(c.hint)}
                className="h-8 px-3 rounded-full border border-white/10 bg-white/5 text-white/80 text-[12px] flex items-center gap-1 active:scale-95 disabled:opacity-50"
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation — key on content only so loading state doesn't remount,
          but a real reply swap still replays the cardBoom animation. */}
      <section
        key={reply.me.slice(0, 12)}
        className={`relative px-4 mt-3 space-y-3 transition-opacity duration-300 ${
          loading ? 'opacity-40' : 'opacity-100'
        }`}
      >
        <div style={{ animationDelay: '40ms' }} className="animate-cardBoom">
          <ChatBubble side="left" label="对方">
            {themMsg}
          </ChatBubble>
        </div>

        {/* 高亮主反击卡片：放大 + 发光 */}
        <div
          style={{ animationDelay: '140ms' }}
          className="animate-cardBoom relative"
        >
          <div className="relative rounded-2xl p-[2px] bg-cta-gradient shadow-glow">
            <div className="rounded-2xl bg-card/90 px-3 py-2">
              <ChatBubble side="right" tone="primary" label="你（反击）">
                <div className="whitespace-pre-line">{reply.me}</div>
              </ChatBubble>
            </div>
          </div>
          <div className="absolute -top-2 -right-2 text-[11px] px-2 py-0.5 rounded-full bg-accent text-black font-heavy font-black shadow">
            🔥 推荐
          </div>
        </div>

        <div className="pt-2 text-[12px] text-muted flex items-center gap-2">
          <span className="h-px flex-1 bg-white/10" />
          对吵模拟
          <span className="h-px flex-1 bg-white/10" />
        </div>

        {reply.dialog.map((turn, i) => (
          <div
            key={i}
            style={{ animationDelay: `${260 + i * 180}ms` }}
            className="space-y-3 animate-cardBoom"
          >
            <ChatBubble side="left" label="对方">
              {turn.them}
            </ChatBubble>
            <ChatBubble side="right" tone="primary">
              <div className="whitespace-pre-line">{turn.me}</div>
            </ChatBubble>
          </div>
        ))}

        {/* AI 评分 + 击败 X% 锚点 + 叫朋友挑战 CTA. Demo mode and replies
            from older history entries without scores hide this block. */}
        {!isDemo && typeof reply.score === 'number' && reply.verdict && (
          <div
            style={{ animationDelay: `${260 + reply.dialog.length * 180 + 80}ms` }}
            className="animate-cardBoom rounded-2xl border border-white/10 bg-white/[0.04] p-3 mt-2"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cta-gradient text-white font-heavy font-black w-14 h-14 grid place-items-center shadow-glow">
                <div className="text-center leading-none">
                  <div className="text-[20px] font-num">{reply.score}</div>
                  <div className="text-[9px] opacity-80 mt-0.5">/100</div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heavy font-black text-[15px]">
                    {reply.verdict}
                  </span>
                  {percentile != null && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-heavy font-black">
                      击败 {percentile}% 的人
                    </span>
                  )}
                </div>
                {reply.highlight && (
                  <div className="text-[12px] text-white/70 leading-snug mt-1 line-clamp-2">
                    最狠一句：「{reply.highlight}」
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onChallengeFriend}
              disabled={challengeState.status === 'creating'}
              className="mt-3 w-full h-11 rounded-xl bg-share-gradient text-white font-heavy font-black text-[13px] flex items-center justify-center gap-2 shadow-glowAi active:scale-95 disabled:opacity-60"
            >
              <Share className="w-4 h-4" />
              {challengeState.status === 'creating'
                ? '生成挑战链接中…'
                : challengeState.status === 'created'
                  ? '再分享一次'
                  : '叫朋友来吵这道题'}
            </button>
            {challengeState.status === 'created' && (
              <div className="mt-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 flex items-center gap-2">
                <Copy className="w-3.5 h-3.5 text-muted shrink-0" />
                <span className="text-[11.5px] text-white/70 truncate flex-1">
                  {challengeState.url}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Loading overlay: hovers above the faded previous conversation so
          the layout doesn't jump when switching styles. */}
      {loading && (
        <div
          className="pointer-events-none absolute left-0 right-0 top-[188px] px-4 flex justify-center"
          aria-live="polite"
          aria-label="正在生成新的反击"
        >
          <div className="rounded-2xl bg-card/95 border border-white/10 shadow-glow px-4 py-3 flex items-center gap-3">
            <TypingDots />
            <span className="text-[12px] text-white/80">正在想一句更狠的…</span>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="sticky bottom-[92px] mt-6 px-4">
        <div className="rounded-2xl bg-card/85 backdrop-blur border border-white/5 p-3 flex items-center gap-1.5 shadow-card">
          <button
            onClick={onCopyOne}
            disabled={loading}
            aria-label="复制主反击"
            className="h-12 w-12 shrink-0 rounded-xl border border-white/10 bg-white/5 text-white/90 grid place-items-center active:scale-95 disabled:opacity-50"
            title={copied === 'one' ? '已复制' : '复制主反击'}
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onCopyAll}
            disabled={loading}
            className="h-12 shrink-0 px-2.5 rounded-xl border border-white/10 bg-white/5 text-white/90 active:scale-95 disabled:opacity-50 text-[12px] whitespace-nowrap"
            title="复制对方 + 你的整段对话"
          >
            {copied === 'all' ? '已复制' : '全段'}
          </button>
          <button
            onClick={() => onRegenerate()}
            disabled={loading}
            aria-label="再来一句"
            className="h-12 w-12 shrink-0 rounded-xl border border-white/10 bg-white/5 text-white/90 grid place-items-center active:scale-95 disabled:opacity-50"
            title={loading ? '生成中…' : '再来一句'}
          >
            <Refresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() =>
              nav('/share', {
                state: { style, them: themMsg, me: reply.me, dialog: reply.dialog },
              })
            }
            disabled={loading}
            className="flex-1 h-12 rounded-xl bg-cta-gradient text-white font-heavy font-black flex items-center justify-center gap-1.5 shadow-glow active:scale-[0.98] disabled:opacity-60 whitespace-nowrap"
          >
            <Bolt className="w-5 h-5 shrink-0" />
            生成截图
          </button>
        </div>
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1.5">
      <span
        className="inline-block w-2 h-2 rounded-full bg-white/70 animate-float"
        style={{ animationDuration: '700ms' }}
      />
      <span
        className="inline-block w-2 h-2 rounded-full bg-white/70 animate-float"
        style={{ animationDelay: '120ms', animationDuration: '700ms' }}
      />
      <span
        className="inline-block w-2 h-2 rounded-full bg-white/70 animate-float"
        style={{ animationDelay: '240ms', animationDuration: '700ms' }}
      />
    </span>
  )
}
