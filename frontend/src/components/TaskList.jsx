import { CheckCircle2, Circle, CircleDashed, Clock, UserCog, Trash2 } from 'lucide-react'
import CitationChip from './CitationChip'

const CATEGORY_TONE = {
  Security: 'bg-red-50 text-red-600',
  Compliance: 'bg-red-50 text-red-600',
  Tools: 'bg-blue-50 text-blue-600',
  Learning: 'bg-purple-50 text-purple-600',
  People: 'bg-emerald-50 text-emerald-600',
  Benefits: 'bg-amber-50 text-amber-600',
}

const NEXT = { pending: 'in-progress', 'in-progress': 'done', done: 'pending' }
const STATUS_ICON = {
  done: <CheckCircle2 size={18} className="text-emerald-500" />,
  'in-progress': <CircleDashed size={18} className="text-indigo-500" />,
  pending: <Circle size={18} className="text-slate-300" />,
}

// `onStatusChange(taskId, nextStatus)` — omit to render read-only.
// `onDelete(taskId)` — optional; shows a remove button (mentor management view).
export default function TaskList({ tasks, onStatusChange, onDelete }) {
  if (!tasks?.length) {
    return <div className="py-8 text-center text-sm text-slate-400">No tasks yet.</div>
  }
  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <div key={t.id} className="group rounded-lg border border-slate-100 p-3">
          <div className="flex items-start gap-2">
            <button
              disabled={!onStatusChange}
              onClick={() => onStatusChange?.(t.id, NEXT[t.status] || 'in-progress')}
              className="mt-0.5 disabled:cursor-default"
              title={onStatusChange ? 'Click to change status' : ''}
            >
              {STATUS_ICON[t.status] || STATUS_ICON.pending}
            </button>
            <div className="flex-1">
              <div className={`text-sm font-medium ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                {t.title}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">{t.description}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${CATEGORY_TONE[t.category] || 'bg-slate-100 text-slate-500'}`}>
                  {t.category}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock size={11} /> {t.estimated_time}
                </span>
                {t.assigned_by_name && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <UserCog size={11} /> {t.assigned_by_name}
                  </span>
                )}
                {t.citation && <CitationChip citation={t.citation} />}
              </div>
            </div>
            {onDelete && (
              <button
                onClick={() => onDelete(t.id)}
                title="Remove task"
                className="mt-0.5 text-slate-200 transition group-hover:text-slate-400 hover:!text-red-500"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
