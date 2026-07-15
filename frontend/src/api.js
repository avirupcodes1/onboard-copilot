// Fetch wrapper around the FastAPI backend, with bearer-token auth.
const BASE = '/api'

let TOKEN = localStorage.getItem('oc_token') || null
export function setToken(t) {
  TOKEN = t
  if (t) localStorage.setItem('oc_token', t)
  else localStorage.removeItem('oc_token')
}
export function getToken() {
  return TOKEN
}

async function req(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    let detail = res.statusText
    try {
      detail = (await res.json()).detail || detail
    } catch {
      /* ignore */
    }
    const err = new Error(detail)
    err.status = res.status
    throw err
  }
  if (res.status === 204) return null
  return res.json()
}

const json = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const api = {
  health: () => req('/health'),

  // auth
  login: (email, password) => req('/auth/login', json({ email, password })),
  me: () => req('/auth/me'),

  // shared
  chat: (question) => req('/chat', json({ question })),
  escalate: (question) => req('/escalate', json({ question })),
  search: (q, k = 6) => req(`/search?q=${encodeURIComponent(q)}&k=${k}`),

  // mentee
  myOverview: () => req('/my/overview'),
  setTaskStatus: (id, status) => req(`/my/tasks/${id}/status`, json({ status })),

  // mentor
  mentorOverview: () => req('/mentor/overview'),
  assignTask: (payload) => req('/mentor/assign-task', json(payload)),
  generateTasks: (mentee_id, prompt) => req('/mentor/generate-tasks', json({ mentee_id, prompt })),
  answerQuestion: (id, answer) => req(`/mentor/questions/${id}/answer`, json({ answer })),
  mentorSetTaskStatus: (id, status) => req(`/mentor/tasks/${id}/status`, json({ status })),
  mentorDeleteTask: (id) => req(`/mentor/tasks/${id}`, { method: 'DELETE' }),

  // admin
  adminOverview: () => req('/admin/overview'),
  addEmployee: (payload) => req('/admin/employees', json(payload)),
  uploadDocument: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return req('/documents', { method: 'POST', body: fd })
  },
  deleteDocument: (id) => req(`/documents/${id}`, { method: 'DELETE' }),
  resolveGap: (id) => req(`/gaps/${id}/resolve`, { method: 'POST' }),
}
