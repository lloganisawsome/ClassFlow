import { dbListen, dbSet, toast } from "../app.js";
import { icon } from "../ui/icons.js";

export function renderNotes({ classId, classData }) {
  const wrap = document.createElement("div");
  wrap.className = "view";
  wrap.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Notes</h1><p class="view-subtitle">Keep quick lesson notes, reminders, and plans by class</p></div>
      <button class="btn btn-secondary" id="notes-copy-btn">${icon("copy", "Copy Notes")}</button>
    </div>
    <div class="card" style="max-width:900px">
      <label class="field-label" for="notes-input">Class Notes</label>
      <textarea id="notes-input" class="notes-textarea" placeholder="Lesson outline, reminders, homework notes, substitute plans..."></textarea>
      <div class="notes-toolbar">
        <span id="notes-status" class="settings-row-desc">${classId ? "Saved automatically for this class." : "Select a class to save notes."}</span>
        <button class="btn btn-primary btn-sm" id="notes-save-btn">${icon("check", "Save Now")}</button>
      </div>
    </div>
  `;

  const textarea = wrap.querySelector("#notes-input");
  const status = wrap.querySelector("#notes-status");
  let saveTimer = null;

  const setStatus = (text) => {
    status.textContent = text;
  };

  const saveNotes = async () => {
    if (!classId) {
      toast("Select a class first.", "error");
      return;
    }
    await dbSet(`classes/${classId}/notes/main`, {
      body: textarea.value,
      updatedAt: Date.now(),
    });
    setStatus("Saved just now.");
  };

  if (classId) {
    dbListen(`classes/${classId}/notes/main`, (snap) => {
      const note = snap.exists() ? snap.val() : null;
      textarea.value = note?.body || "";
    });
  } else if (classData?.notes?.main?.body) {
    textarea.value = classData.notes.main.body;
  }

  textarea.addEventListener("input", () => {
    setStatus(classId ? "Saving..." : "Select a class to save notes.");
    clearTimeout(saveTimer);
    if (!classId) return;
    saveTimer = setTimeout(saveNotes, 500);
  });

  wrap.querySelector("#notes-save-btn").addEventListener("click", saveNotes);
  wrap.querySelector("#notes-copy-btn").addEventListener("click", async () => {
    await navigator.clipboard.writeText(textarea.value);
    toast("Notes copied.", "success");
  });

  return wrap;
}
