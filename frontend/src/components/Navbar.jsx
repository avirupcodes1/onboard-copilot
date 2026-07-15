import { LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import Logo from './Logo'

const ROLE_TONE = {
  admin: 'bg-purple-100 text-purple-700',
  mentor: 'bg-teal-100 text-teal-700',
  mentee: 'bg-indigo-100 text-indigo-700',
}

export default function Navbar() {
  const { user, logout } = useAuth()
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Logo className="h-10 w-10 rounded-xl shadow-sm" />
        <div>
          <h1 className="text-lg font-semibold">OnboardCopilot</h1>
          <p className="text-xs text-slate-400">RAG onboarding assistant · cites sources, escalates to a mentor when unsure</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
            {user.initials || user.name?.[0]}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-medium text-slate-700">{user.name}</div>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${ROLE_TONE[user.role] || 'bg-slate-100 text-slate-500'}`}>
              {user.role}
              {user.team ? ` · ${user.team}` : ''}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
        >
          <LogOut size={15} /> Log out
        </button>
      </div>
    </header>
  )
}
