import json
import os
import sqlite3
from datetime import date
from typing import Any, Optional

# Anchored to this file's directory so the DB location doesn't depend on
# which folder you happen to run `uvicorn` from.
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "quiz_history.db")


def get_connection():
    return sqlite3.connect(DB_PATH)


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS quiz_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                score INTEGER NOT NULL,
                total INTEGER NOT NULL,
                date TEXT NOT NULL,
                questions_json TEXT NOT NULL DEFAULT '[]',
                answers_json TEXT NOT NULL DEFAULT '[]'
            )
            """
        )
        # Backfill columns for any db file created before this schema existed.
        existing_cols = {row[1] for row in conn.execute("PRAGMA table_info(quiz_sessions)")}
        if "questions_json" not in existing_cols:
            conn.execute("ALTER TABLE quiz_sessions ADD COLUMN questions_json TEXT NOT NULL DEFAULT '[]'")
        if "answers_json" not in existing_cols:
            conn.execute("ALTER TABLE quiz_sessions ADD COLUMN answers_json TEXT NOT NULL DEFAULT '[]'")


def save_quiz_session(
    title: str,
    score: int,
    total: int,
    questions: list[dict[str, Any]],
    answers: list[Optional[int]],
) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO quiz_sessions (title, score, total, date, questions_json, answers_json)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                title,
                score,
                total,
                date.today().isoformat(),
                json.dumps(questions),
                json.dumps(answers),
            ),
        )
        return cur.lastrowid


def get_history() -> list[dict]:
    """Lightweight list for the sidebar — no question content, just enough to render each row."""
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT id, title, score, total, date FROM quiz_sessions ORDER BY id DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def get_session(session_id: int) -> Optional[dict]:
    """Full detail for the chat-transcript view: questions + what the user answered."""
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT id, title, score, total, date, questions_json, answers_json FROM quiz_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        if row is None:
            return None
        data = dict(row)
        data["questions"] = json.loads(data.pop("questions_json"))
        data["answers"] = json.loads(data.pop("answers_json"))
        return data


def delete_session(session_id: int) -> bool:
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM quiz_sessions WHERE id = ?", (session_id,))
        return cur.rowcount > 0


def rename_session(session_id: int, new_title: str) -> bool:
    with get_connection() as conn:
        cur = conn.execute(
            "UPDATE quiz_sessions SET title = ? WHERE id = ?",
            (new_title, session_id),
        )
        return cur.rowcount > 0