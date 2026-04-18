import { PropsWithChildren } from 'react'
import BottomNav from './BottomNav'

export default function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-dvh flex justify-center bg-bg text-white">
      {/* Phone-sized container on desktop, edge-to-edge on mobile */}
      <div className="relative w-full max-w-[430px] min-h-dvh overflow-hidden bg-bg">
        <div className="pointer-events-none absolute inset-0 bg-radial-spot" />
        <div className="relative z-10 min-h-dvh pb-[92px]">{children}</div>
        <BottomNav />
      </div>
    </div>
  )
}
