import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Back } from '../components/Icons'
import { deleteEntry, listEntries, type HistoryEntry } from '../lib/history'
import type { Relation } from '../lib/api'

const REL_LABEL: Record<Relation, string> = {
  couple: '💖 情侣',
  friend: '🧃 朋友',
  work: '💼 同事',
  family: '🏠 家人',
}

export default function HistoryPage() {
  const nav = useNavigate()
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  useEffect(() => {
    setEntries(listEntries())
  }, [])

  const onOpen = (e: HistoryEntry) => {
    nav('/result', {
      state: { entryId: e.id, text: e.text, rel: e.relation },
    })
  }

  const onDelete = (id: string) => {
    deleteEntry(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
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
        <h1 className="font-heavy font-black text-[17px]">历史战绩</h1>
        <span className="w-9 h-9" />
      </header>

      <section className="relative px-4 pt-2 pb-[120px]">
        {entries.length === 0 ? (
          <EmptyState onStart={() => nav('/')} />
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => {
              const preview = firstReplyPreview(e)
              return (
                <li key={e.id}>
                  <div className="rounded-2xl bg-card/80 backdrop-blur border border-white/5 p-4 shadow-card">
                    <div className="flex items-center justify-between text-[11px] text-muted">
                      <span>{REL_LABEL[e.relation]}</span>
                      <span>{formatDate(e.createdAt)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpen(e)}
                      className="mt-2 block w-full text-left active:opacity-80"
                    >
                      <div className="text-[13.5px] text-white/60 line-clamp-2">
                        <span className="text-white/40 mr-1">对方：</span>
                        {e.text}
                      </div>
                      {preview && (
                        <div className="mt-1.5 text-[13.5px] text-white/95 line-clamp-2">
                          <span className="text-primary mr-1">反击：</span>
                          {preview}
                        </div>
                      )}
                    </button>
                    <div className="mt-3 flex items-center justify-between text-[12px]">
                      <span className="text-muted">
                        已生成 {Object.keys(e.replies).length} 种风格
                      </span>
                      <button
                        onClick={() => onDelete(e.id)}
                        className="text-muted/80 hover:text-red-300 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function firstReplyPreview(e: HistoryEntry): string {
  const keys = Object.keys(e.replies) as Array<keyof typeof e.replies>
  for (const k of keys) {
    const r = e.replies[k]
    if (r?.me) return r.me.split('\n')[0]
  }
  return ''
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (sameDay) return `今天 ${hh}:${mm}`
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${mo}-${da} ${hh}:${mm}`
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="mt-16 grid place-items-center text-center px-6">
      <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 grid place-items-center text-3xl">
        🗂️
      </div>
      <h3 className="mt-4 font-heavy font-black text-[17px]">还没吵过架</h3>
      <p className="mt-1.5 text-[13px] text-muted">
        吵完的每一条会自动存在这里，随时可以翻出来
      </p>
      <button
        onClick={onStart}
        className="mt-6 h-11 px-5 rounded-xl bg-cta-gradient text-white font-heavy font-black shadow-glow active:scale-95"
      >
        去吵一架
      </button>
    </div>
  )
}
