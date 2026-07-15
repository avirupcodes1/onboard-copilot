import { useCallback, useEffect, useState } from 'react'
import { UserRound, MessageCircleQuestion, CheckCircle2, Clock } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import ChatWidget from '../components/ChatWidget'
import TaskList from '../components/TaskList'

function Card({ title, subtitle, icon, children, right }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          {icon && <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icon}</div>}
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

export default function MenteeDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)

  const load = useCallback(() => {
    api.myOverview().then(setData).catch(() => {})
  }, [])
  useEffect(() => {
    load()
  }, [load])

  async function changeStatus(id, status) {
    await api.setTaskStatus(id, status)
    load()
  }

  const progress = data?.progress ?? 0
  const tasks = data?.tasks ?? []
  const done = tasks.filter((t) => t.status === 'done').length

  return (
    <div>
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Welcome, {user.name.split(' ')[0]} 👋</h2>
            <p className="text-xs text-slate-400">
              {user.team} · {done}/{tasks.length} onboarding tasks complete
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-indigo-600">{progress}%</div>
            <div className="text-[11px] text-slate-400">onboarding progress</div>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
          <div className="h-1.5 rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChatWidget onEscalate={load} />

        <div className="space-y-4">
          {data?.mentor && (
            <Card title="Your mentor" icon={<UserRound size={15} />}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-medium text-teal-700">
                  {data.mentor.initials}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-800">{data.mentor.name}</div>
                  <div className="text-xs text-slate-400">{data.mentor.specialty || data.mentor.team}</div>
                </div>
              </div>
            </Card>
          )}

          <Card title="Your tasks" subtitle="Click a status icon to update it" icon={<Clock size={15} />}>
            <div className="max-h-[300px] overflow-y-auto">
              <TaskList tasks={tasks} onStatusChange={changeStatus} />
            </div>
          </Card>

          {data?.questions?.length > 0 && (
            <Card title="Questions you raised" subtitle="Escalated to your mentor" icon={<MessageCircleQuestion size={15} />}>
              <div className="space-y-2">
                {data.questions.map((q) => (
                  <div key={q.id} className="rounded-lg border border-slate-100 p-2.5">
                    <div className="text-sm font-medium text-slate-700">{q.question}</div>
                    {q.status === 'answered' ? (
                      <div className="mt-1 rounded bg-emerald-50 p-2 text-xs text-emerald-800">
                        <span className="flex items-center gap-1 font-medium"><CheckCircle2 size={12} /> Your mentor answered</span>
                        <div className="mt-1 text-emerald-700">{q.answer}</div>
                      </div>
                    ) : (
                      <div className="mt-1 text-[11px] text-amber-600">waiting on your mentor…</div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
