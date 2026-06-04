import { useNavigate } from 'react-router-dom'
import { Bolt } from '../components/Icons'
import { t } from '../i18n'

export default function NotFoundPage() {
  const nav = useNavigate()
  const s = t().notFound
  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_70%)]" />

      <div className="relative">
        <div className="font-heavy font-black text-[96px] leading-none title-skew bg-cta-gradient bg-clip-text text-transparent">
          {s.code}
        </div>
        <h2 className="mt-2 font-heavy font-black text-[22px]">{s.title}</h2>
        <p className="mt-2 text-[13px] text-muted max-w-xs whitespace-pre-line">
          {s.body}
        </p>

        <button
          onClick={() => nav('/', { replace: true })}
          className="mt-7 h-12 px-5 rounded-xl bg-cta-gradient text-white font-heavy font-black flex items-center gap-2 mx-auto shadow-glow active:scale-95"
        >
          <Bolt className="w-5 h-5" />
          {s.back}
        </button>
      </div>
    </div>
  )
}
