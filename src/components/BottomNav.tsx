import { NavLink, useNavigate } from 'react-router-dom'
import { Chat, History, Home, Plus, User } from './Icons'

const tab = 'flex flex-col items-center gap-1 text-[11px] text-muted transition-colors'
const active = 'text-white'

export default function BottomNav() {
  const nav = useNavigate()
  return (
    <div className="absolute inset-x-0 bottom-0 z-20">
      <div className="mx-3 mb-3 rounded-2xl border border-white/5 bg-card/90 backdrop-blur-xl shadow-card">
        <div className="grid grid-cols-5 items-end px-2 py-2 safe-bottom">
          <NavLink to="/" end className={({ isActive }) => `${tab} ${isActive ? active : ''}`}>
            <Home className="w-5 h-5" />
            <span>首页</span>
          </NavLink>
          <NavLink to="/result" className={({ isActive }) => `${tab} ${isActive ? active : ''}`}>
            <Chat className="w-5 h-5" />
            <span>对吵</span>
          </NavLink>
          <button
            aria-label="新建"
            onClick={() => nav('/')}
            className="relative -mt-6 mx-auto h-12 w-12 rounded-full bg-cta-gradient text-white grid place-items-center shadow-glow active:scale-95 transition"
          >
            <Plus className="w-6 h-6" />
          </button>
          <NavLink to="/share" className={({ isActive }) => `${tab} ${isActive ? active : ''}`}>
            <History className="w-5 h-5" />
            <span>历史</span>
          </NavLink>
          <NavLink to="/me" className={({ isActive }) => `${tab} ${isActive ? active : ''}`}>
            <User className="w-5 h-5" />
            <span>我的</span>
          </NavLink>
        </div>
      </div>
    </div>
  )
}
