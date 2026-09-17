import asyncio
from typing import Any, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database import delete_session, get_history, get_session, init_db, rename_session, save_quiz_session
from extractor import extract_text_from_upload
from quiz_engine import generate_quiz

app = FastAPI(title="ConceptConnect AI")

init_db()

# Kept open since this only ever runs on localhost for personal use.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class HistoryEntry(BaseModel):
    title: str
    score: int
    total: int
    questions: list[dict[str, Any]]
    answers: list[Optional[int]]


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

    # generate_quiz() makes a blocking OpenAI call — run it off the event loop
    # so the server can keep handling other requests while it waits.
    quiz = await asyncio.to_thread(generate_quiz, text)
    quiz["title"] = title
    return quiz


@app.post("/api/history")
async def add_history(entry: HistoryEntry):
    session_id = save_quiz_session(
        title=entry.title,
        score=entry.score,
        total=entry.total,
        questions=entry.questions,
        answers=entry.answers,
    )
    return {"status": "saved", "id": session_id}


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


# Serve the frontend last, as a catch-all — API routes above take priority.
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")