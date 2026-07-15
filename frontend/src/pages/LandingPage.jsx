import { useEffect, useState } from 'react'
import {
  ArrowRight, Check, Star, ChevronLeft, ChevronRight, Quote,
  Zap, HeartHandshake, Sparkles, MessageSquare, ClipboardList, Compass,
} from 'lucide-react'
import Logo from '../components/Logo'

const BENEFITS = [
  { icon: Zap, tone: 'text-indigo-600 bg-indigo-50', title: 'Instant, trustworthy answers', body: 'New hires get accurate answers from your own handbook in seconds — with the source shown every time, so they can trust what they read.' },
  { icon: HeartHandshake, tone: 'text-amber-600 bg-amber-50', title: 'No question left behind', body: "If the answer isn't in your docs, it's handed straight to the right mentor. Nothing slips through the cracks." },
  { icon: MessageSquare, tone: 'text-teal-600 bg-teal-50', title: 'Free up your mentors', body: 'Stop answering the same questions over and over. Your team steps in only when it truly matters.' },
  { icon: ClipboardList, tone: 'text-purple-600 bg-purple-50', title: 'Onboarding on autopilot', body: 'Personalized task checklists get every new hire productive from day one — no more blank-page first weeks.' },
  { icon: Compass, tone: 'text-rose-600 bg-rose-50', title: 'See where your docs fall short', body: 'Every unanswered question becomes insight into exactly what your handbook is missing.' },
  { icon: Sparkles, tone: 'text-blue-600 bg-blue-50', title: 'One home for the whole team', body: 'New hires, mentors, and managers each get a workspace built for exactly what they need to do.' },
]

const STEPS = [
  { n: '1', title: 'Your new hire asks', body: 'They type a question in plain English — about tools, policies, benefits, anything.' },
  { n: '2', title: 'They get a clear answer', body: 'Pulled straight from your handbook, with the exact source to back it up.' },
  { n: '3', title: 'A human steps in when needed', body: "If it's not in your docs, the right mentor gets it and replies — no dead ends." },
]

const TESTIMONIALS = [
  { quote: 'Our new engineers are productive a full week sooner. It paid for itself in the first month.', name: 'Priya Kapoor', role: 'Head of Engineering', initials: 'PK', tone: 'bg-indigo-100 text-indigo-700' },
  { quote: 'My mentors finally stopped drowning in the same repeated questions. Game changer for our People team.', name: 'Marcus Stone', role: 'People Operations', initials: 'MS', tone: 'bg-teal-100 text-teal-700' },
  { quote: "It's the first onboarding tool I've seen that admits when it doesn't know — and gets a human on it.", name: 'Sarah Chen', role: 'VP of People', initials: 'SC', tone: 'bg-purple-100 text-purple-700' },
  { quote: 'Setup took an afternoon. New hires stopped feeling lost, and our ramp time dropped noticeably.', name: 'Alex Morgan', role: 'Chief Operating Officer', initials: 'AM', tone: 'bg-amber-100 text-amber-700' },
]

const LOGOS = ['Northwind', 'Acme', 'Lumen', 'Vertex', 'Orbit', 'Meridian']

function Testimonials() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setI((x) => (x + 1) % TESTIMONIALS.length), 5000)
    return () => clearInterval(t)
  }, [paused])
  const go = (d) => setI((x) => (x + d + TESTIMONIALS.length) % TESTIMONIALS.length)

  return (
    <div className="mx-auto max-w-3xl" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="w-full flex-shrink-0 px-8 py-10 text-center sm:px-14">
              <Quote size={28} className="mx-auto mb-4 text-indigo-200" />
              <p className="text-lg font-medium text-slate-700 sm:text-xl">“{t.quote}”</p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${t.tone}`}>{t.initials}</div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-slate-800">{t.name}</div>
                  <div className="text-xs text-slate-400">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:text-slate-700">
          <ChevronLeft size={16} />
        </button>
        <button onClick={() => go(1)} aria-label="Next" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:text-slate-700">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {TESTIMONIALS.map((_, idx) => (
          <button key={idx} onClick={() => setI(idx)} aria-label={`Go to slide ${idx + 1}`} className={`h-2 rounded-full transition-all ${idx === i ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}`} />
        ))}
      </div>
    </div>
  )
}

function Pricing({ onGetStarted }) {
  const [annual, setAnnual] = useState(true)
  const plans = [
    { name: 'Starter', tagline: 'For small teams getting started', monthly: 0, features: ['Up to 5 new hires', 'AI answers from 1 handbook', 'Task checklists', 'Community support'], cta: 'Get started', highlight: false },
    { name: 'Growth', tagline: 'For growing teams that onboard often', monthly: 49, features: ['Unlimited new hires', 'Mentor hand-off & routing', 'Task assignment & tracking', 'Knowledge-gap insights', 'Priority support'], cta: 'Start free trial', highlight: true },
    { name: 'Enterprise', tagline: 'For organizations with advanced needs', monthly: null, features: ['Everything in Growth', 'Single sign-on & advanced security', 'Custom integrations', 'Dedicated success manager', 'SLA & onboarding help'], cta: 'Contact sales', highlight: false },
  ]
  return (
    <div>
      <div className="mb-8 flex items-center justify-center gap-3 text-sm">
        <span className={annual ? 'text-slate-400' : 'font-medium text-slate-700'}>Monthly</span>
        <button onClick={() => setAnnual((v) => !v)} className="relative h-6 w-11 rounded-full bg-indigo-600" aria-label="Toggle billing period">
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${annual ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
        <span className={annual ? 'font-medium text-slate-700' : 'text-slate-400'}>
          Annual <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">save 20%</span>
        </span>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.name} className={`relative rounded-2xl border bg-white p-6 shadow-sm ${p.highlight ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'}`}>
            {p.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-[11px] font-medium text-white">Most popular</span>
            )}
            <div className="text-sm font-semibold text-slate-800">{p.name}</div>
            <div className="mt-1 text-xs text-slate-400">{p.tagline}</div>
            <div className="mt-4">
              {p.monthly === null ? (
                <div className="text-3xl font-semibold text-slate-900">Custom</div>
              ) : (
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-semibold text-slate-900">${annual ? Math.round(p.monthly * 0.8) : p.monthly}</span>
                  <span className="pb-1 text-sm text-slate-400">/ mo{p.monthly > 0 && annual ? ', billed yearly' : ''}</span>
                </div>
              )}
            </div>
            <button
              onClick={onGetStarted}
              className={`mt-5 w-full rounded-lg px-4 py-2 text-sm font-medium ${p.highlight ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              {p.cta}
            </button>
            <ul className="mt-5 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check size={15} className="mt-0.5 shrink-0 text-indigo-500" /> {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

const FAQS = [
  { q: 'How long does it take to set up?', a: 'Upload your existing handbook and policies, and OnboardCopilot is ready in minutes. No lengthy configuration.' },
  { q: 'What happens when it doesn’t know the answer?', a: "Instead of guessing, it routes the question to the right mentor and flags it — so your new hire always gets a real answer." },
  { q: 'Do our mentors have to be online all the time?', a: 'No. Most questions are answered instantly from your docs. Mentors only get pinged for the handful the docs can’t cover.' },
  { q: 'Can I try it before buying?', a: 'Yes — start free, no credit card required. Explore every role from the demo in one click.' },
]

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <div className="mx-auto max-w-2xl divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
      {FAQS.map((f, i) => (
        <div key={f.q} className="px-5">
          <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-slate-800">
            {f.q}
            <ChevronRight size={16} className={`text-slate-400 transition-transform ${open === i ? 'rotate-90' : ''}`} />
          </button>
          {open === i && <p className="pb-4 text-sm text-slate-500">{f.a}</p>}
        </div>
      ))}
    </div>
  )
}

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8 rounded-lg" />
            <span className="text-base font-semibold">OnboardCopilot</span>
          </div>
          <div className="hidden items-center gap-6 text-sm text-slate-500 sm:flex">
            <a href="#benefits" className="hover:text-slate-800">Why it works</a>
            <a href="#how" className="hover:text-slate-800">How it works</a>
            <a href="#pricing" className="hover:text-slate-800">Pricing</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onGetStarted} className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block">Sign in</button>
            <button onClick={onGetStarted} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Get started</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-700">
              <Sparkles size={12} /> The onboarding assistant that tells the truth
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Onboarding answers your new hires can <span className="text-indigo-600">actually trust</span>.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-slate-500">
              OnboardCopilot instantly answers new-hire questions from your own handbook — and when it isn't sure,
              it connects them to the right person. Faster ramp-up, happier new hires, and a lighter load on your team.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={onGetStarted} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                Get started free <ArrowRight size={16} />
              </button>
              <button onClick={onGetStarted} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Explore a live demo
              </button>
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm text-slate-400">
              <div className="flex text-amber-400">{[0, 1, 2, 3, 4].map((s) => <Star key={s} size={14} fill="currentColor" />)}</div>
              Loved by onboarding teams · no credit card required
            </div>
          </div>

          {/* Product mockup */}
          <div className="relative">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Logo className="h-7 w-7 rounded-lg" />
                <div className="text-sm font-semibold">OnboardCopilot</div>
              </div>
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-tr-sm bg-indigo-600 px-3 py-2 text-sm text-white">How do I set up my laptop and accounts?</div>
              </div>
              <div className="mt-3 rounded-2xl rounded-tl-sm border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Turn on two-factor security for every account, then install the company VPN — it sets itself up on your work laptop automatically.
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">📄 From: IT Setup Guide</span>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <div className="font-medium">“What's the parental leave policy in Germany?”</div>
                <div className="mt-1 text-amber-700">Not in your handbook — sent to <span className="font-medium">Sarah</span>, your onboarding buddy, for a real answer.</div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-3 -z-10 h-24 w-40 rounded-2xl bg-indigo-100" />
          </div>
        </div>

        {/* Logos */}
        <div className="mx-auto max-w-5xl px-4 pb-14">
          <p className="mb-5 text-center text-xs uppercase tracking-widest text-slate-400">Trusted by fast-growing teams</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-lg font-semibold text-slate-300">
            {LOGOS.map((l) => <span key={l}>{l}</span>)}
          </div>
        </div>
      </section>

      {/* Difference band */}
      <section className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-10 text-center">
          <p className="text-lg text-slate-600">
            Most onboarding chatbots will answer <span className="font-medium text-slate-800">anything</span> — even when they're wrong.
            OnboardCopilot only gives answers it can back up, and <span className="font-medium text-indigo-600">hands off to a real person when it can't</span>.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Everything a great first week needs</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">Give new hires confidence from day one — and give your team their time back.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${f.tone}`}><f.icon size={20} /></div>
              <h3 className="text-base font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">How it works</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">Simple for new hires. Effortless for your team.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">{s.n}</div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials carousel */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Teams love onboarding this way</h2>
        </div>
        <Testimonials />
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Simple, transparent pricing</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">Start free. Upgrade when your team grows. Cancel anytime.</p>
          </div>
          <Pricing onGetStarted={onGetStarted} />
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Questions, answered</h2>
        </div>
        <Faq />
      </section>

      {/* Final CTA */}
      <section className="border-t border-slate-100 bg-gradient-to-b from-white to-indigo-50/60">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Ready to make onboarding effortless?</h2>
          <p className="mt-2 text-sm text-slate-500">Get your new hires productive faster — starting today.</p>
          <button onClick={onGetStarted} className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            Get started free <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Logo className="h-7 w-7 rounded-lg" />
              <span className="text-sm font-semibold">OnboardCopilot</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">Onboarding your new hires will love.</p>
          </div>
          {[
            { h: 'Product', links: ['Features', 'Pricing', 'Demo'] },
            { h: 'Company', links: ['About', 'Careers', 'Contact'] },
            { h: 'Legal', links: ['Privacy', 'Terms', 'Security'] },
          ].map((c) => (
            <div key={c.h}>
              <div className="text-sm font-semibold text-slate-700">{c.h}</div>
              <ul className="mt-2 space-y-1 text-sm text-slate-400">
                {c.links.map((l) => <li key={l}><a href="#" className="hover:text-slate-600">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">© 2026 OnboardCopilot. All rights reserved.</div>
      </footer>
    </div>
  )
}
