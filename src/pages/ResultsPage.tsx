import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Back, Bolt, Refresh, Share } from '../components/Icons'
import ChatBubble from '../components/ChatBubble'

type StyleKey = 'logic' | 'sarcasm' | 'savage' | 'calm'

const STYLES: { key: StyleKey; label: string; icon: string }[] = [
  { key: 'logic', label: '逻辑碾压', icon: '🔥' },
  { key: 'sarcasm', label: '阴阳怪气', icon: '😏' },
  { key: 'savage', label: '爽文反击', icon: '⚡' },
  { key: 'calm', label: '冷静终结', icon: '🧊' },
]

const DIALOGS: Record<StyleKey, { me: string; them: string[]; replies: string[] }> = {
  logic: {
    me: '敷衍？是你先把我当背景板的。\n我一直在回应，你却在习惯性忽视。\n如果不在乎，就别来要求我理解。',
    them: ['你怎么突然这么敏感？', '那你想怎么样？'],
    replies: [
      '敏感？你迟到三次我都没说什么，\n这次只是想让你意识到我的感受。',
      '从现在开始，尊重是基本的。',
    ],
  },
  sarcasm: {
    me: '哦~原来你在乎啊？\n我还以为空气比我更重要呢。',
    them: ['别这么阴阳好吗？', '我只是最近有点忙。'],
    replies: [
      '忙到回消息需要三天？\n那我下次用飞鸽传书好了。',
      '忙不是借口，是选择。',
    ],
  },
  savage: {
    me: '你不回我消息，是手断了还是网断了？\n两样都没断，那就是心断了。',
    them: ['别说得这么难听。', '我错了还不行吗？'],
    replies: [
      '难听的不是我的话，是你的行为。',
      '认错容易，改才难。',
    ],
  },
  calm: {
    me: '我理解你最近忙，但忽视是有代价的。\n我们可以聊聊怎么改善。',
    them: ['好，我们谈谈。'],
    replies: ['谢谢。先听你说。'],
  },
}

export default function ResultsPage() {
  const nav = useNavigate()
  const { state } = useLocation() as { state?: { text?: string } }
  const [style, setStyle] = useState<StyleKey>('logic')
  const themMsg = state?.text?.trim() || '你最近怎么这么敷衍我？'

  const dialog = useMemo(() => DIALOGS[style], [style])

  return (
    <div className="relative min-h-dvh">
      <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_70%)]" />

      <header className="relative flex items-center justify-between px-4 pt-12 pb-3">
        <button
          onClick={() => nav(-1)}
          className="w-9 h-9 grid place-items-center rounded-xl bg-white/5 border border-white/10 active:scale-95"
        >
          <Back className="w-5 h-5" />
        </button>
        <h1 className="font-heavy font-black text-[17px]">吵架结果</h1>
        <button
          onClick={() => nav('/share', { state: { style, them: themMsg, me: dialog.me } })}
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
                onClick={() => setStyle(s.key)}
                className={`h-9 px-3.5 rounded-full border text-[13px] flex items-center gap-1 transition-all ${
                  on
                    ? 'border-transparent bg-cta-gradient text-white shadow-glowOrange'
                    : 'border-white/10 bg-white/5 text-white/70'
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Conversation */}
      <section className="relative px-4 mt-3 space-y-3">
        <ChatBubble side="left" label="对方">
          {themMsg}
        </ChatBubble>
        <ChatBubble side="right" tone="primary" label="你（反击）">
          <div className="whitespace-pre-line">{dialog.me}</div>
        </ChatBubble>

        <div className="pt-2 text-[12px] text-muted flex items-center gap-2">
          <span className="h-px flex-1 bg-white/10" />
          对吵模拟
          <span className="h-px flex-1 bg-white/10" />
        </div>

        {dialog.them.map((t, i) => (
          <div key={i} className="space-y-3">
            <ChatBubble side="left" label="对方">
              {t}
            </ChatBubble>
            {dialog.replies[i] && (
              <ChatBubble side="right" tone="primary">
                <div className="whitespace-pre-line">{dialog.replies[i]}</div>
              </ChatBubble>
            )}
          </div>
        ))}
      </section>

      {/* Bottom actions */}
      <div className="sticky bottom-[92px] mt-6 px-4">
        <div className="rounded-2xl bg-card/85 backdrop-blur border border-white/5 p-3 flex items-center gap-3 shadow-card">
          <button
            onClick={() => setStyle((prev) => prev)}
            className="h-12 px-4 rounded-xl border border-white/10 bg-white/5 text-white/90 flex items-center gap-2 active:scale-[0.98]"
          >
            <Refresh className="w-4 h-4" />
            重新生成
          </button>
          <button
            onClick={() => nav('/share', { state: { style, them: themMsg, me: dialog.me } })}
            className="flex-1 h-12 rounded-xl bg-cta-gradient text-white font-heavy font-black flex items-center justify-center gap-2 shadow-glow active:scale-[0.99]"
          >
            <Bolt className="w-5 h-5" />
            去截图分享
          </button>
        </div>
      </div>
    </div>
  )
}
