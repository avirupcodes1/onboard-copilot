import { useEffect, useRef, useState } from 'react'
import { Users, FileText, AlertTriangle, Search, Upload, Trash2, CheckCircle2, Loader2, MessageCircleQuestion, UserPlus } from 'lucide-react'
import { api } from '../api'

function Card({ title, subtitle, icon, children, right }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icon}</div>
          <div>
            <div className="text-sm font-semibold">{title}</div>
            {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
          </div>
        </div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`text-2xl font-semibold ${tone || 'text-slate-800'}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [q, setQ] = useState('')
  const [searchRes, setSearchRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', role: '', team: '', mentor_id: '' })
  const [addBusy, setAddBusy] = useState(false)
  const [addMsg, setAddMsg] = useState('')

  const load = () => api.adminOverview().then(setData).catch(() => {})
  useEffect(() => { load() }, [])

  async function submitAdd(e) {
    e.preventDefault()
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.mentor_id) {
      setAddMsg('Name, email and mentor are required.')
      return
    }
    setAddBusy(true)
    setAddMsg('')
    try {
      await api.addEmployee({ ...addForm, role: addForm.role.trim() || 'New Hire' })
      setAddForm({ name: '', email: '', role: '', team: '', mentor_id: '' })
      setShowAdd(false)
      await load()
    } catch (err) {
      setAddMsg(err.message)
    } finally {
      setAddBusy(false)
    }
  }

  const employees = data?.employees ?? []
  const mentors = data?.mentors ?? []
  const docs = data?.documents ?? []
  const gaps = data?.gaps ?? []
  const questions = data?.questions ?? []
  const mentorName = (id) => mentors.find((m) => m.id === id)?.name || '—'
  const avgProgress = employees.length ? Math.round(employees.reduce((s, e) => s + (e.progress || 0), 0) / employees.length) : 0
  const openGaps = gaps.filter((g) => g.status !== 'resolved').length

  async function onUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      await api.uploadDocument(file)
      await load()
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  async function runSearch(e) {
    e.preventDefault()
    if (!q.trim()) return
    setSearchRes(await api.search(q))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="new hires" value={employees.length} />
        <Stat label="avg progress" value={`${avgProgress}%`} tone="text-indigo-600" />
        <Stat label="documents" value={docs.length} />
        <Stat label="open KB gaps" value={openGaps} tone={openGaps ? 'text-amber-600' : 'text-slate-800'} />
      </div>

      <Card
        title="New hires"
        subtitle={`${employees.length} onboarding · ${mentors.length} mentors`}
        icon={<Users size={15} />}
        right={
          <button onClick={() => setShowAdd((v) => !v)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
            <UserPlus size={13} /> Add new hire
          </button>
        }
      >
        {showAdd && (
          <form onSubmit={submitAdd} className="mb-4 grid grid-cols-1 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2">
            <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Full name" className="rounded border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400" />
            <input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="Work email" className="rounded border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400" />
            <input value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })} placeholder="Job title (e.g. Software Engineer)" className="rounded border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400" />
            <input value={addForm.team} onChange={(e) => setAddForm({ ...addForm, team: e.target.value })} placeholder="Team (e.g. Engineering)" className="rounded border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400" />
            <select value={addForm.mentor_id} onChange={(e) => setAddForm({ ...addForm, mentor_id: e.target.value })} className="rounded border border-slate-200 px-2.5 py-1.5 text-sm sm:col-span-2">
              <option value="">Assign a mentor…</option>
              {mentors.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.team}</option>)}
            </select>
            <div className="flex items-center gap-3 sm:col-span-2">
              <button disabled={addBusy} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">
                {addBusy ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Add new hire
              </button>
              {addMsg && <span className="text-xs text-red-500">{addMsg}</span>}
              <span className="ml-auto text-[11px] text-slate-400">They can sign in with password <code className="rounded bg-white px-1">password123</code></span>
            </div>
          </form>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="pb-2">Name</th><th className="pb-2">Role</th><th className="pb-2">Mentor</th>
                <th className="pb-2">Tasks</th><th className="pb-2 w-40">Progress</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="py-2 font-medium text-slate-700">{e.name}</td>
                  <td className="py-2 text-slate-500">{e.role}</td>
                  <td className="py-2 text-slate-500">{mentorName(e.mentor_id)}</td>
                  <td className="py-2 text-slate-500">{e.tasks_done}/{e.tasks_total}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${e.progress}%` }} />
                      </div>
                      <span className="w-9 text-right text-[11px] text-slate-400">{e.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Knowledge base"
          subtitle={`${docs.length} documents · ${docs.reduce((s, d) => s + d.chunks, 0)} chunks`}
          icon={<FileText size={15} />}
          right={
            <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Upload
              <input ref={fileRef} type="file" accept=".md,.txt,.pdf" className="hidden" onChange={onUpload} />
            </label>
          }
        >
          <div className="space-y-1.5">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-slate-700">{d.title}</div>
                  <div className="text-xs text-slate-400">
                    {d.chunks} chunks
                    <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] ${d.source === 'seed' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>{d.source}</span>
                  </div>
                </div>
                <button onClick={async () => { await api.deleteDocument(d.id); load() }} className="text-slate-300 hover:text-red-500">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Knowledge gaps" subtitle="Questions the docs couldn't answer" icon={<AlertTriangle size={15} />}>
          {gaps.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">No gaps yet.</div>
          ) : (
            <div className="space-y-2">
              {gaps.map((g) => (
                <div key={g.id} className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-slate-800">{g.question}</div>
                    {g.status === 'resolved' ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-600"><CheckCircle2 size={12} /> resolved</span>
                    ) : (
                      <button onClick={async () => { await api.resolveGap(g.id); load() }} className="rounded border border-amber-300 px-2 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100">
                        mark resolved
                      </button>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{g.reason}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Retrieval explorer" subtitle="See what the hybrid index returns" icon={<Search size={15} />}>
          <form onSubmit={runSearch} className="mb-3 flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. password policy" className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400" />
            <button className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white">Search</button>
          </form>
          {searchRes && (
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">mode: {searchRes.mode}</div>
              {searchRes.results.map((r) => (
                <div key={r.chunk_id} className="rounded-lg border border-slate-100 p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">{r.doc_title} · {r.heading}</span>
                    <span className="font-mono text-slate-400">{r.score}</span>
                  </div>
                  <div className="mt-1 text-slate-500">{r.snippet}…</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Escalated questions" subtitle="Across all mentees" icon={<MessageCircleQuestion size={15} />}>
          {questions.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">None yet.</div>
          ) : (
            <div className="space-y-2">
              {questions.map((qq) => (
                <div key={qq.id} className="rounded-lg border border-slate-100 p-2.5">
                  <div className="text-sm font-medium text-slate-700">{qq.question}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {qq.mentee_name} →{' '}
                    <span className={qq.status === 'answered' ? 'text-emerald-600' : 'text-amber-600'}>{qq.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
