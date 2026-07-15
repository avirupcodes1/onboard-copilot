"""FastAPI application: auth + role-scoped endpoints over the RAG store and agents.

Three roles (admin / mentor / mentee) authenticate with signed tokens. Endpoints
are gated and data is scoped by role. Exposed as an ASGI `app`.
Local: `uvicorn api.index:app --port 8000 --reload`; on Vercel it's a function.
"""
import io
import os
import uuid
from typing import List, Optional

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import agent, auth, llm, rag
from .models import (
    AddEmployeeRequest,
    AnswerQuestionRequest,
    AssignTaskRequest,
    ChatRequest,
    ChatResponse,
    Citation,
    GenerateForMenteeRequest,
    LoginRequest,
    LoginResponse,
    Task,
    UpdateTaskStatusRequest,
    User,
)
from .store import get_store

VERSION = "0.3.0"

app = FastAPI(title="OnboardCopilot API", version=VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── auth dependencies ────────────────────────────────────────────────────────
def current_user(authorization: Optional[str] = Header(None)) -> User:
    token = authorization[7:] if authorization and authorization.lower().startswith("bearer ") else None
    user = auth.user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require(*roles):
    def dep(user: User = Depends(current_user)) -> User:
        if roles and user.role not in roles:
            raise HTTPException(status_code=403, detail="Forbidden for role '%s'" % user.role)
        return user
    return dep


def _mentee_view(store, emp: dict) -> dict:
    ts = store.tasks_for(emp["id"])
    open_qs = sum(1 for q in store.questions_for_mentee(emp["id"]) if q.status == "open")
    return {
        **emp,
        "progress": store.task_progress(emp["id"]),
        "tasks_total": len(ts),
        "tasks_done": sum(1 for t in ts if t.get("status") == "done"),
        "open_questions": open_qs,
    }


# ─── public ───────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    store = get_store()
    return {
        "status": "ok",
        "version": VERSION,
        "documents": len(store.documents),
        "chunks": len(store.chunks),
        "dense_embeddings": bool(store.index and store.index.dense_enabled),
        "gemini_key": llm.has_key(),
        "confidence_threshold": agent.CONFIDENCE_THRESHOLD,
    }


@app.post("/api/auth/login", response_model=LoginResponse)
def login(req: LoginRequest):
    user = auth.authenticate(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return LoginResponse(token=auth.make_token(user.id), user=user)


@app.get("/api/auth/me", response_model=User)
def me(user: User = Depends(current_user)):
    return user


# ─── chat (OnboardBot) — any authenticated user ───────────────────────────────
@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest, user: User = Depends(current_user)):
    if not llm.has_key():
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not set on the server.")
    # Identity comes from the session, not the request body (no spoofing).
    result = agent.run_onboardbot(
        question=req.question, role=user.role, team=user.team, employee_id=user.id
    )
    return ChatResponse(
        answer=result.get("answer", ""),
        citations=[Citation(**c) for c in result.get("citations", [])],
        confidence=result.get("confidence", 0.0),
        escalated=result.get("escalated", False),
        gap_id=result.get("gap_id"),
        question_id=result.get("question_id"),
        routed_to=result.get("routed_to"),
        trace=result.get("trace", []),
    )


@app.get("/api/search")
def search(q: str, k: int = 6, user: User = Depends(current_user)):
    store = get_store()
    hits = rag.retrieve_candidates(store.index, q, k=k)
    return {
        "query": q,
        "mode": "hybrid" if (store.index and store.index.dense_enabled) else "bm25",
        "results": [
            {"chunk_id": c["chunk_id"], "doc_title": c["doc_title"], "heading": c["heading"],
             "score": c.get("retrieval_score", 0.0), "snippet": c["text"][:200]}
            for c in hits
        ],
    }


# ─── mentee ───────────────────────────────────────────────────────────────────
@app.get("/api/my/overview")
def my_overview(user: User = Depends(require("mentee"))):
    store = get_store()
    mentor = store.mentor_by_id(user.mentor_id) if user.mentor_id else None
    return {
        "tasks": store.tasks_for(user.id),
        "progress": store.task_progress(user.id),
        "mentor": mentor,
        "questions": [q.model_dump() for q in store.questions_for_mentee(user.id)],
    }


@app.post("/api/my/tasks/{task_id}/status")
def update_my_task(task_id: str, req: UpdateTaskStatusRequest, user: User = Depends(require("mentee"))):
    store = get_store()
    task = next((t for t in store.tasks if t.get("id") == task_id), None)
    if not task or task.get("assigned_to") != user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    store.update_task_status(task_id, req.status)
    return task


# ─── mentor ───────────────────────────────────────────────────────────────────
@app.get("/api/mentor/overview")
def mentor_overview(user: User = Depends(require("mentor"))):
    store = get_store()
    mentees = []
    for e in store.mentees_for_mentor(user.id):
        mv = _mentee_view(store, e)
        mv["tasks"] = store.tasks_for(e["id"])  # full list so the mentor can manage them
        mentees.append(mv)
    return {
        "mentees": mentees,
        "questions": [q.model_dump() for q in store.questions_for_mentor(user.id)],
    }


def _guard_mentee(store, mentor: User, mentee_id: str) -> dict:
    emp = store.employee_by_id(mentee_id)
    if not emp or emp.get("mentor_id") != mentor.id:
        raise HTTPException(status_code=403, detail="Not your mentee")
    return emp


@app.post("/api/mentor/assign-task", response_model=Task)
def assign_task(req: AssignTaskRequest, user: User = Depends(require("mentor"))):
    store = get_store()
    _guard_mentee(store, user, req.mentee_id)
    task = store.add_task({
        "title": req.title, "description": req.description, "category": req.category,
        "estimated_time": req.estimated_time, "status": "pending",
        "assigned_to": req.mentee_id, "assigned_by": user.id, "assigned_by_name": user.name,
    })
    return Task(**task)


@app.post("/api/mentor/generate-tasks")
def generate_tasks(req: GenerateForMenteeRequest, user: User = Depends(require("mentor"))):
    if not llm.has_key():
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not set on the server.")
    store = get_store()
    emp = _guard_mentee(store, user, req.mentee_id)
    role = (req.prompt or emp.get("role") or "new hire")
    tasks, message = agent.build_plan(name=emp["name"], role=role, team=emp.get("team"))
    added = []
    for t in tasks:
        d = t.model_dump()
        d.update({"assigned_to": emp["id"], "assigned_by": user.id, "assigned_by_name": user.name, "status": "pending"})
        added.append(store.add_task(d))
    return {"message": message, "tasks": added}


def _guard_mentor_task(store, mentor: User, task_id: str) -> dict:
    task = next((t for t in store.tasks if t.get("id") == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    emp = store.employee_by_id(task.get("assigned_to") or "")
    if not emp or emp.get("mentor_id") != mentor.id:
        raise HTTPException(status_code=403, detail="Not your mentee's task")
    return task


@app.post("/api/mentor/tasks/{task_id}/status")
def mentor_update_task(task_id: str, req: UpdateTaskStatusRequest, user: User = Depends(require("mentor"))):
    store = get_store()
    _guard_mentor_task(store, user, task_id)
    return store.update_task_status(task_id, req.status)


@app.delete("/api/mentor/tasks/{task_id}")
def mentor_delete_task(task_id: str, user: User = Depends(require("mentor"))):
    store = get_store()
    _guard_mentor_task(store, user, task_id)
    store.delete_task(task_id)
    return {"deleted": task_id}


@app.post("/api/mentor/questions/{qid}/answer")
def answer_question(qid: str, req: AnswerQuestionRequest, user: User = Depends(require("mentor"))):
    store = get_store()
    q = next((x for x in store.questions if x.id == qid), None)
    if not q or q.mentor_id != user.id:
        raise HTTPException(status_code=404, detail="Question not found")
    store.answer_question(qid, req.answer)
    return q.model_dump()


# ─── admin ────────────────────────────────────────────────────────────────────
@app.get("/api/admin/overview")
def admin_overview(user: User = Depends(require("admin"))):
    store = get_store()
    return {
        "employees": [_mentee_view(store, e) for e in store.employees],
        "mentors": store.mentors,
        "documents": [d.model_dump() for d in store.list_documents()],
        "gaps": [g.model_dump() for g in store.gaps],
        "questions": [q.model_dump() for q in store.questions],
        "retrieval": "hybrid" if (store.index and store.index.dense_enabled) else "bm25",
    }


@app.post("/api/admin/employees")
def add_employee(req: AddEmployeeRequest, user: User = Depends(require("admin"))):
    store = get_store()
    if not store.mentor_by_id(req.mentor_id):
        raise HTTPException(status_code=400, detail="Unknown mentor")
    if auth.email_exists(req.email):
        raise HTTPException(status_code=400, detail="That email is already in use")
    parts = [p for p in req.name.strip().split() if p]
    initials = ((parts[0][:1] if parts else "") + (parts[-1][:1] if len(parts) > 1 else "")).upper() or "NH"
    emp_id = f"emp-{uuid.uuid4().hex[:6]}"
    emp = {
        "id": emp_id, "name": req.name.strip(), "role": req.role, "team": req.team,
        "mentor_id": req.mentor_id, "initials": initials,
    }
    store.add_employee(emp)
    # Register a login so the new hire can sign in (demo password: password123).
    auth.register_account({
        "id": emp_id, "name": req.name.strip(), "email": req.email, "role": "mentee",
        "team": req.team, "mentor_id": req.mentor_id, "initials": initials,
    })
    return _mentee_view(store, emp)


@app.get("/api/documents")
def list_documents(user: User = Depends(require("admin"))):
    return [d.model_dump() for d in get_store().list_documents()]


@app.post("/api/documents")
async def upload_document(file: UploadFile = File(...), user: User = Depends(require("admin"))):
    raw = await file.read()
    name = file.filename or "document"
    text = _extract_text(name, raw)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file.")
    doc_id = os.path.splitext(os.path.basename(name))[0].lower().replace(" ", "-")
    meta = get_store().add_document(doc_id, _title(text, doc_id), text)
    return meta.model_dump()


@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str, user: User = Depends(require("admin"))):
    if not get_store().delete_document(doc_id):
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"deleted": doc_id}


@app.post("/api/gaps/{gap_id}/resolve")
def resolve_gap(gap_id: str, user: User = Depends(require("admin"))):
    if not get_store().resolve_gap(gap_id):
        raise HTTPException(status_code=404, detail="Gap not found.")
    return {"resolved": gap_id}


# ─── helpers ──────────────────────────────────────────────────────────────────
def _extract_text(name: str, raw: bytes) -> str:
    if name.lower().endswith(".pdf"):
        try:
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(raw))
            return "\n".join((page.extract_text() or "") for page in reader.pages)
        except Exception:
            return ""
    return raw.decode("utf-8", errors="ignore")


def _title(text: str, fallback: str) -> str:
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("# "):
            return line[2:].strip()
    return fallback.replace("-", " ").title()
