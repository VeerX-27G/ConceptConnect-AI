# ConceptConnect AI

A personal, local-only web app that turns your notes, PDFs, Word docs,
PowerPoint slides, or images into an AI-generated multiple-choice quiz — complete with
instant explanations and a history of past quizzes you can revisit, rename,
or delete.

Everything runs on your machine. Nothing is deployed, and no data leaves
your computer except the text sent to OpenAI to generate each quiz.

Model used: [GPT 6 Astra](https://openai.com/index/gpt-6-astra/)

---

## Features

- **Paste notes or upload a file** — supports `.pdf`, `.docx`, `.pptx`, `.jpg/.jpej/.png` and `.txt`
- **AI-generated quiz** — 1-N multiple-choice questions with an explanation for every answer. N is total number of questions depending on the content length.
- **One question at a time** — see whether you got it right immediately, with the correct answer highlighted
- **Quiz history** — every completed quiz is saved locally (SQLite) and listed in the sidebar
- **Revisit past quizzes** — click any history entry to see a chat-style transcript of your questions, answers, and explanations
- **Rename or delete** past quizzes from the sidebar
- **Refresh-safe** — reloading the page mid-quiz won't lose your progress (closing the tab does, by design)
- **Light / dark mode** toggle

---

## Tech stack

| Layer                                    | Choice                                |
|------------------------------------------|---------------------------------------|
| Backend                                  | FastAPI (Python)                      |
| AI                                       | OpenAI API                            |
| Storage                                  | SQLite (single local file, no server) |
| Frontend                                 | HTML5, Tailwind CSS (CDN), Vanilla JS — no framework, no build step      |

---

## Project structure

```
conceptconnect/
├── main.py              # FastAPI app — API routes + serves the frontend
├── database.py           # SQLite: save / list / fetch / rename / delete quiz history
├── extractor.py           # Pulls plain text out of pdf / docx / pptx / txt / (jpg, jpeg, png)
├── quiz_engine.py         # Builds the prompt and calls the OpenAI API
├── requirements.txt
├── start.bat              # One-click launcher (Windows)
├── .env                   # Your API key + model name (you create this — not committed)
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

---

## Setup

### 1. Install Python dependencies

```
pip install -r requirements.txt
```

### 2. Create a `.env` file

In the project root (next to `main.py`), create a file named `.env`:

```
OPENAI_API_KEY=your-api-key-here
```

Get your OpenAI API key from [OpenAI](https://platform.openai.com/login?next=%2Fapi-keys).

### 3. Run it

**Windows — easiest way:** double-click `start.bat`. First run installs
everything and creates a virtual environment automatically; every run after
that just starts the server and opens your browser.

**Manual way (any OS):**

```
uvicorn main:app --reload
```

Then open **http://127.0.0.1:8000** in your browser.

![![Screenshot 2026-09-25 104545.png](../../Pictures/Screenshots/Screenshot%202026-09-25%20104545.png)](img.png)

To stop the server, close the terminal window (or press `Ctrl+C`).

---

## How data is handled

- **Quiz history** (title, score, questions, your answers, date) is stored
  in `quiz_history.db`, a local SQLite file created automatically the first
  time you run the app. It persists across restarts, but never leaves your
  machine.
- **Uploaded files** (pdf/docx/pptx/txt/(jpg, jpeg, png)) are read entirely in memory to
  extract their text and are never saved to disk.
- **In-progress quizzes** are temporarily kept in your browser's
  `sessionStorage` so a page refresh doesn't lose your progress — this
  clears automatically when you close the tab.

---

## Notes

This project is currently intended for personal, local use only — it is not set up
  for deployment or multi-user access (CORS is left open and there's no
  authentication, both of which are fine for `localhost` but not for a
  public server).