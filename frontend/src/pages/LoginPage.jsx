import { useState } from 'react'
import { LogIn, UserRound, Users, Settings2, Loader2, ArrowLeft, ArrowRight } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import Logo from '../components/Logo'

const ROLES = [
  { key: 'mentee', label: 'Mentee', desc: 'Ask questions, track your onboarding tasks', email: 'jordan@northwind.example', icon: UserRound, tone: 'border-indigo-200 bg-indigo-50 hover:border-indigo-400', head: 'text-indigo-700', chip: 'bg-indigo-100 text-indigo-700', others: 'jordan@ · marcus@ · priyak@' },
  { key: 'mentor', label: 'Mentor', desc: 'Guide mentees, assign tasks, answer questions', email: 'sarah@northwind.example', icon: Users, tone: 'border-teal-200 bg-teal-50 hover:border-teal-400', head: 'text-teal-700', chip: 'bg-teal-100 text-teal-700', others: 'sarah@ · mike@ · priya@' },
  { key: 'admin', label: 'Admin', desc: 'Manage documents, people & knowledge gaps', email: 'admin@northwind.example', icon: Settings2, tone: 'border-purple-200 bg-purple-50 hover:border-purple-400', head: 'text-purple-700', chip: 'bg-purple-100 text-purple-700', others: 'admin@' },
]

export default function LoginPage({ onBack }) {
  const { login } = useAuth()
  const [role, setRole] = useState(null) // null = show role picker
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('password123')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const active = ROLES.find((r) => r.key === role)

  function pick(r) {
    setRole(r.key)
    setEmail(r.email)
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    if (!email) return
    setBusy(true)
    setError('')
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message || 'Login failed')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* header */}
        {role === null && onBack && (
          <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
            <ArrowLeft size={13} /> back to home
          </button>
        )}
        {role !== null && (
          <button onClick={() => setRole(null)} className="mb-4 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
            <ArrowLeft size={13} /> choose a different role
          </button>
        )}

        <div className="mb-6 text-center">
          <Logo className="mx-auto mb-3 h-14 w-14 rounded-2xl shadow-sm" />
          <h1 className="text-xl font-semibold">OnboardCopilot</h1>
          <p className="text-sm text-slate-400">
            {role === null ? 'Choose your role to sign in' : `Sign in as ${active.label}`}
          </p>
        </div>

        {/* Step 1: role tiles */}
        {role === null && (
          <div className="space-y-3">
            {ROLES.map((r) => (
              <button
                key={r.key}
                onClick={() => pick(r)}
                className={`flex w-full items-center gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition ${r.tone}`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${r.chip}`}>
                  <r.icon size={20} />
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-semibold ${r.head}`}>{r.label}</div>
                  <div className="text-xs text-slate-500">{r.desc}</div>
                </div>
                <ArrowRight size={16} className="text-slate-300" />
              </button>
            ))}
          </div>
        )}

        {/* Step 2: sign-in form */}
        {role !== null && (
          <>
            <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@northwind.example"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
              </div>
              {error && <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />} Sign in
              </button>
            </form>
            <p className="mt-3 text-center text-[11px] text-slate-400">
              Demo password: <code className="rounded bg-slate-100 px-1">password123</code> · other {active.label.toLowerCase()} logins: {active.others}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
