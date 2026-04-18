import { PropsWithChildren } from 'react'

type Side = 'left' | 'right'
type Tone = 'neutral' | 'primary' | 'green'

export default function ChatBubble({
  side = 'left',
  tone = 'neutral',
  label,
  children,
}: PropsWithChildren<{ side?: Side; tone?: Tone; label?: string }>) {
  const isRight = side === 'right'
  const toneClass =
    tone === 'primary'
      ? 'bg-primary text-white'
      : tone === 'green'
        ? 'bg-[#95EC69] text-[#0b0f14]'
        : 'bg-white/[0.06] text-white/90'
  const radius = isRight
    ? 'rounded-2xl rounded-tr-sm'
    : 'rounded-2xl rounded-tl-sm'
  return (
    <div className={`flex ${isRight ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isRight && <Avatar tone={tone} />}
      <div className={`max-w-[78%] ${isRight ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {label && <span className="text-[11px] text-muted">{label}</span>}
        <div
          className={`${toneClass} ${radius} px-3.5 py-2.5 text-[14px] leading-snug shadow-card animate-pop`}
        >
          {children}
        </div>
      </div>
      {isRight && <Avatar tone={tone} right />}
    </div>
  )
}

function Avatar({ tone, right }: { tone: Tone; right?: boolean }) {
  const bg =
    tone === 'primary' || right
      ? 'bg-gradient-to-br from-primary to-[#C5163A]'
      : tone === 'green'
        ? 'bg-gradient-to-br from-[#95EC69] to-[#3AA34C]'
        : 'bg-gradient-to-br from-ai to-[#1E6FB8]'
  return (
    <div className={`${bg} w-7 h-7 rounded-xl shrink-0 grid place-items-center text-[11px] text-white/95 shadow-card`}>
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M8 10h.01M12 10h.01M16 10h.01" />
        <path d="M21 12a8 8 0 1 1-3.3-6.5L21 5l-1 3.5A8 8 0 0 1 21 12Z" />
      </svg>
    </div>
  )
}
