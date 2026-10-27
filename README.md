# ConceptConnect AI

A personal, local-only web app that turns your notes, PDFs, Word docs, or
PowerPoint slides into an AI-generated multiple-choice quiz — complete with
instant explanations and a history of past quizzes you can revisit, rename,
or delete.

Everything runs on your machine. Nothing is deployed, and no data leaves
your computer except the text sent to OpenAI to generate each quiz.

---

## Features

- **Paste notes or upload a file** — supports `.pdf`, `.docx`, `.pptx`, `.txt`, and images (`.jpg`/`.png`)
- **Scanned PDFs and images are OCR'd** — if a PDF has no real text layer (it's a scan) or you upload a photo of notes, text is read directly off the page using an AI vision model
- **AI-generated quiz** — 1-N multiple-choice questions with an explanation for every answer. (N = Number of questions that OpenAI model can generate)
- **One question at a time** — see whether you got it right immediately, with the correct answer highlighted
- **Quiz history** — saved locally (SQLite) and listed in the sidebar, **including quizzes you abandon partway through** — progress is saved after every answer, not just on completion, and shows an "In progress" tag until finished. Click an unfinished quiz in the sidebar to pick it up where you left off — already-answered questions stay marked, and nothing else is marked until you click an option
- **Revisit past quizzes** — click any history entry to see a chat-style transcript of your questions, answers, and explanations
- **Rename or delete** past quizzes from the sidebar
- **Refresh-safe** — reloading the page mid-quiz won't lose your progress (closing the tab does, by design)
- **Light / dark mode** toggle

---

## Tech stack

| Layer     | Choice                              |
|-----------|--------------------------------------|
| Backend   | FastAPI (Python)                    |
| AI        | OpenAI API                          |
| Storage   | SQLite (single local file, no server) |
| Frontend  | Plain HTML, Tailwind CSS (CDN), vanilla JS — no framework, no build step |

---

## Project structure

```
conceptconnect/
├── main.py              # FastAPI app — API routes + serves the frontend
├── database.py           # SQLite: start / update / list / fetch / rename / delete quiz history
├── extractor.py           # Pulls text out of pdf / docx / pptx / txt / jpg / png, OCR fallback for scans
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

A default is used from `quiz_engine.py`. The model must support **image input** (vision), since it's also used to read text out of uploaded images and scanned PDFs.

### 3. Run it

**Windows — easiest way:** double-click `start.bat`. First run installs
everything and creates a virtual environment automatically; every run after
that just starts the server and opens your browser.

**Manual way (any OS):**

```
uvicorn main:app --reload
```

Then open **http://127.0.0.1:8000** in your browser.

To stop the server, close the terminal window (or press `Ctrl+C`).

---

## How data is handled

- **Quiz history** (title, score, questions, your answers, date, and whether
  it was completed) is stored in `quiz_history.db`, a local SQLite file
  created automatically the first time you run the app. A row is created the
  moment a quiz is generated and updated after every answer, so even a quiz
  you never finish is saved — it just stays tagged "In progress." It
  persists across restarts, but never leaves your machine.
- **Uploaded files** (pdf/docx/pptx/txt/jpg/png) are read entirely in memory
  to extract their text and are never saved to disk. For scanned PDFs and
  images, the raw image bytes are sent to OpenAI's vision model for text
  extraction, then discarded — they are not stored anywhere.
- **In-progress quizzes** are temporarily kept in your browser's
  `sessionStorage` so a page refresh doesn't lose your progress — this
  clears automatically when you close the tab.

---

## Notes

- This project is intended for personal, local use only — it is not set up
  for deployment or multi-user access (CORS is left open and there's no
  authentication, both of which are fine for `localhost` but not for a
  public server).
- Make sure the model name in your `.env` is a real, valid model available
  to your OpenAI account, or quiz generation will fail.
- A scanned PDF (no real text layer) is OCR'd one page at a time via the
  vision model — this is slower and costs more than a normal text PDF, since
  it's one API call per page instead of a single free local text extraction.
