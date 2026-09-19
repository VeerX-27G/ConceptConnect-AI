/* ============================================================
   ConceptConnect AI — frontend logic
   generateQuiz() below calls the FastAPI backend at /api/quiz.
   ============================================================ */

const html = document.documentElement;

const els = {
  themeToggle: document.getElementById("themeToggle"),
  newQuizBtn: document.getElementById("newQuizBtn"),
  historyList: document.getElementById("historyList"),
  historyEmpty: document.getElementById("historyEmpty"),
  viewTitle: document.getElementById("viewTitle"),

  intakePanel: document.getElementById("intakePanel"),
  notesInput: document.getElementById("notesInput"),
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("fileInput"),
  fileChosen: document.getElementById("fileChosen"),
  generateBtn: document.getElementById("generateBtn"),

  quizPanel: document.getElementById("quizPanel"),
  progressFill: document.getElementById("progressFill"),
  progressLabel: document.getElementById("progressLabel"),
  questionText: document.getElementById("questionText"),
  optionsList: document.getElementById("optionsList"),
  explanationBox: document.getElementById("explanationBox"),
  explanationVerdict: document.getElementById("explanationVerdict"),
  explanationText: document.getElementById("explanationText"),
  nextBtn: document.getElementById("nextBtn"),

  scorePanel: document.getElementById("scorePanel"),
  scoreNumber: document.getElementById("scoreNumber"),
  scoreSub: document.getElementById("scoreSub"),
  restartBtn: document.getElementById("restartBtn"),

  transcriptPanel: document.getElementById("transcriptPanel"),
  transcriptMeta: document.getElementById("transcriptMeta"),
  transcriptList: document.getElementById("transcriptList"),
};

let state = {
  quiz: null,
  currentIndex: 0,
  score: 0,
  answered: false,
  selectedFile: null,
  answers: [],
};

/* ---------------- Theme ---------------- */
// Initial class is already set in <head> to avoid a flash;
// this just keeps the toggle button in sync going forward.
els.themeToggle.addEventListener("click", () => {
  html.classList.toggle("dark");
  localStorage.setItem("cc-theme", html.classList.contains("dark") ? "dark" : "light");
});

/* ---------------- History (backed by SQLite via the FastAPI /api/history endpoints) ---------------- */
async function fetchHistory() {
  try {
    const res = await fetch("/api/history");
    if (!res.ok) 
      throw new Error("Failed to load history");
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function fetchSession(id) {
  const res = await fetch(`/api/history/${id}`);
  if (!res.ok) 
    throw new Error("Failed to load that quiz");
  return await res.json();
}

async function deleteSessionApi(id) {
  await fetch(`/api/history/${id}`, { method: "DELETE" });
}

async function renameSessionApi(id, title) {
  const res = await fetch(`/api/history/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "Rename failed");
  }
}

async function saveToHistory(entry) {
  try {
    const res = await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Saving quiz to history failed:", res.status, body);
      alert("Couldn't save this quiz to history — check the console for details.");
    }
  } catch (err) {
    console.error("Couldn't save quiz to history:", err);
    alert("Couldn't reach the server to save this quiz to history.");
  }
  renderHistory();
}

async function renderHistory() {
  const history = await fetchHistory();
  els.historyList.innerHTML = "";

  if (history.length === 0) {
    els.historyEmpty.classList.remove("hidden");
    return;
  }
  els.historyEmpty.classList.add("hidden");

  history.forEach((item) => {
    const li = document.createElement("li");
    li.className =
      "group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-white dark:hover:bg-[#17142B] transition-colors";
    li.innerHTML = `
      <div class="min-w-0">
        <div class="text-[13.5px] font-medium truncate">${item.title}</div>
        <div class="text-xs font-mono text-[#6B6765] dark:text-[#8B87A8] mt-0.5">${item.score}/${item.total} · ${item.date}</div>
      </div>
      <div class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
        <button data-rename-id="${item.id}" data-rename-title="${item.title.replace(/"/g, "&quot;")}" aria-label="Rename quiz"
          class="w-6 h-6 flex items-center justify-center rounded-md text-[#6B6765] dark:text-[#8B87A8] hover:text-brandindigo hover:bg-brandindigo/10 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>
          </svg>
        </button>
        <button data-delete-id="${item.id}" aria-label="Delete quiz"
          class="w-6 h-6 flex items-center justify-center rounded-md text-[#6B6765] dark:text-[#8B87A8] hover:text-red-500 hover:bg-red-500/10 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/>
          </svg>
        </button>
      </div>
    `;

    li.addEventListener("click", () => viewSession(item.id));

    const renameBtn = li.querySelector("[data-rename-id]");
    renameBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const current = renameBtn.getAttribute("data-rename-title");
      const next = prompt("Rename this quiz:", current);
      if (next === null) 
        return; // cancelled
      const trimmed = next.trim();
      if (!trimmed || trimmed === current) 
        return;

      try {
        await renameSessionApi(item.id, trimmed);
        renderHistory();
      } catch (err) {
        console.error(err);
        alert("Couldn't rename that quiz.");
      }
    });

    const deleteBtn = li.querySelector("[data-delete-id]");
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await deleteSessionApi(item.id);
      renderHistory();
    });

    els.historyList.appendChild(li);
  });
}

/* ---------------- Persist in-progress/just-finished quiz across refreshes ----------------
   Uses sessionStorage (not localStorage) so it survives a reload but still
   clears itself when the tab/browser is closed, matching the "erase on
   close" intent — only completed history in SQLite is meant to be durable. */
const ACTIVE_QUIZ_KEY = "cc-active-quiz";

function saveActiveState(phase) {
  sessionStorage.setItem(
    ACTIVE_QUIZ_KEY,
    JSON.stringify({
      phase, // "quiz" | "score"
      quiz: state.quiz,
      currentIndex: state.currentIndex,
      score: state.score,
      answers: state.answers,
    })
  );
}

function loadActiveState() {
  try {
    const raw = sessionStorage.getItem(ACTIVE_QUIZ_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearActiveState() {
  sessionStorage.removeItem(ACTIVE_QUIZ_KEY);
}


function showIntake() {
  els.intakePanel.classList.remove("hidden");
  els.quizPanel.classList.add("hidden");
  els.scorePanel.classList.add("hidden");
  els.transcriptPanel.classList.add("hidden");
  els.viewTitle.textContent = "New quiz";
}

function showQuiz() {
  els.intakePanel.classList.add("hidden");
  els.quizPanel.classList.remove("hidden");
  els.scorePanel.classList.add("hidden");
  els.transcriptPanel.classList.add("hidden");
  els.viewTitle.textContent = "Quiz in progress";
}

function showScore() {
  els.intakePanel.classList.add("hidden");
  els.quizPanel.classList.add("hidden");
  els.scorePanel.classList.remove("hidden");
  els.transcriptPanel.classList.add("hidden");
  els.viewTitle.textContent = "Results";
}

function showTranscript() {
  els.intakePanel.classList.add("hidden");
  els.quizPanel.classList.add("hidden");
  els.scorePanel.classList.add("hidden");
  els.transcriptPanel.classList.remove("hidden");
  els.viewTitle.textContent = "Past quiz";
}

/* ---------------- Viewing a past quiz as a chat transcript ---------------- */
const BOT_BUBBLE =
  "max-w-[85%] bg-[#EEF0FA] dark:bg-[#14111F] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed";
const USER_BUBBLE =
  "max-w-[85%] ml-auto bg-gradient-to-br from-brandblue via-brandindigo to-brandviolet text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed";

async function viewSession(id) {
  try {
    const session = await fetchSession(id);
    renderTranscript(session);
    showTranscript();
  } catch (err) {
    console.error(err);
    alert("Couldn't load that quiz.");
  }
}

function renderTranscript(session) {
  // Transcript is read-only, so we don't need to keep it in state or sessionStorage.
  els.transcriptMeta.textContent = `${session.title} · ${session.score}/${session.total} · ${session.date}`;
  els.transcriptList.innerHTML = "";

  // Render each question, the user's answer, and the explanation.
  session.questions.forEach((q, i) => {
    const userIndex = session.answers[i];
    const isCorrect = userIndex === q.correct_index;
    const userAnswerText = userIndex != null ? q.options[userIndex] : "No answer";

    const wrapper = document.createElement("div");
    wrapper.className = "flex flex-col gap-3";
    // '$' means "escape" in template literals, so we have to use double $$ to get a literal $ in the output.
    wrapper.innerHTML = `
      <div class="${BOT_BUBBLE}">
        <p class="font-heading font-semibold mb-2">Q${i + 1}. ${q.question}</p>
        <ul class="space-y-1">
          ${q.options
            // Mark the correct answer in green, and the others in gray. The user's answer is shown below in a separate bubble.
            .map((opt, oi) => {
              let cls = "text-[#6B6765] dark:text-[#8B87A8]";
              if (oi === q.correct_index) 
                cls = "text-emerald-600 dark:text-emerald-400 font-medium";
              return `<li class="${cls}">${opt}</li>`;
            })
            .join("")}
        </ul>
      </div>

      <div class="${USER_BUBBLE}">${userAnswerText}</div>

      <div class="${BOT_BUBBLE}">
        <p class="font-semibold mb-1">${isCorrect ? "✅ Correct" : "❌ Not quite"}</p>
        <p class="text-[#6B6765] dark:text-[#8B87A8]">${q.explanation}</p>
      </div>
    `;
    els.transcriptList.appendChild(wrapper);
  });
}

/* ---------------- File intake ---------------- */
els.dropzone.addEventListener("click", () => els.fileInput.click());

els.dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  els.dropzone.classList.add("border-brandindigo");
});

els.dropzone.addEventListener("dragleave", () => {
  els.dropzone.classList.remove("border-brandindigo");
});

els.dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  els.dropzone.classList.remove("border-brandindigo");
  if (e.dataTransfer.files.length) {
    handleFile(e.dataTransfer.files[0]);
  }
});

els.fileInput.addEventListener("change", () => {
  if (els.fileInput.files.length) {
    handleFile(els.fileInput.files[0]);
  }
});

function handleFile(file) {
  state.selectedFile = file;
  els.fileChosen.textContent = `Attached: ${file.name}`;
}

/* ---------------- Quiz generation (real call to the FastAPI backend) ---------------- */
async function generateQuiz(content, file) {
  const formData = new FormData();
  if (file) 
    formData.append("file", file);
  if (content) 
    formData.append("content", content);

  const res = await fetch("/api/quiz", { method: "POST", body: formData });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to generate quiz");
  }

  return await res.json();
}

els.generateBtn.addEventListener("click", async () => {
  const content = els.notesInput.value.trim();
  if (!content && !state.selectedFile) {
    els.notesInput.focus();
    return;
  }

  els.generateBtn.disabled = true;
  els.generateBtn.textContent = "Generating...";

  try {
    const quiz = await generateQuiz(content, state.selectedFile);

    state.quiz = quiz;
    state.currentIndex = 0;
    state.score = 0;
    state.answers = [];

    saveActiveState("quiz");
    showQuiz();
    renderQuestion();
  } catch (err) {
    console.error(err);
    alert(err.message || "Something went wrong generating the quiz.");
  } finally {
    els.generateBtn.disabled = false;
    els.generateBtn.textContent = "Generate quiz";
  }
});

/* ---------------- Quiz flow ---------------- */
const OPTION_BASE_CLASSES =
  "px-4 py-3.5 rounded-2xl border border-[#DEE1F2] dark:border-[#2A2540] bg-white dark:bg-[#17142B] text-sm cursor-pointer transition-colors hover:border-brandindigo";

function renderQuestion() {
  const { questions } = state.quiz;
  const q = questions[state.currentIndex];

  const pct = (state.currentIndex / questions.length) * 100;
  els.progressFill.style.width = `${pct}%`;
  els.progressLabel.textContent = `Question ${state.currentIndex + 1} of ${questions.length}`;

  els.questionText.textContent = q.question;
  els.optionsList.innerHTML = "";
  els.explanationBox.classList.add("hidden");
  els.nextBtn.classList.add("hidden");

  // Render the options for this question. Move to next question when the user clicks one, and show the explanation.
  q.options.forEach((opt, i) => {
    const div = document.createElement("div");
    div.className = OPTION_BASE_CLASSES;
    div.textContent = opt;
    div.addEventListener("click", () => selectAnswer(i));
    els.optionsList.appendChild(div);
  });

  // If this question was already answered before a refresh, re-show that
  // state instead of a fresh unanswered question.
  const existingAnswer = state.answers[state.currentIndex];
  if (existingAnswer !== undefined && existingAnswer !== null) {
    state.answered = true;
    applyAnsweredVisuals(existingAnswer);
  } else {
    state.answered = false;
  }
}

function applyAnsweredVisuals(index) {
  const q = state.quiz.questions[state.currentIndex];
  const optionEls = els.optionsList.querySelectorAll("div");

  optionEls.forEach((el, i) => {
    el.classList.add("pointer-events-none");

    if (i === q.correct_index) {
      el.classList.remove("border-[#DEE1F2]", "dark:border-[#2A2540]");
      el.classList.add("border-emerald-500", "bg-emerald-500/10");
    }
    if (i === index && index !== q.correct_index) {
      el.classList.remove("border-[#DEE1F2]", "dark:border-[#2A2540]");
      el.classList.add("border-red-500", "bg-red-500/10");
    }
  });

  const isCorrect = index === q.correct_index;

  els.explanationVerdict.textContent = isCorrect ? "✅ Correct" : "❌ Not quite";
  els.explanationText.textContent = q.explanation;
  els.explanationBox.classList.remove("hidden");
  els.nextBtn.classList.remove("hidden");

  const isLast = state.currentIndex === state.quiz.questions.length - 1;
  els.nextBtn.textContent = isLast ? "See results" : "Next question";
}

function selectAnswer(index) {
  if (state.answered) 
    return;
  state.answered = true;
  state.answers[state.currentIndex] = index;

  const q = state.quiz.questions[state.currentIndex];
  if (index === q.correct_index) 
    state.score += 1;

  applyAnsweredVisuals(index);
  saveActiveState("quiz");
}

els.nextBtn.addEventListener("click", () => {
  const isLast = state.currentIndex === state.quiz.questions.length - 1;
  if (isLast) {
    finishQuiz();
  } else {
    state.currentIndex += 1;
    saveActiveState("quiz");
    renderQuestion();
  }
});

function renderScoreDisplay() {
  const total = state.quiz.questions.length;
  els.progressFill.style.width = "100%";
  els.scoreNumber.textContent = `${state.score}/${total}`;
  els.scoreSub.textContent =
    state.score === total
      ? "Perfect score — nice work."
      : "Review the explanations above to close the gaps.";
}

function finishQuiz() {
  const total = state.quiz.questions.length;

  saveToHistory({
    title: state.quiz.title,
    score: state.score,
    total,
    questions: state.quiz.questions,
    answers: state.answers,
  });

  renderScoreDisplay();
  saveActiveState("score");
  showScore();
}

/* ---------------- Reset ---------------- */
function resetIntake() {
  state.quiz = null;
  state.currentIndex = 0;
  state.score = 0;
  state.selectedFile = null;
  state.answers = [];
  els.notesInput.value = "";
  els.fileInput.value = "";
  els.fileChosen.textContent = "";
  clearActiveState();
  showIntake();
}

els.newQuizBtn.addEventListener("click", resetIntake);
els.restartBtn.addEventListener("click", resetIntake);

/* ---------------- Init ---------------- */
renderHistory();

const restored = loadActiveState();
if (restored && restored.quiz) {
  state.quiz = restored.quiz;
  state.currentIndex = restored.currentIndex;
  state.score = restored.score;
  state.answers = restored.answers;

  if (restored.phase === "score") {
    renderScoreDisplay();
    showScore();
  } else {
    showQuiz();
    renderQuestion();
  }
} else {
  showIntake();
}