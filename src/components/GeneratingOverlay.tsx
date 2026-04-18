import { useEffect, useState } from 'react'
import { BlueMascot, RedMascot } from './Mascots'

const LINES = [
  '正在帮你想更狠的回复…',
  '把她的话拆成三段在骂…',
  '翻旧账中，别急…',
  '冷静一下，开始反击…',
]

export default function GeneratingOverlay({ onDone }: { onDone: () => void }) {
  const [line, setLine] = useState(LINES[0])

  useEffect(() => {
    const id = setInterval(() => {
      setLine(LINES[Math.floor(Math.random() * LINES.length)])
    }, 650)
    const timer = setTimeout(onDone, 1700)
    return () => {
      clearInterval(id)
      clearTimeout(timer)
    }
  }, [onDone])

  return (
    <div className="absolute inset-0 z-40 bg-bg/85 backdrop-blur-md grid place-items-center animate-pop">
      <div className="relative w-[260px] h-[200px]">
        {/* 中心闪电/火花 */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="w-24 h-24 rounded-full bg-[conic-gradient(from_180deg,rgba(255,122,69,.45),rgba(255,59,77,.45),rgba(139,92,246,.45),rgba(59,130,246,.45),rgba(255,122,69,.45))] blur-lg animate-sparkBurst" />
        </div>
        {/* 两只对撞 */}
        <div className="absolute left-0 top-5 w-24 animate-clashLeft">
          <RedMascot className="w-full drop-shadow-[0_10px_20px_rgba(255,59,77,0.5)]" />
        </div>
        <div className="absolute right-0 top-5 w-24 animate-clashRight">
          <BlueMascot className="w-full drop-shadow-[0_10px_20px_rgba(59,130,246,0.45)]" />
        </div>
        {/* 小闪电图形 */}
        <svg viewBox="0 0 260 200" className="absolute inset-0 w-full h-full pointer-events-none">
          <g stroke="#FF7A45" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9">
            <path d="M120 60 L135 90 L120 95 L140 130" />
          </g>
          <g stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9">
            <path d="M150 70 L135 100 L150 105 L130 140" />
          </g>
        </svg>
      </div>
      <div className="absolute bottom-24 left-0 right-0 px-8">
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-cta-gradient animate-[clashLeft_1.6s_ease-in-out_infinite]" />
        </div>
        <p className="mt-4 text-center text-[14px] text-white/85">{line}</p>
      </div>
    </div>
  )
}
