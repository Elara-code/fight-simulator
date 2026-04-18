import { useEffect } from 'react'

const COLORS = ['#FF3B4D', '#FF7A45', '#3B82F6', '#8B5CF6', '#FFFFFF']

export default function Fireworks({
  label = '分享成功',
  onDone,
}: {
  label?: string
  onDone?: () => void
}) {
  useEffect(() => {
    if (!onDone) return
    const t = setTimeout(onDone, 1400)
    return () => clearTimeout(t)
  }, [onDone])

  const particles = Array.from({ length: 16 }).map((_, i) => {
    const angle = (i / 16) * Math.PI * 2
    const r = 80 + Math.random() * 20
    const dx = Math.cos(angle) * r
    const dy = Math.sin(angle) * r
    return { dx, dy, color: COLORS[i % COLORS.length], delay: Math.random() * 80 }
  })

  return (
    <div className="absolute inset-0 z-50 grid place-items-center pointer-events-none">
      <div className="relative">
        <div className="grid place-items-center w-20 h-20 rounded-full bg-cta-gradient shadow-glow animate-checkPop">
          <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5 9-10" />
          </svg>
        </div>
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full animate-fwParticle"
            style={
              {
                backgroundColor: p.color,
                '--dx': `${p.dx}px`,
                '--dy': `${p.dy}px`,
                animationDelay: `${p.delay}ms`,
                boxShadow: `0 0 10px ${p.color}`,
              } as React.CSSProperties
            }
          />
        ))}
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-4 text-center text-[13px] text-white/90 whitespace-nowrap">
          {label}
        </div>
      </div>
    </div>
  )
}
