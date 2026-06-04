import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Back, Bolt } from '../components/Icons'
import { useToast } from '../components/Toast'
import {
  clearUserAvatar,
  getUserAvatar,
  onUserAvatarChange,
  setUserAvatarFromFile,
} from '../lib/avatar'

export default function MePage() {
  const nav = useNavigate()
  const toast = useToast()
  const [avatar, setAvatar] = useState<string | null>(() => getUserAvatar())
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => onUserAvatarChange(setAvatar), [])

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      await setUserAvatarFromFile(file)
      toast.show('头像已保存', 'success')
    } catch (err) {
      toast.show(err instanceof Error ? err.message : '头像设置失败', 'error')
    }
  }

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
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-14 h-14 rounded-2xl overflow-hidden grid place-items-center shadow-glow active:scale-95 bg-cta-gradient"
            aria-label="上传或更换头像"
          >
            {avatar ? (
              <img src={avatar} alt="我的头像" className="w-full h-full object-cover" />
            ) : (
              <Bolt className="w-7 h-7 text-white" />
            )}
            <span className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] py-0.5 text-center">
              {avatar ? '更换' : '上传'}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickAvatar}
          />
          <div className="min-w-0 flex-1">
            <div className="font-heavy font-black text-[18px]">吵架大师</div>
            <div className="text-[12px] text-muted mt-0.5 truncate">
              {avatar ? '截图里「我」用你的头像' : '点左边头像上传，截图里就是你'}
            </div>
            {avatar && (
              <button
                onClick={() => {
                  clearUserAvatar()
                  toast.show('已恢复默认头像', 'success')
                }}
                className="mt-1 text-[11px] text-muted/80 underline underline-offset-2 active:text-white"
              >
                清除头像
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-card/60 border border-white/5 divide-y divide-white/5 overflow-hidden">
          <Row label="🥊 训练模式" value="练一练" onClick={() => nav('/train')} />
          <Row label="🏆 吵架榜" value="看别人怎么吵" onClick={() => nav('/feed')} />
          <Row label="历史战绩" value="查看" onClick={() => nav('/history')} />
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
