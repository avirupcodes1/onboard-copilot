import { useEffect, useState } from 'react'
import { api } from '../api'

// Minimal, user-facing status line. Dev details (version, chunk counts,
// retrieval mode, keys) intentionally not shown — hit /api/health for those.
export default function BackendStatus() {
  const [ok, setOk] = useState(null)

  useEffect(() => {
    let alive = true
    const poll = () =>
      api
        .health()
        .then(() => alive && setOk(true))
        .catch(() => alive && setOk(false))
    poll()
    const t = setInterval(poll, 30000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  if (ok === null) return null
  return (
    <footer className="mt-8 flex items-center justify-center gap-1.5 border-t border-slate-100 py-3 text-[11px] text-slate-400">
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {ok ? 'All systems operational' : 'Having trouble reaching the server — retrying…'}
      <span className="text-slate-300">· OnboardCopilot</span>
    </footer>
  )
}
