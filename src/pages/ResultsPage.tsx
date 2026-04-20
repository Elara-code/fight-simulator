import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Back, Bolt, Copy, Refresh, Share } from '../components/Icons'
import ChatBubble from '../components/ChatBubble'
import { useToast } from '../components/Toast'
import { ApiError, generateReply, type Relation, type Reply, type StyleKey } from '../lib/api'
import {
  getEntry,
  newId,
  updateReplies,
  upsertEntry,
  type HistoryEntry,
} from '../lib/history'

const STYLES: { key: StyleKey; label: string; icon: string }[] = [
  { key: 'savage', label: '爽文反击', icon: '⚡' },
  { key: 'logic', label: '逻辑碾压', icon: '🔥' },
  { key: 'sarcasm', label: '阴阳怪气', icon: '😏' },
  { key: 'calm', label: '冷静终结', icon: '🧊' },
]

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
}

type LocState = {
  text?: string
  rel?: Relation
  reply?: Reply
  style?: StyleKey
  entryId?: string
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

  const fetchStyle = async (target: StyleKey, force = false) => {
    if (!force && cacheRef.current[target]) {
      setReply(cacheRef.current[target]!)
      setError(null)
      return
    }
    if (isDemo && !force) {
      setReply(FALLBACK[target])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await generateReply({
        text: themMsg,
        relation,
        style: target,
      })
      cacheRef.current[target] = r
      setReply(r)
      persistEntry({ [target]: r })
    } catch (err) {
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
      setCopied('all')
      toast.show('整段对话已复制', 'success')
      setTimeout(() => setCopied(null), 1200)
    } else {
      toast.show('复制失败，请手动长按选中', 'error')
    }
  }

  const onRegenerate = () => {
    delete cacheRef.current[style]
    fetchStyle(style, true)
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
              state: { style, them: themMsg, me: reply.me, dialog: reply.dialog },
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
                onClick={() => setStyle(s.key)}
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
            onClick={onRegenerate}
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

      {/* Conversation — key 强制每次换风格/重新生成都重播卡片爆出动画 */}
      <section
        key={`${style}-${loading ? 'l' : reply.me.slice(0, 6)}`}
        className={`relative px-4 mt-3 space-y-3 transition-opacity duration-300 ${
          loading ? 'opacity-60 animate-pulse' : 'opacity-100'
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
                {loading ? (
                  <div className="flex items-center gap-2">
                    <TypingDots />
                    <span className="text-[12px] text-white/60">
                      正在想一句更狠的…
                    </span>
                  </div>
                ) : (
                  <div className="whitespace-pre-line">{reply.me}</div>
                )}
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
      </section>

      {/* Bottom actions */}
      <div className="sticky bottom-[92px] mt-6 px-4">
        <div className="rounded-2xl bg-card/85 backdrop-blur border border-white/5 p-3 flex items-center gap-2 shadow-card">
          <button
            onClick={onCopyOne}
            disabled={loading}
            className="h-12 px-3 rounded-xl border border-white/10 bg-white/5 text-white/90 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="复制主反击"
          >
            <Copy className="w-4 h-4" />
            {copied === 'one' ? '已复制' : '复制'}
          </button>
          <button
            onClick={onCopyAll}
            disabled={loading}
            className="h-12 px-3 rounded-xl border border-white/10 bg-white/5 text-white/90 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 text-[13px]"
            title="复制对方+你的整段对话"
          >
            {copied === 'all' ? '已复制' : '复制全段'}
          </button>
          <button
            onClick={onRegenerate}
            disabled={loading}
            className="h-12 px-3 rounded-xl border border-white/10 bg-white/5 text-white/90 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="再来一句"
          >
            <Refresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '生成中…' : '再来一句'}
          </button>
          <button
            onClick={() =>
              nav('/share', {
                state: { style, them: themMsg, me: reply.me, dialog: reply.dialog },
              })
            }
            disabled={loading}
            className="flex-1 h-12 rounded-xl bg-cta-gradient text-white font-heavy font-black flex items-center justify-center gap-1.5 shadow-glow active:scale-[0.98] disabled:opacity-60"
          >
            <Bolt className="w-5 h-5" />
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
