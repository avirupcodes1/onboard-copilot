import { useCallback, useEffect, useState } from 'react'
import { Users, MessageCircleQuestion, Wand2, Plus, Send, Loader2, CheckCircle2, ClipboardList, ChevronDown } from 'lucide-react'
import { api } from '../api'
import TaskList from '../components/TaskList'

function Card({ title, subtitle, icon, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icon}</div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function MenteeCard({ m, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'Learning', estimated_time: '30 min' })
  const tasks = m.tasks || []

  async function generate() {
    setBusy(true)
    setMsg('')
    try {
      const r = await api.generateTasks(m.id)
      setMsg(r.message)
      setShowTasks(true) // show the mentee's list so the new tasks are visible
      onChanged?.()
    } catch (e) {
      setMsg(`⚠️ ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function assign(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setBusy(true)
    try {
      await api.assignTask({ mentee_id: m.id, ...form })
      setForm({ title: '', description: '', category: 'Learning', estimated_time: '30 min' })
      setShowForm(false)
      setMsg('Task assigned.')
      setShowTasks(true)
      onChanged?.()
    } catch (e2) {
      setMsg(`⚠️ ${e2.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(taskId, status) {
    await api.mentorSetTaskStatus(taskId, status)
    onChanged?.()
  }

  async function removeTask(taskId) {
    await api.mentorDeleteTask(taskId)
    onChanged?.()
  }

  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700">
            {m.initials}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-800">{m.name}</div>
            <div className="text-xs text-slate-400">{m.role} · {m.team}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-indigo-600">{m.progress}%</div>
          <div className="text-[11px] text-slate-400">{m.tasks_done}/{m.tasks_total} tasks</div>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
        <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${m.progress}%` }} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={generate} disabled={busy} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-40">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} Generate tasks (AI)
        </button>
        <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
          <Plus size={13} /> Assign task
        </button>
        <button
          onClick={() => setShowTasks((v) => !v)}
          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs ${showTasks ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <ClipboardList size={13} /> Tasks ({tasks.length})
          <ChevronDown size={13} className={`transition-transform ${showTasks ? 'rotate-180' : ''}`} />
        </button>
        {m.open_questions > 0 && (
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">{m.open_questions} open Q</span>
        )}
      </div>

      {msg && <div className="mt-2 text-xs text-slate-500">{msg}</div>}

      {showTasks && (
        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
          <div className="mb-2 flex items-center justify-between px-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {m.name.split(' ')[0]}'s tasks · {tasks.filter((t) => t.status === 'done').length}/{tasks.length} done
            </span>
            <span className="text-[11px] text-slate-400">click a status icon to update · hover to remove</span>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            <TaskList tasks={tasks} onStatusChange={setStatus} onDelete={removeTask} />
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={assign} className="mt-3 space-y-2 rounded-lg bg-slate-50 p-2.5">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
          <div className="flex gap-2">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded border border-slate-200 px-2 py-1.5 text-xs">
              {['Learning', 'Tools', 'Security', 'Compliance', 'People', 'Benefits', 'General'].map((c) => <option key={c}>{c}</option>)}
            </select>
            <input value={form.estimated_time} onChange={(e) => setForm({ ...form, estimated_time: e.target.value })} className="w-24 rounded border border-slate-200 px-2 py-1.5 text-xs" />
            <button disabled={busy} className="ml-auto rounded bg-slate-800 px-3 py-1.5 text-xs text-white disabled:opacity-40">Assign</button>
          </div>
        </form>
      )}
    </div>
  )
}

function QuestionInbox({ questions, onAnswered }) {
  const [drafts, setDrafts] = useState({})
  const [busy, setBusy] = useState(null)
  const open = questions.filter((q) => q.status === 'open')
  const answered = questions.filter((q) => q.status === 'answered')

  async function send(q) {
    const answer = (drafts[q.id] || '').trim()
    if (!answer) return
    setBusy(q.id)
    try {
      await api.answerQuestion(q.id, answer)
      onAnswered?.()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      {open.length === 0 && answered.length === 0 && (
        <div className="py-6 text-center text-sm text-slate-400">
          No escalations yet. When OnboardBot can't answer a mentee's question, it lands here.
        </div>
      )}
      {open.map((q) => (
        <div key={q.id} className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
          <div className="text-sm font-medium text-slate-800">{q.question}</div>
          <div className="mt-0.5 text-[11px] text-slate-500">from {q.mentee_name} · {q.reason}</div>
          <textarea
            value={drafts[q.id] || ''}
            onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })}
            placeholder="Write an answer for your mentee…"
            className="mt-2 h-16 w-full resize-none rounded border border-slate-200 p-2 text-xs outline-none focus:border-indigo-400"
          />
          <button onClick={() => send(q)} disabled={busy === q.id} className="mt-1 flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">
            {busy === q.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send answer
          </button>
        </div>
      ))}
      {answered.map((q) => (
        <div key={q.id} className="rounded-lg border border-slate-100 p-3">
          <div className="text-sm font-medium text-slate-600">{q.question}</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600"><CheckCircle2 size={12} /> answered for {q.mentee_name}</div>
          <div className="mt-1 text-xs text-slate-500">{q.answer}</div>
        </div>
      ))}
    </div>
  )
}

export default function MentorDashboard() {
  const [data, setData] = useState(null)
  const load = useCallback(() => api.mentorOverview().then(setData).catch(() => {}), [])
  useEffect(() => { load() }, [load])

  const mentees = data?.mentees ?? []
  const questions = data?.questions ?? []
  const openCount = questions.filter((q) => q.status === 'open').length

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Your mentees" subtitle={`${mentees.length} assigned`} icon={<Users size={15} />}>
        <div className="space-y-3">
          {mentees.map((m) => <MenteeCard key={m.id} m={m} onChanged={load} />)}
        </div>
      </Card>
      <Card title="Questions to answer" subtitle={`${openCount} waiting · human-in-the-loop for OnboardBot`} icon={<MessageCircleQuestion size={15} />}>
        <QuestionInbox questions={questions} onAnswered={load} />
      </Card>
    </div>
  )
}
