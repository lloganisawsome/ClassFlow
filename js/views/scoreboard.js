// js/views/scoreboard.js
import { dbSet, dbUpdate, dbRemove, dbListen, toast, openConfirmModal, openPromptModal } from "../app.js";
import { icon } from "../ui/icons.js";

export function renderScoreboard({ classId, classData }) {
  const wrap = document.createElement("div");
  wrap.className = "view";
  wrap.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Scoreboard</h1><p class="view-subtitle">Live scores — synced across devices</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" id="score-reset-all">${icon("reset", "Reset Round")}</button>
        <button class="btn btn-primary btn-sm" id="score-add-btn">${icon("add", "Add Entry")}</button>
      </div>
    </div>
    <div class="scoreboard-grid" id="scoreboard-grid"></div>
    <div id="no-scores" style="display:none;text-align:center;padding:48px;color:var(--text-muted)">
      <p style="font-size:1.1rem">No scores yet.</p>
      <p style="font-size:.85rem;margin-top:6px">Click "Add Entry" to get started.</p>
    </div>
  `;

  function renderScores(scores) {
    const grid = wrap.querySelector("#scoreboard-grid");
    const empty = wrap.querySelector("#no-scores");
    if (!scores || !Object.keys(scores).length) {
      grid.innerHTML = ""; empty.style.display = ""; return;
    }
    empty.style.display = "none";
    // Build sorted list
    const entries = Object.entries(scores).sort((a,b) => (b[1].score||0) - (a[1].score||0));
    grid.innerHTML = entries.map(([id, entry], rank) => `
      <div class="score-card" data-id="${id}">
        ${rank === 0 ? `<div style="position:absolute;top:8px;left:10px;width:20px;height:20px">${icon("trophy")}</div>` : ''}
        <button class="score-delete" data-id="${id}" title="Remove" aria-label="Remove">${icon("close")}</button>
        <div class="score-name">${entry.name || "Entry"}</div>
        <div class="score-value" id="score-val-${id}">${entry.score ?? 0}</div>
        <div class="score-btns">
          <button class="score-btn minus" data-id="${id}" data-delta="-1">−</button>
          <button class="score-btn plus"  data-id="${id}" data-delta="1">+</button>
        </div>
      </div>
    `).join("");

    grid.querySelectorAll(".score-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id    = btn.dataset.id;
        const delta = parseInt(btn.dataset.delta);
        const cur   = scores[id]?.score ?? 0;
        const nv    = cur + delta;
        if (classId) await dbUpdate(`classes/${classId}/scoreboard/${id}`, { score: nv });
        // Local bump animation
        const valEl = grid.querySelector(`#score-val-${id}`);
        if (valEl) { valEl.textContent = nv; valEl.classList.add("bump"); setTimeout(() => valEl.classList.remove("bump"), 400); }
      });
    });
    grid.querySelectorAll(".score-delete").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (classId) await dbRemove(`classes/${classId}/scoreboard/${btn.dataset.id}`);
      });
    });
  }

  // Listen for live changes
  let unsub = null;
  if (classId) {
    unsub = dbListen(`classes/${classId}/scoreboard`, snap => {
      renderScores(snap.exists() ? snap.val() : {});
    });
  } else {
    renderScores(classData?.scoreboard || {});
  }

  // Add entry
  wrap.querySelector("#score-add-btn").addEventListener("click", async () => {
    const name = await openPromptModal({
      title: "Add Score Entry",
      label: "Name",
      placeholder: "Team or student name",
      confirmLabel: "Add Entry",
      validate: (value) => value.trim() ? null : "Enter a name first.",
    });
    if (!name?.trim()) return;
    if (!classId) { toast("Select a class first.", "error"); return; }
    const id = "s_" + Date.now();
    dbSet(`classes/${classId}/scoreboard/${id}`, { name: name.trim(), score: 0 });
  });

  // Reset round
  wrap.querySelector("#score-reset-all").addEventListener("click", async () => {
    const confirmed = await openConfirmModal({
      title: "Reset Scores",
      message: "Reset all scores to 0?",
      confirmLabel: "Reset Scores",
      tone: "primary",
    });
    if (!confirmed) return;
    const scores = classData?.scoreboard || {};
    const updates = {};
    Object.keys(scores).forEach(id => updates[`classes/${classId}/scoreboard/${id}/score`] = 0);
    if (classId) {
      const { db } = await import("../firebase-init.js");
      const { update, ref } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js");
      const { currentUser } = await import("../app.js");
      const updateObj = {};
      Object.keys(scores).forEach(id => updateObj[id] = { ...scores[id], score: 0 });
      const { dbSet: ds } = await import("../app.js");
      ds(`classes/${classId}/scoreboard`, updateObj);
    }
    toast("Scores reset!", "success");
  });

  return wrap;
}
