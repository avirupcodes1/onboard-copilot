"""In-memory application state + seed loader.

State lives in a single process-wide object: it persists for a long-running
server's lifetime (local dev / a warm Vercel instance) and reseeds on each cold
start. So the demo always has documents, people, tasks, and one escalated
question; writes (new tasks, answered questions, status changes) persist within
a warm instance. Swap `Store` for Postgres/Upstash to make writes durable.
"""
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from . import rag
from .models import DocumentMeta, EscalatedQuestion, Gap

_SEED_DIR = os.path.join(os.path.dirname(__file__), "seed")
_DOCS_DIR = os.path.join(_SEED_DIR, "docs")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# Pre-assigned tasks so every mentee dashboard is populated on first load.
_SEED_TASKS = [
    # Jordan Lee (emp-1) — Engineering, mentor Sarah (mentor-1)
    {"id": "t-1", "title": "Complete IT security training", "description": "Finish the mandatory security awareness course and pass the quiz (80%+) to unlock production access.", "category": "Compliance", "estimated_time": "30 min", "status": "done", "assigned_to": "emp-1", "assigned_by": "mentor-1", "assigned_by_name": "Sarah Chen"},
    {"id": "t-2", "title": "Set up local dev environment", "description": "Clone the monorepo, install deps, and get services running locally per the engineering guide.", "category": "Tools", "estimated_time": "45 min", "status": "in-progress", "assigned_to": "emp-1", "assigned_by": "mentor-1", "assigned_by_name": "Sarah Chen"},
    {"id": "t-3", "title": "First 1:1 with your mentor", "description": "Schedule and complete your first sync with Sarah Chen.", "category": "People", "estimated_time": "30 min", "status": "done", "assigned_to": "emp-1", "assigned_by": "mentor-1", "assigned_by_name": "Sarah Chen"},
    {"id": "t-4", "title": "Open your first pull request", "description": "Make a small change and open a PR following the 2-approval, CI-green workflow.", "category": "Learning", "estimated_time": "1 hour", "status": "pending", "assigned_to": "emp-1", "assigned_by": "mentor-1", "assigned_by_name": "Sarah Chen"},
    # Priya Kapoor (emp-2) — Product, mentor Priya Patel (mentor-3)
    {"id": "t-5", "title": "Set up product tooling", "description": "Get access to Jira, Confluence, and Figma with the right permissions.", "category": "Tools", "estimated_time": "20 min", "status": "done", "assigned_to": "emp-2", "assigned_by": "mentor-3", "assigned_by_name": "Priya Patel"},
    {"id": "t-6", "title": "Review the Q3 product roadmap", "description": "Read the roadmap and note questions for your mentor.", "category": "Learning", "estimated_time": "45 min", "status": "pending", "assigned_to": "emp-2", "assigned_by": "mentor-3", "assigned_by_name": "Priya Patel"},
    # Marcus Stone (emp-3) — Sales, mentor Mike Johnson (mentor-2)
    {"id": "t-7", "title": "Salesforce CRM walkthrough", "description": "Complete the CRM tour and log five practice opportunities.", "category": "Tools", "estimated_time": "60 min", "status": "pending", "assigned_to": "emp-3", "assigned_by": "mentor-2", "assigned_by_name": "Mike Johnson"},
    {"id": "t-8", "title": "Study the sales playbook", "description": "Read the playbook: process stages, BANT qualification, and commission structure.", "category": "Learning", "estimated_time": "45 min", "status": "in-progress", "assigned_to": "emp-3", "assigned_by": "mentor-2", "assigned_by_name": "Mike Johnson"},
]

# One pre-escalated question so the mentor's review inbox isn't empty.
_SEED_ESCALATION = {
    "question": "What's the parental leave policy for employees in Germany?",
    "mentee_id": "emp-1", "mentee_name": "Jordan Lee", "mentor_id": "mentor-1",
    "reason": "Low retrieval confidence; the docs only cover US-based employees.",
}


class Store:
    def __init__(self):
        self.documents: Dict[str, dict] = {}
        self.chunks: List[dict] = []
        self.index: Optional[rag.HybridIndex] = None
        self.employees: List[dict] = []
        self.mentors: List[dict] = []
        self.tasks: List[dict] = []
        self.gaps: List[Gap] = []
        self.questions: List[EscalatedQuestion] = []
        self._seed()

    # ── seeding ───────────────────────────────────────────────────────────────
    def _seed(self):
        if os.path.isdir(_DOCS_DIR):
            for fname in sorted(os.listdir(_DOCS_DIR)):
                if not fname.endswith(".md"):
                    continue
                with open(os.path.join(_DOCS_DIR, fname), encoding="utf-8") as fh:
                    text = fh.read()
                doc_id = os.path.splitext(fname)[0]
                self._ingest(doc_id, _title_from_markdown(text, doc_id), text, source="seed")
        self._rebuild_index()

        people = os.path.join(_SEED_DIR, "people.json")
        if os.path.exists(people):
            with open(people, encoding="utf-8") as fh:
                data = json.load(fh)
            self.mentors = data.get("mentors", [])
            self.employees = data.get("employees", [])

        self.tasks = [dict(t) for t in _SEED_TASKS]
        self.questions = [
            EscalatedQuestion(id=f"q-{uuid.uuid4().hex[:8]}", status="open", created_at=_now(), **_SEED_ESCALATION)
        ]

    def _ingest(self, doc_id: str, title: str, text: str, source: str):
        self.documents[doc_id] = {"id": doc_id, "title": title, "source": source}
        self.chunks = [c for c in self.chunks if c["doc_id"] != doc_id]
        self.chunks.extend(rag.chunk_markdown(doc_id, title, text))

    def _rebuild_index(self):
        self.index = rag.HybridIndex(self.chunks)

    # ── people lookups ────────────────────────────────────────────────────────
    def employee_by_id(self, emp_id: str) -> Optional[dict]:
        return next((e for e in self.employees if e["id"] == emp_id), None)

    def mentor_by_id(self, mentor_id: str) -> Optional[dict]:
        return next((m for m in self.mentors if m["id"] == mentor_id), None)

    def mentees_for_mentor(self, mentor_id: str) -> List[dict]:
        return [e for e in self.employees if e.get("mentor_id") == mentor_id]

    def add_employee(self, emp: dict) -> dict:
        self.employees.append(emp)
        return emp

    # ── tasks ─────────────────────────────────────────────────────────────────
    def tasks_for(self, emp_id: str) -> List[dict]:
        return [t for t in self.tasks if t.get("assigned_to") == emp_id]

    def add_task(self, task: dict) -> dict:
        task.setdefault("id", f"task-{uuid.uuid4().hex[:8]}")
        self.tasks.append(task)
        return task

    def add_tasks(self, tasks: List[dict]) -> List[dict]:
        return [self.add_task(t) for t in tasks]

    def update_task_status(self, task_id: str, status: str) -> Optional[dict]:
        for t in self.tasks:
            if t.get("id") == task_id:
                t["status"] = status
                return t
        return None

    def delete_task(self, task_id: str) -> bool:
        for i, t in enumerate(self.tasks):
            if t.get("id") == task_id:
                del self.tasks[i]
                return True
        return False

    def task_progress(self, emp_id: str) -> int:
        ts = self.tasks_for(emp_id)
        if not ts:
            return 0
        done = sum(1 for t in ts if t.get("status") == "done")
        return round(100 * done / len(ts))

    # ── escalated questions (mentor human-in-the-loop) ────────────────────────
    def add_question(self, question: str, mentee_id, mentee_name, mentor_id, reason, gap_id) -> EscalatedQuestion:
        q = EscalatedQuestion(
            id=f"q-{uuid.uuid4().hex[:8]}", question=question, mentee_id=mentee_id,
            mentee_name=mentee_name, mentor_id=mentor_id, reason=reason, gap_id=gap_id,
            status="open", created_at=_now(),
        )
        self.questions.insert(0, q)
        return q

    def questions_for_mentor(self, mentor_id: str) -> List[EscalatedQuestion]:
        return [q for q in self.questions if q.mentor_id == mentor_id]

    def questions_for_mentee(self, mentee_id: str) -> List[EscalatedQuestion]:
        return [q for q in self.questions if q.mentee_id == mentee_id]

    def answer_question(self, qid: str, answer: str) -> Optional[EscalatedQuestion]:
        for q in self.questions:
            if q.id == qid:
                q.answer = answer
                q.status = "answered"
                if q.gap_id:
                    self.resolve_gap(q.gap_id)
                return q
        return None

    # ── documents ─────────────────────────────────────────────────────────────
    def add_document(self, doc_id: str, title: str, text: str) -> DocumentMeta:
        self._ingest(doc_id, title, text, source="upload")
        self._rebuild_index()
        return self.document_meta(doc_id)

    def delete_document(self, doc_id: str) -> bool:
        if doc_id not in self.documents:
            return False
        del self.documents[doc_id]
        self.chunks = [c for c in self.chunks if c["doc_id"] != doc_id]
        self._rebuild_index()
        return True

    def document_meta(self, doc_id: str) -> DocumentMeta:
        d = self.documents[doc_id]
        n = sum(1 for c in self.chunks if c["doc_id"] == doc_id)
        return DocumentMeta(id=d["id"], title=d["title"], chunks=n, source=d["source"])

    def list_documents(self) -> List[DocumentMeta]:
        return [self.document_meta(doc_id) for doc_id in self.documents]

    # ── gaps ──────────────────────────────────────────────────────────────────
    def add_gap(self, question: str, reason: str, asked_by, role) -> Gap:
        gap = Gap(id=f"gap-{uuid.uuid4().hex[:8]}", question=question, asked_by=asked_by,
                  role=role, reason=reason, status="routed", created_at=_now())
        self.gaps.insert(0, gap)
        return gap

    def resolve_gap(self, gap_id: str) -> bool:
        for g in self.gaps:
            if g.id == gap_id:
                g.status = "resolved"
                return True
        return False


def _title_from_markdown(text: str, fallback: str) -> str:
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("# "):
            return line[2:].strip()
    return fallback.replace("-", " ").title()


_store: Optional[Store] = None


def get_store() -> Store:
    global _store
    if _store is None:
        _store = Store()
    return _store
