import { useState } from 'react'
import { FileText, ChevronDown } from 'lucide-react'

// A clickable citation: shows the source doc + heading, expands to the snippet.
export default function CitationChip({ citation }) {
  const [open, setOpen] = useState(false)
  if (!citation) return null
  return (
    <div className="inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
        title={citation.chunk_id}
      >
        <FileText size={12} />
        {citation.doc_title}
        <span className="text-indigo-400">· {citation.heading}</span>
        <ChevronDown size={12} className={open ? 'rotate-180 transition' : 'transition'} />
      </button>
      {open && (
        <div className="mt-1 max-w-md rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-600 shadow-sm">
          <div className="mb-1 font-mono text-[10px] text-slate-400">{citation.chunk_id}</div>
          {citation.snippet}…
        </div>
      )}
    </div>
  )
}
