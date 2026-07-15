"""Pydantic request/response schemas and internal data shapes.

The contract between the FastAPI layer, the LangGraph agents, and the React
frontend. Auth is stateless (signed tokens), so no server-side session store is
needed — important on Vercel's serverless runtime.
"""
from typing import List, Optional
from pydantic import BaseModel, Field


# ─── Auth & users ─────────────────────────────────────────────────────────────
class User(BaseModel):
    id: str
    name: str
    email: str
    role: str  # admin | mentor | mentee
    team: Optional[str] = None
    mentor_id: Optional[str] = None
    initials: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: User


# ─── Retrieval ────────────────────────────────────────────────────────────────
class Citation(BaseModel):
    chunk_id: str
    doc_id: str
    doc_title: str
    heading: str
    snippet: str
    score: float = 0.0


class ContextChunk(BaseModel):
    """A retrieved chunk with its full text — sent to the client so it can
    generate a grounded answer with the free in-browser model (Puter.js) when
    the backend LLM is unavailable (no key / rate-limited)."""
    chunk_id: str
    doc_id: str
    doc_title: str
    heading: str
    text: str
    score: float = 0.0


# ─── Chat (OnboardBot) ────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    question: str
    # Context is normally derived from the logged-in user; these are optional overrides.
    role: Optional[str] = None
    team: Optional[str] = None
    employee_id: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation] = Field(default_factory=list)
    confidence: float = 0.0
    escalated: bool = False
    gap_id: Optional[str] = None
    question_id: Optional[str] = None
    routed_to: Optional[str] = None  # mentor name, when escalated
    trace: List[str] = Field(default_factory=list)
    # When the backend LLM couldn't answer (no key / rate-limited / timeout), the
    # client should generate the answer itself with Puter.js free Gemini, using
    # `context` (the retrieved chunks) to keep it grounded + cited.
    needs_client_fallback: bool = False
    context: List[ContextChunk] = Field(default_factory=list)


class EscalateRequest(BaseModel):
    question: str


# ─── Tasks ────────────────────────────────────────────────────────────────────
class Task(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    category: str = "General"
    estimated_time: str = "30 min"
    citation: Optional[Citation] = None
    status: str = "pending"  # pending | in-progress | done
    assigned_to: Optional[str] = None      # mentee id
    assigned_by: Optional[str] = None      # mentor/admin id
    assigned_by_name: Optional[str] = None


class AssignTaskRequest(BaseModel):
    mentee_id: str
    title: str
    description: str
    category: str = "General"
    estimated_time: str = "30 min"


class UpdateTaskStatusRequest(BaseModel):
    status: str


class GenerateForMenteeRequest(BaseModel):
    mentee_id: str
    prompt: Optional[str] = None  # optional extra guidance / role focus


class AddEmployeeRequest(BaseModel):
    name: str
    email: str
    role: str = "New Hire"  # job title
    team: Optional[str] = None
    mentor_id: str


# ─── Plan builder ─────────────────────────────────────────────────────────────
class PlanResponse(BaseModel):
    tasks: List[Task] = Field(default_factory=list)
    message: str = ""


# ─── Escalated questions (mentor human-in-the-loop) ───────────────────────────
class EscalatedQuestion(BaseModel):
    id: str
    question: str
    mentee_id: Optional[str] = None
    mentee_name: Optional[str] = None
    mentor_id: Optional[str] = None
    reason: str = ""
    status: str = "open"  # open | answered
    answer: Optional[str] = None
    gap_id: Optional[str] = None
    created_at: str


class AnswerQuestionRequest(BaseModel):
    answer: str


# ─── Knowledge-base gaps ──────────────────────────────────────────────────────
class Gap(BaseModel):
    id: str
    question: str
    asked_by: Optional[str] = None
    role: Optional[str] = None
    reason: str = ""
    status: str = "open"  # open | routed | resolved
    created_at: str


# ─── Documents ────────────────────────────────────────────────────────────────
class DocumentMeta(BaseModel):
    id: str
    title: str
    chunks: int
    source: str = "seed"  # seed | upload
