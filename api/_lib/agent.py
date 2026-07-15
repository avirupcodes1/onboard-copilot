"""The agents — a LangGraph corrective-RAG chatbot and a plan builder.

OnboardBot graph (the star):

    START → rewrite → retrieve → grade ─┬─ good ──────────→ answer → END
                          ▲             ├─ weak, retry ──→ transform ┐
                          └─────────────┘                            │
                                        └─ no evidence ──→ escalate → END

`transform` loops back to `retrieve` with a broadened query (capped once), so
low-confidence retrievals get a second chance before the bot gives up. When the
docs genuinely can't answer, it escalates to a mentor and logs a KB gap instead
of hallucinating.
"""
import json
import os
import re
from functools import lru_cache
from typing import List, Optional, TypedDict

from . import llm, rag
from .models import Citation, Gap, Task
from .store import get_store

CONFIDENCE_THRESHOLD = float(os.getenv("APP_CONFIDENCE_THRESHOLD", "0.5"))
MAX_RETRIES = 1
TOP_K = 6


# ─── model output helpers ─────────────────────────────────────────────────────
def _as_text(content) -> str:
    """Flatten a LangChain message .content to a string.

    Gemini 3 models return content as a list of parts, not a plain string.
    """
    if isinstance(content, list):
        parts = []
        for p in content:
            if isinstance(p, str):
                parts.append(p)
            elif isinstance(p, dict):
                parts.append(p.get("text", ""))
        return "".join(parts)
    return content or ""


# Gemini's function-calling structured output is flaky for our schemas (it can
# return empty fields or append a trailing empty object), so we prompt for JSON
# directly and parse it defensively instead.
def _json_call(model, prompt: str) -> dict:
    raw = _as_text(model.invoke(prompt).content).strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", raw, re.DOTALL)
    if fence:
        raw = fence.group(1).strip()
    start, end = raw.find("{"), raw.rfind("}")
    if start != -1 and end != -1:
        raw = raw[start : end + 1]
    return json.loads(raw)


# ─── OnboardBot state ─────────────────────────────────────────────────────────
class BotState(TypedDict, total=False):
    question: str
    role: Optional[str]
    team: Optional[str]
    employee_id: Optional[str]
    query: str
    retries: int
    candidates: List[dict]
    relevant: List[dict]
    confidence: float
    answer: str
    citations: List[dict]
    escalated: bool
    gap_id: Optional[str]
    question_id: Optional[str]
    routed_to: Optional[str]
    trace: List[str]


def _log(state: BotState, msg: str) -> List[str]:
    trace = state.get("trace", []) + [msg]
    return trace


def _context_block(chunks: List[dict]) -> str:
    parts = []
    for c in chunks:
        parts.append(f"[{c['chunk_id']}] ({c['doc_title']} — {c['heading']})\n{c['text']}")
    return "\n\n".join(parts)


# ─── nodes ────────────────────────────────────────────────────────────────────
def n_rewrite(state: BotState) -> BotState:
    q = state["question"]
    ctx = f" The asker is a {state.get('role') or 'new hire'} on the {state.get('team') or 'unspecified'} team."
    prompt = (
        "Rewrite the following employee question into a concise keyword search "
        "query for a company knowledge base. Return only the query, no quotes.\n"
        f"Question: {q}{ctx}"
    )
    try:
        out = llm.fast_llm(256).invoke(prompt).content.strip()
        query = out.splitlines()[0][:200] if out else q
    except Exception:
        query = q
    return {"query": query or q, "retries": 0, "trace": _log(state, f"rewrite → “{query}”")}


def n_retrieve(state: BotState) -> BotState:
    store = get_store()
    cands = rag.retrieve_candidates(store.index, state["query"], k=TOP_K)
    mode = "hybrid (BM25+dense)" if store.index and store.index.dense_enabled else "BM25"
    return {"candidates": cands, "trace": _log(state, f"retrieve [{mode}] → {len(cands)} candidates")}


def n_grade(state: BotState) -> BotState:
    cands = state.get("candidates", [])
    if not cands:
        return {"relevant": [], "confidence": 0.0, "trace": _log(state, "grade → no candidates")}
    listing = "\n\n".join(f"[{c['chunk_id']}]: {c['text'][:500]}" for c in cands)
    prompt = (
        "You grade retrieved context for a RAG system. Given a question and candidate "
        "chunks, decide how well the chunks let you answer THIS question.\n"
        "- relevant_ids: the chunk_ids that directly address the question.\n"
        "- confidence: use 0.8-1.0 when the chunks clearly cover the topic asked and a "
        "solid grounded answer is possible; 0.4-0.7 when coverage is partial; 0.0-0.3 "
        "when the chunks are off-topic, OR when the question asks about a specific "
        "country/region/role/group the chunks don't explicitly cover (content about a "
        "different group does NOT count as covering it).\n"
        'Respond with ONLY JSON: {"relevant_ids": ["<chunk_id>", ...], "confidence": <0.0-1.0>}\n\n'
        f"Question: {state['question']}\n\nCandidates:\n{listing}"
    )
    try:
        data = _json_call(llm.fast_llm(512), prompt)
        ids = set(data.get("relevant_ids") or [])
        relevant = [c for c in cands if c["chunk_id"] in ids]
        conf = max(0.0, min(1.0, float(data.get("confidence") or 0.0)))
    except Exception as exc:
        relevant, conf = cands[:3], 0.5
        print(f"[grade] fallback: {exc}")
    return {
        "relevant": relevant,
        "confidence": conf,
        "trace": _log(state, f"grade → {len(relevant)} relevant, confidence {conf:.2f}"),
    }


def n_transform(state: BotState) -> BotState:
    prompt = (
        "The previous search query returned weak results. Rewrite it to be "
        "broader and use synonyms, for a company knowledge base. Return only the query.\n"
        f"Original question: {state['question']}\nPrevious query: {state.get('query')}"
    )
    try:
        query = llm.fast_llm(256).invoke(prompt).content.strip().splitlines()[0][:200]
    except Exception:
        query = state["question"]
    return {
        "query": query or state["question"],
        "retries": state.get("retries", 0) + 1,
        "trace": _log(state, f"transform (retry) → “{query}”"),
    }


def n_answer(state: BotState) -> BotState:
    relevant = state.get("relevant") or state.get("candidates", [])[:3]
    context = _context_block(relevant)
    prompt = (
        "You are OnboardBot, an assistant for new employees. Answer the question "
        "using ONLY the context below. Be concise and practical. Cite the sources "
        "you use inline with their bracketed ids, e.g. [it-security-policy#2]. If "
        "the context is insufficient, say so plainly.\n\n"
        f"Context:\n{context}\n\nQuestion: {state['question']}"
    )
    try:
        answer = _as_text(llm.gen_llm(1024).invoke(prompt).content).strip()
    except Exception as exc:
        answer = f"(model error: {exc})"
    cited = set(re.findall(r"\[([a-z0-9\-]+#\d+)\]", answer))
    used = [c for c in relevant if c["chunk_id"] in cited] or relevant
    citations = [
        Citation(
            chunk_id=c["chunk_id"],
            doc_id=c["doc_id"],
            doc_title=c["doc_title"],
            heading=c["heading"],
            snippet=c["text"][:240],
            score=c.get("retrieval_score", 0.0),
        ).model_dump()
        for c in used
    ]
    return {
        "answer": answer,
        "citations": citations,
        "escalated": False,
        "trace": _log(state, f"answer → grounded in {len(citations)} citation(s)"),
    }


def n_escalate(state: BotState) -> BotState:
    store = get_store()
    reason = f"Low retrieval confidence ({state.get('confidence', 0):.2f}); no supporting docs found."
    gap: Gap = store.add_gap(
        question=state["question"],
        reason=reason,
        asked_by=state.get("employee_id"),
        role=state.get("role"),
    )
    # Route the question to the asker's assigned mentor for a human answer.
    routed_to = None
    question_id = None
    emp = store.employee_by_id(state.get("employee_id") or "")
    if emp and emp.get("mentor_id"):
        mentor = store.mentor_by_id(emp["mentor_id"])
        q = store.add_question(
            question=state["question"], mentee_id=emp["id"], mentee_name=emp.get("name"),
            mentor_id=emp["mentor_id"], reason=reason, gap_id=gap.id,
        )
        question_id = q.id
        routed_to = mentor["name"] if mentor else None

    where = f" to your mentor {routed_to}" if routed_to else " to a human mentor"
    msg = (
        f"I couldn't find a confident answer to this in the company knowledge base, so "
        f"I've routed it{where} and logged it as a knowledge gap. You'll get a follow-up "
        f"once it's answered, and the answer will be added to the docs."
    )
    return {
        "answer": msg,
        "citations": [],
        "escalated": True,
        "gap_id": gap.id,
        "question_id": question_id,
        "routed_to": routed_to,
        "trace": _log(state, f"escalate → gap {gap.id}" + (f", routed to {routed_to}" if routed_to else "")),
    }


def _route_after_grade(state: BotState) -> str:
    relevant = state.get("relevant", [])
    conf = state.get("confidence", 0.0)
    if relevant and conf >= CONFIDENCE_THRESHOLD:
        return "answer"
    if state.get("retries", 0) < MAX_RETRIES:
        return "transform"
    return "escalate"


@lru_cache(maxsize=1)
def _graph():
    from langgraph.graph import StateGraph, START, END

    g = StateGraph(BotState)
    g.add_node("rewrite", n_rewrite)
    g.add_node("retrieve", n_retrieve)
    g.add_node("grade", n_grade)
    g.add_node("transform", n_transform)
    g.add_node("answer", n_answer)
    g.add_node("escalate", n_escalate)

    g.add_edge(START, "rewrite")
    g.add_edge("rewrite", "retrieve")
    g.add_edge("retrieve", "grade")
    g.add_conditional_edges(
        "grade",
        _route_after_grade,
        {"answer": "answer", "transform": "transform", "escalate": "escalate"},
    )
    g.add_edge("transform", "retrieve")
    g.add_edge("answer", END)
    g.add_edge("escalate", END)
    return g.compile()


def run_onboardbot(question: str, role=None, team=None, employee_id=None) -> BotState:
    init: BotState = {
        "question": question,
        "role": role,
        "team": team,
        "employee_id": employee_id,
        "trace": [],
    }
    return _graph().invoke(init)


# ─── Plan builder ─────────────────────────────────────────────────────────────
def build_plan(name: str, role: str, team: Optional[str]) -> tuple[List[Task], str]:
    store = get_store()
    team = team or ""
    queries = [
        "security awareness training MFA VPN accounts setup",
        f"{role} {team} tools access local environment setup",
        "company values communication norms working hours",
        "benefits enrollment time off PTO how to request",
        f"{team} team process pull request code review workflow" if team else "team process workflow",
    ]
    seen, context_chunks = set(), []
    for q in queries:
        for c in rag.retrieve_candidates(store.index, q, k=3):
            if c["chunk_id"] not in seen:
                seen.add(c["chunk_id"])
                context_chunks.append(c)

    if not context_chunks:
        return [], "No knowledge-base documents are available to build a grounded plan yet."

    context = _context_block(context_chunks)
    prompt = (
        f"Create a first-week onboarding checklist for {name}, a new {role} "
        f"on the {team or 'company'} team. Generate 6-9 concrete, actionable tasks "
        "grounded ONLY in the context below. Prefer tasks that reference real "
        "policies (security setup, tools, values, benefits, team workflow).\n"
        "Respond with ONLY a JSON object of the form:\n"
        '{"tasks": [{"title": "...", "description": "...", "category": "Security|Tools|Learning|People|Benefits|General", '
        '"estimated_time": "30 min", "citation_id": "<chunk_id this task is based on>"}]}\n'
        "Every task must have a non-empty title and description.\n\n"
        f"Context:\n{context}"
    )
    try:
        data = _json_call(llm.gen_llm(2048), prompt)
        plan_tasks = [t for t in (data.get("tasks") or []) if t.get("title") and t.get("description")]
    except Exception as exc:
        return [], f"Plan generation failed: {exc}"

    by_id = {c["chunk_id"]: c for c in context_chunks}
    tasks: List[Task] = []
    for i, t in enumerate(plan_tasks):
        cite = None
        c = by_id.get(t.get("citation_id") or "")
        if c:
            cite = Citation(
                chunk_id=c["chunk_id"], doc_id=c["doc_id"], doc_title=c["doc_title"],
                heading=c["heading"], snippet=c["text"][:200],
            )
        tasks.append(
            Task(
                id=f"task-{i+1}",
                title=t["title"],
                description=t["description"],
                category=t.get("category", "General"),
                estimated_time=t.get("estimated_time", "30 min"),
                citation=cite,
            )
        )
    grounded = sum(1 for t in tasks if t.citation)
    return tasks, f"Generated {len(tasks)} tasks ({grounded} cited to source documents)."
