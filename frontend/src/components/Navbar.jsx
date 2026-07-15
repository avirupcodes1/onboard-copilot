import { useState } from 'react'
import { LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import Logo from './Logo'

const ROLE_TONE = {
  admin: 'bg-purple-100 text-purple-700',
  mentor: 'bg-teal-100 text-teal-700',
  mentee: 'bg-indigo-100 text-indigo-700',
}
const AVATAR_TONE = {
  admin: 'bg-purple-600',
  mentor: 'bg-teal-600',
  mentee: 'bg-indigo-600',
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const initials = user.initials || user.name?.[0]?.toUpperCase() || '?'
  const roleLine = `${user.role}${user.team ? ` · ${user.team}` : ''}`

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* brand */}
        <div className="flex items-center gap-2.5">
          <Logo className="h-9 w-9 rounded-xl shadow-sm ring-1 ring-slate-900/5" />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight text-slate-900">OnboardCopilot</div>
            <div className="hidden text-xs text-slate-400 sm:block">AI onboarding assistant</div>
          </div>
        </div>

        {/* user menu */}
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 text-left shadow-sm transition hover:bg-slate-50"
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ${AVATAR_TONE[user.role] || 'bg-slate-600'}`}>
              {initials}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-medium text-slate-700">{user.name}</span>
              <span className="block text-[11px] capitalize text-slate-400">{roleLine}</span>
            </span>
            <ChevronDown size={15} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <>
              {/* click-away backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5"
              >
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${AVATAR_TONE[user.role] || 'bg-slate-600'}`}>
                    {initials}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <div className="truncate text-sm font-medium text-slate-800">{user.name}</div>
                    {user.email && <div className="truncate text-xs text-slate-400">{user.email}</div>}
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${ROLE_TONE[user.role] || 'bg-slate-100 text-slate-500'}`}>
                      {roleLine}
                    </span>
                  </div>
                </div>
                <button
                  role="menuitem"
                  onClick={() => {
                    setOpen(false)
                    logout()
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-red-600"
                >
                  <LogOut size={15} /> Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
