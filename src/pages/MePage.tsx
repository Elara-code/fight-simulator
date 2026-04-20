import { useNavigate } from 'react-router-dom'
import { Back, Bolt } from '../components/Icons'

export default function MePage() {
  const nav = useNavigate()

  return (
    <div className="relative min-h-dvh">
      <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_70%)]" />

      <header className="relative flex items-center justify-between px-4 pt-12 pb-3">
        <button
          onClick={() => nav(-1)}
          className="w-9 h-9 grid place-items-center rounded-xl bg-white/5 border border-white/10 active:scale-95"
          aria-label="返回"
        >
          <Back className="w-5 h-5" />
        </button>
        <h1 className="font-heavy font-black text-[17px]">我的</h1>
        <span className="w-9 h-9" />
      </header>

      <section className="relative px-5 pt-4">
        <div className="rounded-2xl bg-card/80 backdrop-blur border border-white/5 p-5 shadow-card flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cta-gradient grid place-items-center shadow-glow">
            <Bolt className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="font-heavy font-black text-[18px]">吵架大师</div>
            <div className="text-[12px] text-muted mt-0.5">本地使用 · 无需登录</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-card/60 border border-white/5 divide-y divide-white/5 overflow-hidden">
          <Row label="历史战绩" value="即将上线" onClick={() => nav('/history')} />
          <Row label="反馈问题" value="GitHub Issues" href="https://github.com/elara-code/fight-simulator/issues" />
          <Row label="关于" value="v0.1" />
        </div>

        <p className="mt-6 text-center text-[11px] text-muted">
          吵架模拟器 · 把没吵赢的架，重新吵赢一遍
        </p>
      </section>
    </div>
  )
}

function Row({
  label,
  value,
  onClick,
  href,
}: {
  label: string
  value: string
  onClick?: () => void
  href?: string
}) {
  const content = (
    <div className="flex items-center justify-between px-4 py-3.5 text-[14px]">
      <span className="text-white/90">{label}</span>
      <span className="text-muted text-[12.5px]">{value} ›</span>
    </div>
  )
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="block active:bg-white/5"
      >
        {content}
      </a>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left active:bg-white/5 disabled:opacity-60"
    >
      {content}
    </button>
  )
}
