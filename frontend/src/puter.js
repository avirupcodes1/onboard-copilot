// Free, keyless in-browser AI via Puter.js (https://developer.puter.com).
//
// Used ONLY as a fallback: the backend LangGraph agent is primary, but when it
// can't generate (no GEMINI_API_KEY / free-tier 429 / timeout) it returns
// `needs_client_fallback: true` plus the retrieved `context`, and we generate a
// grounded, cited answer here for free. Puter's AI runs against the visitor's
// own Puter account ("user-pays"), so there's no key and no per-app quota.

const PUTER_MODEL = 'gemini-2.5-flash'
const NO_ANSWER = 'NO_ANSWER'
const PUTER_TIMEOUT_MS = 90000 // generous — covers a first-time Puter sign-in

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms)),
  ])
}

export function puterReady() {
  return typeof window !== 'undefined' && !!window.puter?.ai?.chat
}

function contextBlock(context) {
  return (context || [])
    .map((c) => `[${c.chunk_id}] (${c.doc_title} — ${c.heading})\n${c.text}`)
    .join('\n\n')
}

// Puter's chat result shape varies by model; pull the text out defensively.
function extractText(resp) {
  if (resp == null) return ''
  if (typeof resp === 'string') return resp
  const content = resp.message?.content
  if (content) {
    if (typeof content === 'string') return content
    if (Array.isArray(content)) return content.map((p) => p?.text ?? '').join('')
    return String(content)
  }
  if (typeof resp.text === 'string') return resp.text
  const s = resp.toString?.()
  return s && s !== '[object Object]' ? s : ''
}

// Generate a grounded answer from retrieved context. Returns
// { answer, noAnswer } — noAnswer=true means the docs don't cover the question
// (the caller should escalate to a mentor).
export async function puterAnswer(question, context) {
  const prompt = [
    'You are OnboardBot, an assistant for new employees.',
    'Answer the question using ONLY the context below. Be concise and practical.',
    'Cite the sources you use inline with their bracketed ids, e.g. [it-security-policy#2].',
    `If the context does not contain the answer, reply with exactly this token and nothing else: ${NO_ANSWER}`,
    '',
    'Context:',
    contextBlock(context),
    '',
    `Question: ${question}`,
  ].join('\n')

  const resp = await withTimeout(
    window.puter.ai.chat(prompt, { model: PUTER_MODEL }),
    PUTER_TIMEOUT_MS,
    'Puter timed out (sign-in not completed?)',
  )
  const text = extractText(resp).trim()
  if (!text || text.toUpperCase().startsWith(NO_ANSWER)) return { answer: '', noAnswer: true }
  return { answer: text, noAnswer: false }
}

// Map the [chunk_id] markers in the answer back to citation chips.
export function citationsFromAnswer(answer, context) {
  const cited = new Set([...(answer || '').matchAll(/\[([a-z0-9-]+#\d+)\]/g)].map((m) => m[1]))
  const ctx = context || []
  const used = ctx.filter((c) => cited.has(c.chunk_id))
  const chunks = used.length ? used : ctx.slice(0, 3)
  return chunks.map((c) => ({
    chunk_id: c.chunk_id,
    doc_id: c.doc_id,
    doc_title: c.doc_title,
    heading: c.heading,
    snippet: (c.text || '').slice(0, 240),
    score: c.score || 0,
  }))
}
