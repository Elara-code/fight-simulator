import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type ToastTone = 'error' | 'success' | 'info'
type ToastItem = { id: number; message: string; tone: ToastTone }

type ToastCtx = {
  show: (message: string, tone?: ToastTone) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = ++idRef.current
    setItems((prev) => [...prev, { id, message, tone }])
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="fixed left-1/2 -translate-x-1/2 top-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {items.map((t) => (
          <ToastCard key={t.id} item={t} />
        ))}
      </div>
    </Ctx.Provider>
  )
}

function ToastCard({ item }: { item: ToastItem }) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 2800)
    return () => clearTimeout(t)
  }, [])
  const palette: Record<ToastTone, string> = {
    error: 'bg-red-500/15 border-red-400/40 text-red-100',
    success: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100',
    info: 'bg-white/10 border-white/15 text-white/90',
  }
  return (
    <div
      className={`pointer-events-auto max-w-[88vw] px-4 py-2 rounded-xl border backdrop-blur text-[13px] shadow-card
        transition-all duration-300 ${palette[item.tone]}
        ${leaving ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}
      `}
    >
      {item.message}
    </div>
  )
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
