import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Bot, User, ShieldAlert, Sparkles, Route, Cloud } from 'lucide-react'
import { api } from '../api'
import { puterReady, puterAnswer, citationsFromAnswer } from '../puter'
import CitationChip from './CitationChip'
import Logo from './Logo'

const SAMPLES = [
  'How do I set up MFA and the VPN?',
  'What is the pull request review policy?',
  'How much PTO do I get and how do I request it?',
  'What is the parental leave policy for employees in Germany?',
]

function ConfidenceBadge({ value }) {
  const pct = Math.round(value * 100)
  const tone = value >= 0.5 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>confidence {pct}%</span>
}

function TraceView({ trace }) {
  const [open, setOpen] = useState(false)
  if (!trace?.length) return null
  return (
    <div className="mt-2">
      <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600">
        <Route size={12} /> {open ? 'hide' : 'show'} graph trace
      </button>
      {open && (
        <ol className="mt-1 space-y-0.5 border-l-2 border-slate-200 pl-3 text-[11px] text-slate-500">
          {trace.map((t, i) => (
            <li key={i} className="font-mono">{t}</li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default function ChatWidget({ onEscalate }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  function push(msg) {
    setMessages((m) => [...m, { role: 'bot', ...msg }])
  }

  async function ask(question) {
    if (!question.trim() || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: question }])
    setBusy(true)
    try {
      const res = await api.chat(question)

      // Backend answered normally.
      if (!res.needs_client_fallback || !puterReady()) {
        push(res)
        if (res.escalated) onEscalate?.()
        return
      }

      // Backend LLM unavailable (no key / rate-limited) -> generate for free in
      // the browser via Puter.js, grounded in the context the backend returned.
      try {
        const { answer, noAnswer } = await puterAnswer(question, res.context)
        if (noAnswer) {
          // Docs don't cover it -> keep the human-in-the-loop: log a gap + route to mentor.
          const esc = await api.escalate(question)
          push({ ...esc, source: 'puter' })
          onEscalate?.()
        } else {
          push({
            answer,
            citations: citationsFromAnswer(answer, res.context),
            confidence: 0.7,
            escalated: false,
            source: 'puter',
            trace: ['backend rate-limited → generated in-browser with Puter.js (free Gemini)'],
          })
        }
      } catch (perr) {
        // Puter failed/declined too -> show the backend's graceful message.
        push({ ...res, answer: `${res.answer}\n\n(In-browser fallback unavailable: ${perr.message})` })
      }
    } catch (e) {
      push({ answer: `⚠️ ${e.message}`, citations: [], error: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-[560px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Logo className="h-8 w-8 rounded-lg" />
        <div>
          <div className="text-sm font-semibold">OnboardBot</div>
          <div className="text-xs text-slate-400">Grounded answers from company docs — or your mentor when unsure</div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="text-sm text-slate-500">
            <p className="mb-2 flex items-center gap-1 font-medium text-slate-600">
              <Sparkles size={14} /> Try asking:
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="flex max-w-[80%] items-start gap-2">
                <div className="rounded-2xl rounded-tr-sm bg-indigo-600 px-3 py-2 text-sm text-white">{m.text}</div>
                <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                  <User size={14} />
                </div>
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div className="flex max-w-[85%] items-start gap-2">
                <div className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full ${m.escalated ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {m.escalated ? <ShieldAlert size={14} /> : <Bot size={14} />}
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  <div className="prose-bot">
                    <ReactMarkdown>{m.answer}</ReactMarkdown>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {typeof m.confidence === 'number' && !m.error && <ConfidenceBadge value={m.confidence} />}
                    {m.escalated && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        routed to {m.routed_to || 'a mentor'}
                      </span>
                    )}
                    {m.source === 'puter' && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700"
                        title="Backend was rate-limited — answered for free in your browser via Puter.js"
                      >
                        <Cloud size={11} /> via Puter · free
                      </span>
                    )}
                  </div>

                  {m.citations?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.citations.map((c) => (
                        <CitationChip key={c.chunk_id} citation={c} />
                      ))}
                    </div>
                  )}

                  <TraceView trace={m.trace} />
                </div>
              </div>
            </div>
          ),
        )}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Bot size={14} /> thinking through the graph…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(input)
        }}
        className="flex items-center gap-2 border-t border-slate-100 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about onboarding, policies, tools…"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          <Send size={15} /> Send
        </button>
      </form>
    </div>
  )
}
