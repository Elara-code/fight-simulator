import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bolt, Copy, Share } from '../components/Icons'
import { useToast } from '../components/Toast'
import {
  ApiError,
  getChallenge,
  type Challenge,
  type TrainVerdict,
} from '../lib/api'
import { track } from '../lib/analytics'

const RELATION_LABEL: Record<string, string> = {
  couple: '情侣',
  friend: '朋友',
  work: '同事',
  family: '家人',
}

function verdictLabel(v: TrainVerdict): string {
  return v === 'win' ? '吵赢了' : v === 'lose' ? '吵输了' : '打平'
}

function compareLabel(challenger: number, opponent: number): string {
  if (opponent > challenger + 4) return 'TA 更胜一筹'
  if (challenger > opponent + 4) return '你守住了头名'
  return '不分伯仲'
}

export default function ChallengePage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const toast = useToast()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setError('链接不合法')
      setLoading(false)
      return
    }
    let cancelled = false
    getChallenge(id)
      .then((c) => {
        if (cancelled) return
        setChallenge(c)
        setError(null)
        track('challenge_view', {
          id: c.id,
          completed: c.opponentScore !== undefined,
        })
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

  const onAccept = () => {
    if (!challenge) return
    track('challenge_accept', { id: challenge.id })
    nav('/train', {
      state: {
        challenge: {
          id: challenge.id,
          opening: challenge.opening,
          relation: challenge.relation,
          challengerScore: challenge.challengerScore,
          challengerVerdict: challenge.challengerVerdict,
        },
      },
    })
  }

  const onCopyLink = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.show('链接已复制', 'success')
    } catch {
      toast.show('复制失败，请手动选中地址栏', 'error')
    }
  }

  const onNativeShare = async () => {
    if (!challenge) return
    const url = window.location.href
    const text = `我吵了一局，得了 ${challenge.challengerScore} 分。你来挑战看看？`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: '吵架模拟器 · 挑战', text, url })
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    } else {
      onCopyLink()
    }
  }

  return (
    <div className="relative min-h-dvh">
      <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_70%)]" />

      <header className="relative flex items-center justify-between px-4 pt-12 pb-3">
        <button
          onClick={() => nav('/')}
          className="flex items-center gap-1.5 text-white/80 active:scale-95"
          aria-label="回首页"
        >
          <Bolt className="w-4 h-4 text-accent" />
          <span className="text-sm font-heavy font-black">吵架模拟器</span>
        </button>
        <span className="text-[11px] text-muted">挑战</span>
      </header>

      <section className="relative px-4 pb-32">
        {loading && (
          <div className="mt-24 grid place-items-center text-muted text-[13px]">
            加载中…
          </div>
        )}

        {error && !loading && (
          <div className="mt-20 text-center px-6">
            <div className="text-5xl mb-3">🕳️</div>
            <h2 className="font-heavy font-black text-[18px]">{error}</h2>
            <p className="mt-2 text-[13px] text-muted">
              挑战链接 7 天后过期，过期就开新的一局吧。
            </p>
            <button
              onClick={() => nav('/train')}
              className="mt-6 h-11 px-5 rounded-xl bg-cta-gradient text-white font-heavy font-black shadow-glow active:scale-95"
            >
              我自己来一局
            </button>
          </div>
        )}

        {challenge && !error && (
          <>
            <div className="mt-2 rounded-2xl border border-white/10 bg-card/70 p-4">
              <div className="text-[11px] text-muted">
                关系 · {RELATION_LABEL[challenge.relation] ?? challenge.relation}
              </div>
              <div className="mt-1.5 text-[15px] text-white/95 leading-snug">
                对方说：「{challenge.opening}」
              </div>
            </div>

            {challenge.opponentScore === undefined ? (
              <PendingView
                challenge={challenge}
                onAccept={onAccept}
                onCopyLink={onCopyLink}
                onNativeShare={onNativeShare}
              />
            ) : (
              <CompletedView
                challenge={challenge}
                onCopyLink={onCopyLink}
                onTryYourself={() => nav('/train')}
              />
            )}
          </>
        )}
      </section>
    </div>
  )
}

function ScoreCard({
  score,
  verdict,
  label,
  highlight,
}: {
  score: number
  verdict: TrainVerdict
  label: string
  highlight?: boolean
}) {
  const tone =
    verdict === 'win'
      ? 'from-primary to-accent'
      : verdict === 'lose'
        ? 'from-slate-600 to-slate-800'
        : 'from-ai to-[#1E6FB8]'
  return (
    <div
      className={`rounded-2xl p-4 ${
        highlight
          ? 'border border-accent/40 bg-accent/5'
          : 'border border-white/10 bg-white/[0.04]'
      }`}
    >
      <div className="text-[11px] text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-heavy font-black text-[28px] leading-none font-num text-white">
          {score}
        </span>
        <span className="text-[11px] text-muted">/100</span>
      </div>
      <div
        className={`mt-2 inline-block px-2 py-0.5 rounded-md text-[11px] font-heavy font-black text-white bg-gradient-to-r ${tone}`}
      >
        {verdictLabel(verdict)}
      </div>
    </div>
  )
}

function PendingView({
  challenge,
  onAccept,
  onCopyLink,
  onNativeShare,
}: {
  challenge: Challenge
  onAccept: () => void
  onCopyLink: () => void
  onNativeShare: () => void
}) {
  return (
    <>
      <div className="mt-3 grid grid-cols-1 gap-2">
        <ScoreCard
          score={challenge.challengerScore}
          verdict={challenge.challengerVerdict}
          label="挑战发起人的成绩"
        />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-card/60 p-4">
        <div className="text-[14px] font-heavy font-black text-white">
          要不要来挑战这一局？
        </div>
        <p className="mt-1 text-[12px] text-muted leading-snug">
          点下面开吵，AI 用同样的开场白跟你硬刚 5 轮。
          完成后会自动比对你和发起人的得分。
        </p>
        <button
          onClick={onAccept}
          className="mt-3 w-full h-12 rounded-xl bg-cta-gradient text-white font-heavy font-black flex items-center justify-center gap-2 shadow-glow active:scale-[0.98]"
        >
          <Bolt className="w-5 h-5" />
          我来吵 · 接受挑战
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={onNativeShare}
          className="h-11 rounded-xl border border-white/10 bg-white/5 text-white/90 text-[13px] flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Share className="w-4 h-4" />
          再发给朋友
        </button>
        <button
          onClick={onCopyLink}
          className="h-11 rounded-xl border border-white/10 bg-white/5 text-white/90 text-[13px] flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Copy className="w-4 h-4" />
          复制链接
        </button>
      </div>
    </>
  )
}

function CompletedView({
  challenge,
  onCopyLink,
  onTryYourself,
}: {
  challenge: Challenge
  onCopyLink: () => void
  onTryYourself: () => void
}) {
  const challengerScore = challenge.challengerScore
  const opponentScore = challenge.opponentScore!
  const challengerHigher = challengerScore >= opponentScore

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <ScoreCard
          score={challengerScore}
          verdict={challenge.challengerVerdict}
          label="挑战发起人"
          highlight={challengerHigher}
        />
        <ScoreCard
          score={opponentScore}
          verdict={challenge.opponentVerdict!}
          label="挑战者"
          highlight={!challengerHigher}
        />
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-card/60 p-4 text-center">
        <div className="font-heavy font-black text-[18px] text-white">
          {compareLabel(challengerScore, opponentScore)}
        </div>
        <div className="mt-1 text-[12px] text-muted">
          差 {Math.abs(challengerScore - opponentScore)} 分
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          onClick={onCopyLink}
          className="h-12 rounded-xl border border-white/10 bg-white/5 text-white/90 text-[13px] flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Copy className="w-4 h-4" />
          复制链接
        </button>
        <button
          onClick={onTryYourself}
          className="h-12 rounded-xl bg-cta-gradient text-white font-heavy font-black text-[13px] shadow-glow active:scale-95"
        >
          我也开一局
        </button>
      </div>
    </>
  )
}
