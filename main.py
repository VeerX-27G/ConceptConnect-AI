import asyncio
from typing import Any, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database import (
    delete_session,
    get_history,
    get_session,
    init_db,
    rename_session,
    start_quiz_session,
    update_quiz_session,
)
from extractor import extract_text_from_upload
from quiz_engine import generate_quiz

app = FastAPI(title="ConceptConnect AI")

init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class StartSessionPayload(BaseModel):
    title: str
    total: int
    questions: list[dict[str, Any]]


class UpdateSessionPayload(BaseModel):
    score: int
    answers: list[Optional[int]]
    completed: bool


class RenamePayload(BaseModel):
    title: str


@app.post("/api/quiz")
async def create_quiz(
    content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    if not content and not file:
        raise HTTPException(status_code=400, detail="Provide notes text or a file.")

    if file:
        try:
            text = await extract_text_from_upload(file)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        title = file.filename
    else:
        text = content
        title = content[:40] + ("..." if len(content) > 40 else "")

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Couldn't extract any readable text from that.")

    quiz = await asyncio.to_thread(generate_quiz, text)
    quiz["title"] = title
    return quiz


@app.post("/api/history")
async def start_history(payload: StartSessionPayload):
    """Create the history row as soon as a quiz is generated, before any
    question is answered — so it shows up in history even if abandoned."""
    session_id = start_quiz_session(
        title=payload.title,
        total=payload.total,
        questions=payload.questions,
    )
    return {"id": session_id}


@app.put("/api/history/{session_id}")
async def update_history(session_id: int, payload: UpdateSessionPayload):
    """Called after every answer (completed=False) and once more when the
    quiz finishes (completed=True)."""
    updated = update_quiz_session(
        session_id=session_id,
        score=payload.score,
        answers=payload.answers,
        completed=payload.completed,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Quiz session not found.")
    return {"status": "updated"}


@app.get("/api/history")
async def list_history():
    return get_history()


@app.get("/api/history/{session_id}")
async def get_history_item(session_id: int):
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Quiz session not found.")
    return session


@app.delete("/api/history/{session_id}")
async def remove_history_item(session_id: int):
    deleted = delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Quiz session not found.")
    return {"status": "deleted"}


@app.patch("/api/history/{session_id}")
async def rename_history_item(session_id: int, payload: RenamePayload):
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title can't be empty.")
    renamed = rename_session(session_id, title)
    if not renamed:
        raise HTTPException(status_code=404, detail="Quiz session not found.")
    return {"status": "renamed", "title": title}


app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")