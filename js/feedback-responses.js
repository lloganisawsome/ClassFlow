import { db } from "./firebase-init.js";
import { onValue, ref } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const list = document.getElementById("feedback-list");
const escapeHtml = (value = "") => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

onValue(ref(db, "feedbackSubmissions"), (snap) => {
  if (!snap.exists()) {
    list.innerHTML = `<div class="empty">No feedback submitted yet.</div>`;
    return;
  }

  const entries = Object.values(snap.val()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  list.innerHTML = entries.map((entry) => `
    <article class="card">
      <div class="meta">
        <div>
          <strong>${escapeHtml(entry.name || "Unknown")}</strong>
          <div class="muted">${escapeHtml(entry.email || "No email")}${entry.createdAt ? ` • ${new Date(entry.createdAt).toLocaleString()}` : ""}</div>
        </div>
        <span class="badge">${escapeHtml(entry.type || "idea")}</span>
      </div>
      <div>${escapeHtml(entry.message || "")}</div>
    </article>
  `).join("");
});
