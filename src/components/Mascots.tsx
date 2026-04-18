type Props = { className?: string }

export function RedMascot({ className }: Props) {
  return (
    <svg viewBox="0 0 220 210" className={className} aria-hidden>
      <defs>
        <radialGradient id="rm-body" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FF9AB0" />
          <stop offset="55%" stopColor="#FF4D6D" />
          <stop offset="100%" stopColor="#C5163A" />
        </radialGradient>
      </defs>
      <path
        d="M30 110c0-48 36-82 82-82 46 0 80 32 82 78 1 16-4 28-4 40 0 10 6 18 6 26 0 6-6 10-14 8-14-3-24-12-36-12-12 0-22 6-38 6S78 168 64 168c-10 0-22 6-32 2-6-3-6-12-2-18 4-6 8-14 6-22-4-10-6-14-6-20z"
        fill="url(#rm-body)"
      />
      <path d="M168 30c8-4 18-2 24 6l-20 10c-2-6-6-12-4-16z" fill="#FFB703" />
      <path
        d="M70 96c6-10 22-10 28 0M122 96c6-10 22-10 28 0"
        stroke="#1a0712"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M86 132c8 6 18 8 28 8s20-2 28-8"
        stroke="#1a0712"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="58" cy="118" r="8" fill="#FF7A99" opacity=".7" />
      <circle cx="170" cy="118" r="8" fill="#FF7A99" opacity=".7" />
    </svg>
  )
}

export function BlueMascot({ className }: Props) {
  return (
    <svg viewBox="0 0 220 210" className={className} aria-hidden>
      <defs>
        <radialGradient id="bm-body" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#BFF6FF" />
          <stop offset="55%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#1E6FB8" />
        </radialGradient>
      </defs>
      <path
        d="M30 100c0-46 38-80 84-80 44 0 78 30 80 74 1 16-2 26-2 36 0 12 8 20 8 28 0 6-8 10-16 6-12-6-22-12-32-12-14 0-24 8-40 8s-34-8-48-8c-10 0-20 6-28 2-6-3-6-12-2-18 4-6 8-14 6-22-4-10-10-10-10-14z"
        fill="url(#bm-body)"
      />
      <path d="M46 26c10-4 20 2 22 12l-22 4c-2-6-4-12 0-16z" fill="#A855F7" />
      <path
        d="M70 96c6-10 22-10 28 0M122 96c6-10 22-10 28 0"
        stroke="#041327"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M86 136c10-6 22-6 28 0s18 6 28 0"
        stroke="#041327"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="58" cy="118" r="8" fill="#8EE7F7" opacity=".7" />
      <circle cx="170" cy="118" r="8" fill="#8EE7F7" opacity=".7" />
    </svg>
  )
}

export function Sparks({ className }: Props) {
  return (
    <svg viewBox="0 0 300 220" className={className} aria-hidden>
      <g stroke="#FFB703" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M30 40l14 14M14 80h18M40 120l-10 10" />
      </g>
      <g stroke="#FF4D6D" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M270 60l-14 14M286 100h-18M260 140l10 10" />
      </g>
      <g stroke="#00E5FF" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M150 10v14M60 200l10-10M240 200l-10-10" />
      </g>
    </svg>
  )
}
