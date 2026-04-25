import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Back, Bolt, Copy, Share } from '../components/Icons'
import { useToast } from '../components/Toast'
import {
  ApiError,
  completeChallenge,
  createChallenge,
  trainNext,
  type Relation,
  type StyleKey,
  type TrainMessage,
  type TrainTurn,
  type TrainVerdict,
} from '../lib/api'
import { track } from '../lib/analytics'

type Phase = 'setup' | 'active' | 'done'

type Setup = {
  relation: Relation
  opening: string
}

const RELATIONS: { key: Relation; label: string; emoji: string }[] = [
  { key: 'couple', label: '情侣', emoji: '💖' },
  { key: 'friend', label: '朋友', emoji: '🧃' },
  { key: 'work', label: '同事', emoji: '💼' },
  { key: 'family', label: '家人', emoji: '🏠' },
]

const QUICK_OPENINGS: { label: string; text: string; rel: Relation }[] = [
  { label: '对象不回消息', text: '没事别找我，有事发消息。', rel: 'couple' },
  { label: '老板抢功劳', text: '这次项目做得不错，辛苦大家配合我这个方案。', rel: 'work' },
  { label: '亲戚逼婚', text: '你再不结婚，以后没人要你。', rel: 'family' },
  { label: '朋友放鸽子', text: '抱歉啊，临时有点事，下次吧。', rel: 'friend' },
  { label: '家人贬低你', text: '你看看人家孩子，再看看你。', rel: 'family' },
]

const MAX_USER_TURNS = 5

function verdictLabel(v: TrainVerdict): string {
  return v === 'win' ? '吵赢了' : v === 'lose' ? '吵输了' : '打平'
}

type ChallengeContext = {
  id: string
  challengerScore: number
  challengerVerdict: TrainVerdict
}

type TrainLocState = {
  // Set when arriving from a challenge accept page; pre-fills the
  // opening + relation and starts the chat immediately.
  challenge?: {
    id: string
    opening: string
    relation: Relation
    challengerScore: number
    challengerVerdict: TrainVerdict
  }
}

type ChallengeShare = {
  status: 'idle' | 'creating' | 'created' | 'error'
  url?: string
}

export default function TrainPage() {
  const nav = useNavigate()
  const toast = useToast()
  const { state } = useLocation() as { state?: TrainLocState }
  const challenge = state?.challenge
  const [phase, setPhase] = useState<Phase>(challenge ? 'active' : 'setup')
  const [setup, setSetup] = useState<Setup>({
    relation: challenge?.relation ?? 'couple',
    opening: challenge?.opening ?? '',
  })
  const [history, setHistory] = useState<TrainMessage[]>(
    challenge ? [{ role: 'them', text: challenge.opening }] : [],
  )
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [share, setShare] = useState<ChallengeShare>({ status: 'idle' })
  // Once we POST our score back to a challenge we shouldn't do it twice.
  const challengeCompletedRef = useRef(false)
  const challengeContext: ChallengeContext | null = challenge
    ? {
        id: challenge.id,
        challengerScore: challenge.challengerScore,
        challengerVerdict: challenge.challengerVerdict,
      }
    : null
  const [result, setResult] = useState<{
    score: number
    verdict: 'win' | 'draw' | 'lose'
    feedback: string
  } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const userTurns = history.filter((m) => m.role === 'me').length
  const canStart = setup.opening.trim().length > 0 && !thinking
  const canSend =
    input.trim().length > 0 && !thinking && phase === 'active' && userTurns < MAX_USER_TURNS

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history, thinking])

  // When the user is finishing a challenge (not their own training session),
  // POST the score back to the server and jump to the comparison page so
  // they can see how they did vs. the challenger.
  useEffect(() => {
    if (phase !== 'done' || !result || !challengeContext) return
    if (challengeCompletedRef.current) return
    challengeCompletedRef.current = true
    completeChallenge(challengeContext.id, {
      opponentScore: result.score,
      opponentVerdict: result.verdict,
    })
      .then(() => {
        track('challenge_complete', {
          challenge_id: challengeContext.id,
          opponent_score: result.score,
          opponent_verdict: result.verdict,
          challenger_score: challengeContext.challengerScore,
        })
        nav(`/challenge/${challengeContext.id}`, { replace: true })
      })
      .catch((err) => {
        challengeCompletedRef.current = false
        const message =
          err instanceof ApiError ? err.message : '挑战结果提交失败，请重试'
        toast.show(message, 'error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, result])

  const start = () => {
    const opening = setup.opening.trim()
    if (!opening) return
    track('train_start', { relation: setup.relation, opening_len: opening.length })
    setHistory([{ role: 'them', text: opening }])
    setPhase('active')
  }

  const send = async () => {
    if (!canSend) return
    const mine = input.trim()
    setInput('')
    const nextHistory: TrainMessage[] = [...history, { role: 'me', text: mine }]
    setHistory(nextHistory)
    setThinking(true)
    track('train_turn', { turn: userTurns + 1 })
    try {
      const res: TrainTurn = await trainNext({
        opening: setup.opening,
        relation: setup.relation,
        history: nextHistory,
      })
      if (res.ended) {
        if (res.them && res.them.trim()) {
          setHistory((h) => [...h, { role: 'them', text: res.them as string }])
        }
        const score = res.score ?? 60
        const verdict = res.verdict ?? 'draw'
        const feedback = res.feedback ?? '这一局打完了。'
        setResult({ score, verdict, feedback })
        setPhase('done')
        track('train_end', {
          score,
          verdict,
          turns: userTurns + 1,
        })
      } else if (res.them) {
        setHistory((h) => [...h, { role: 'them', text: res.them as string }])
      }
    } catch (err) {
      // Roll back the optimistic user message so they can retry without losing draft.
      setHistory(history)
      setInput(mine)
      const code = err instanceof ApiError ? err.code : 'unknown'
      track('generate_error', { code, style: 'savage' as StyleKey, relation: setup.relation })
      const message = err instanceof ApiError ? err.message : '服务抽风了，请重试'
      toast.show(message, 'error')
    } finally {
      setThinking(false)
    }
  }

  const retry = () => {
    track('train_retry')
    setPhase('setup')
    setHistory([])
    setInput('')
    setResult(null)
    setShare({ status: 'idle' })
    challengeCompletedRef.current = false
  }

  const onChallengeFriend = async () => {
    if (!result || share.status === 'creating') return
    setShare({ status: 'creating' })
    try {
      const created = await createChallenge({
        opening: setup.opening,
        relation: setup.relation,
        challengerScore: result.score,
        challengerVerdict: result.verdict,
      })
      const url = `${window.location.origin}/challenge/${created.id}`
      setShare({ status: 'created', url })
      track('challenge_create', {
        score: result.score,
        verdict: result.verdict,
      })
      // Try the native share sheet first; fall back to clipboard if the
      // browser doesn't support it (Safari desktop, some Android WebViews).
      const text = `我吵了一局得了 ${result.score} 分（${verdictLabel(result.verdict)}）。你来挑战看看？`
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: '吵架模拟器 · 挑战', text, url })
          track('challenge_share', { method: 'native' })
          return
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
        }
      }
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        toast.show('挑战链接已复制，可以发给朋友了', 'success')
        track('challenge_share', { method: 'clipboard' })
      } catch {
        toast.show('已生成链接，请长按上方链接手动复制', 'info')
      }
    } catch (err) {
      setShare({ status: 'error' })
      const message =
        err instanceof ApiError ? err.message : '生成挑战链接失败，请重试'
      toast.show(message, 'error')
    }
  }

  const saveAsReplay = () => {
    // Compose history into the replay format used by SharePage.
    const them = setup.opening
    const myTurns = history.filter((m) => m.role === 'me').map((m) => m.text)
    const themFollowUps = history
      .filter((m) => m.role === 'them')
      .slice(1) // drop opening
      .map((m) => m.text)
    if (!myTurns.length) return
    const me = myTurns[0] ?? ''
    const dialog: { them: string; me: string }[] = []
    for (let i = 0; i < themFollowUps.length; i++) {
      const meReply = myTurns[i + 1]
      if (!meReply) break
      dialog.push({ them: themFollowUps[i], me: meReply })
    }
    track('train_save', { turns: myTurns.length })
    nav('/share', {
      state: {
        them,
        me,
        dialog: dialog.slice(0, 4),
        style: 'savage' as StyleKey,
      },
    })
  }

  return (
    <div className="relative min-h-dvh flex flex-col">
      <header className="relative flex items-center justify-between px-4 pt-12 pb-3 shrink-0">
        <button
          onClick={() => (phase === 'setup' ? nav(-1) : retry())}
          className="w-9 h-9 grid place-items-center rounded-xl bg-white/5 border border-white/10 active:scale-95"
          aria-label={phase === 'setup' ? '返回' : '重开一局'}
        >
          <Back className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-[17px]">🥊</span>
          <h1 className="font-heavy font-black text-[17px]">训练模式</h1>
        </div>
        <div className="w-9 h-9" aria-hidden />
      </header>

      {phase === 'setup' && (
        <SetupView
          setup={setup}
          setSetup={setSetup}
          canStart={canStart}
          onStart={start}
        />
      )}

      {(phase === 'active' || phase === 'done') && (
        <ChatView
          scrollRef={scrollRef}
          history={history}
          thinking={thinking}
          userTurns={userTurns}
        />
      )}

      {phase === 'active' && (
        <ComposeBar
          input={input}
          setInput={setInput}
          canSend={canSend}
          onSend={send}
          remaining={MAX_USER_TURNS - userTurns}
          thinking={thinking}
        />
      )}

      {phase === 'done' && result && (
        <ResultBar
          result={result}
          onRetry={retry}
          onSave={saveAsReplay}
          canSave={history.filter((m) => m.role === 'me').length > 0}
          onChallenge={onChallengeFriend}
          share={share}
          inChallenge={!!challengeContext}
        />
      )}
    </div>
  )
}

function SetupView({
  setup,
  setSetup,
  canStart,
  onStart,
}: {
  setup: Setup
  setSetup: (s: Setup) => void
  canStart: boolean
  onStart: () => void
}) {
  return (
    <section className="relative px-5 pt-2 pb-6 flex-1">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="text-[13px] text-white/80 font-heavy font-black">
          选一句让你憋屈的话
        </div>
        <div className="text-[11.5px] text-muted mt-1">
          AI 会扮演对方一直怼你，你最多回 {MAX_USER_TURNS} 轮。结束给分。
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {RELATIONS.map((r) => {
            const on = r.key === setup.relation
            return (
              <button
                key={r.key}
                onClick={() => setSetup({ ...setup, relation: r.key })}
                className={`h-8 px-3 rounded-full border text-[12.5px] transition-all ${
                  on
                    ? 'border-primary/60 bg-primary/15 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:text-white'
                }`}
              >
                <span className="mr-1">{r.emoji}</span>
                {r.label}
              </button>
            )
          })}
        </div>

        <textarea
          value={setup.opening}
          onChange={(e) => setSetup({ ...setup, opening: e.target.value })}
          rows={3}
          placeholder="把对方说的那句话贴进来…"
          aria-label="对方的开场白"
          className="mt-3 w-full resize-none rounded-xl bg-black/30 border border-white/10 p-3 text-[14px] placeholder:text-muted/80 outline-none"
        />
      </div>

      <div className="mt-4 text-[12px] text-white/70 font-heavy font-black px-1">
        常见场景
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {QUICK_OPENINGS.map((q) => (
          <button
            key={q.label}
            onClick={() => setSetup({ relation: q.rel, opening: q.text })}
            className="text-left p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] active:scale-[0.98] transition"
          >
            <div className="text-[12.5px] font-heavy font-black text-white/95">
              {q.label}
            </div>
            <div className="text-[11px] text-muted line-clamp-2 mt-0.5 leading-tight">
              {q.text}
            </div>
          </button>
        ))}
      </div>

      <button
        disabled={!canStart}
        onClick={onStart}
        className={`mt-6 w-full h-14 rounded-2xl font-heavy font-black text-[17px] flex items-center justify-center gap-2 transition-all ${
          canStart
            ? 'bg-cta-gradient text-white shadow-glow animate-pulseGlow active:scale-[0.98]'
            : 'bg-white/5 text-white/50 cursor-not-allowed'
        }`}
      >
        <Bolt className="w-5 h-5" />
        开始训练
      </button>
    </section>
  )
}

function ChatView({
  scrollRef,
  history,
  thinking,
  userTurns,
}: {
  scrollRef: React.RefObject<HTMLDivElement>
  history: TrainMessage[]
  thinking: boolean
  userTurns: number
}) {
  return (
    <section
      ref={scrollRef}
      className="relative flex-1 overflow-y-auto px-4 pb-4"
    >
      <div className="mx-auto max-w-xl rounded-[22px] bg-[#ECECEC] p-4 shadow-card space-y-3 min-h-[60vh]">
        <div className="text-center text-[11px] text-black/50 pb-1">
          第 {userTurns} / {MAX_USER_TURNS} 轮
        </div>
        {history.map((m, i) => (
          <Row key={i} side={m.role === 'them' ? 'left' : 'right'} text={m.text} />
        ))}
        {thinking && <Row side="left" text="…" typing />}
      </div>
    </section>
  )
}

function ComposeBar({
  input,
  setInput,
  canSend,
  onSend,
  remaining,
  thinking,
}: {
  input: string
  setInput: (v: string) => void
  canSend: boolean
  onSend: () => void
  remaining: number
  thinking: boolean
}) {
  return (
    <div className="sticky bottom-0 left-0 right-0 px-4 pb-5 pt-3 bg-gradient-to-t from-bg via-bg/95 to-transparent">
      <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
          rows={1}
          placeholder={remaining > 0 ? '打出你的反击…（Enter 发送）' : '已达上限'}
          disabled={remaining <= 0}
          aria-label="我的回击"
          className="flex-1 resize-none bg-transparent text-[14px] placeholder:text-muted/80 outline-none max-h-28 py-2 px-2"
        />
        <button
          onClick={onSend}
          disabled={!canSend}
          className={`h-10 px-4 rounded-xl font-heavy font-black text-[13px] flex items-center gap-1 transition-all ${
            canSend
              ? 'bg-cta-gradient text-white shadow-glow active:scale-95'
              : 'bg-white/10 text-white/50 cursor-not-allowed'
          }`}
        >
          {thinking ? '等他…' : '怼'}
        </button>
      </div>
      <div className="mt-2 text-center text-[11px] text-muted">
        还剩 {remaining} 轮 · 说到他哑口无言就赢了
      </div>
    </div>
  )
}

function ResultBar({
  result,
  onRetry,
  onSave,
  canSave,
  onChallenge,
  share,
  inChallenge,
}: {
  result: { score: number; verdict: TrainVerdict; feedback: string }
  onRetry: () => void
  onSave: () => void
  canSave: boolean
  onChallenge: () => void
  share: ChallengeShare
  inChallenge: boolean
}) {
  const label = verdictLabel(result.verdict)
  const tone =
    result.verdict === 'win'
      ? 'from-primary to-accent'
      : result.verdict === 'lose'
        ? 'from-slate-600 to-slate-800'
        : 'from-ai to-[#1E6FB8]'
  // In a friend's challenge attempt the result auto-completes server-side
  // and the route swaps to /challenge/:id, so this bar appears only briefly
  // during that transition. Show a minimal "正在提交结果…" status instead
  // of confusing buttons.
  if (inChallenge) {
    return (
      <div className="sticky bottom-0 left-0 right-0 px-4 pb-6 pt-4 bg-gradient-to-t from-bg via-bg/95 to-transparent">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
          <div
            className={`mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br ${tone} grid place-items-center font-heavy font-black text-white shadow-card`}
          >
            <div className="text-center leading-none">
              <div className="text-[22px]">{result.score}</div>
              <div className="text-[9px] opacity-80 mt-0.5">/100</div>
            </div>
          </div>
          <div className="mt-2 font-heavy font-black text-[16px]">{label}</div>
          <div className="text-[12px] text-muted leading-snug mt-1">
            正在提交挑战结果…
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="sticky bottom-0 left-0 right-0 px-4 pb-6 pt-4 bg-gradient-to-t from-bg via-bg/95 to-transparent">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tone} grid place-items-center font-heavy font-black text-white shadow-card`}
          >
            <div className="text-center leading-none">
              <div className="text-[22px]">{result.score}</div>
              <div className="text-[9px] opacity-80 mt-0.5">/100</div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-heavy font-black text-[17px]">{label}</div>
            <div className="text-[12px] text-muted leading-snug mt-0.5">
              {result.feedback}
            </div>
          </div>
        </div>

        <button
          onClick={onChallenge}
          disabled={share.status === 'creating'}
          className="mt-4 w-full h-12 rounded-xl bg-share-gradient text-white font-heavy font-black text-[14px] shadow-glowAi active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Share className="w-4 h-4" />
          {share.status === 'creating'
            ? '生成挑战链接中…'
            : share.status === 'created'
              ? '再分享一次'
              : '发给朋友挑战这局'}
        </button>
        {share.status === 'created' && share.url && (
          <div className="mt-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 flex items-center gap-2">
            <Copy className="w-3.5 h-3.5 text-muted shrink-0" />
            <span className="text-[11.5px] text-white/70 truncate flex-1">
              {share.url}
            </span>
          </div>
        )}

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={onRetry}
            className="h-12 rounded-xl border border-white/10 bg-white/5 text-white font-heavy font-black text-[14px] active:scale-95"
          >
            再来一局
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="h-12 rounded-xl bg-cta-gradient text-white font-heavy font-black text-[14px] shadow-glow active:scale-95 disabled:opacity-60"
          >
            保存战绩
          </button>
        </div>
      </div>
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
    <div className={`flex ${right ? 'justify-end' : 'justify-start'} items-start gap-2`}>
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
      {right && <MeAva />}
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

function MeAva() {
  return (
    <div className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-ai to-[#1E6FB8] grid place-items-center text-white shadow">
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    </div>
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
