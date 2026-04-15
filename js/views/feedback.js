import { currentUser, toast } from "../app.js";
import { db } from "../firebase-init.js";
import { push, ref, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { icon } from "../ui/icons.js";

export function renderFeedback() {
  const wrap = document.createElement("div");
  wrap.className = "view";
  const name = currentUser?.displayName || currentUser?.email?.split("@")[0] || "";
  const email = currentUser?.email || "";

  wrap.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Feedback</h1><p class="view-subtitle">Send ideas, missing features, and bug reports</p></div>
      <a class="btn btn-secondary" href="./feedback-responses.html" target="_blank" rel="noreferrer">${icon("copy", "Open Responses")}</a>
    </div>
    <div class="card" style="max-width:780px">
      <label class="field-label" for="feedback-name">Name</label>
      <input type="text" id="feedback-name" value="${name}" />
      <label class="field-label" for="feedback-type">Type</label>
      <select id="feedback-type" class="styled">
        <option value="wish">I wish this existed</option>
        <option value="broken">Something is broken</option>
        <option value="idea">General idea</option>
      </select>
      <label class="field-label" for="feedback-message">Message</label>
      <textarea id="feedback-message" placeholder="What should be added, improved, or fixed?"></textarea>
      <div class="modal-actions" style="justify-content:space-between">
        <span class="settings-row-desc">Submitted as ${email || "current user"}.</span>
        <button class="btn btn-primary" id="feedback-submit-btn">${icon("send", "Send Feedback")}</button>
      </div>
    </div>
  `;

  wrap.querySelector("#feedback-submit-btn").addEventListener("click", async () => {
    const displayName = wrap.querySelector("#feedback-name").value.trim();
    const type = wrap.querySelector("#feedback-type").value;
    const message = wrap.querySelector("#feedback-message").value.trim();
    if (!displayName || !message) {
      toast("Add your name and message first.", "error");
      return;
    }

    const itemRef = push(ref(db, "feedbackSubmissions"));
    await set(itemRef, {
      name: displayName,
      email,
      type,
      message,
      userUid: currentUser?.uid || null,
      createdAt: Date.now(),
    });
    wrap.querySelector("#feedback-message").value = "";
    toast("Feedback sent.", "success");
  });

  return wrap;
}
