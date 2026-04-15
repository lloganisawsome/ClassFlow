// js/views/settings.js
import { dbSet, dbRemove, toast, openConfirmModal, openPromptModal } from "../app.js";
import { icon } from "../ui/icons.js";

export function renderSettings({ classId, classData, user }) {
  const wrap = document.createElement("div");
  wrap.className = "view";
  wrap.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Settings</h1><p class="view-subtitle">Manage your workspace</p></div>
    </div>

    <!-- Account -->
    <div class="settings-section">
      <h3>Account</h3>
      <div class="settings-row">
        <div><div class="settings-row-label">Name</div><div class="settings-row-desc">${user?.displayName || "—"}</div></div>
      </div>
      <div class="settings-row">
        <div><div class="settings-row-label">Email</div><div class="settings-row-desc">${user?.email || "—"}</div></div>
      </div>
    </div>

    <!-- Class -->
    <div class="settings-section">
      <h3>Current Class${classData?.name ? ` — ${classData.name}` : ""}</h3>
      ${classId ? `
        <div class="settings-row">
          <div><div class="settings-row-label">Rename Class</div></div>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="text" id="rename-input" value="${classData?.name || ""}" style="width:180px"/>
            <button class="btn btn-primary btn-sm" id="rename-btn">Save</button>
          </div>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-label">Delete Class</div><div class="settings-row-desc">Permanently removes all class data</div></div>
          <button class="btn btn-danger btn-sm" id="delete-class-btn">Delete</button>
        </div>
      ` : `<p style="color:var(--text-muted);font-size:.88rem">Select a class to see its settings.</p>`}
    </div>

    <!-- Students -->
    ${classId ? `
    <div class="settings-section">
      <h3>Student List</h3>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <input type="text" id="student-input" placeholder="Student name…" style="flex:1"/>
        <button class="btn btn-primary btn-sm" id="student-add-btn">Add</button>
      </div>
      <div id="students-list" style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto;margin-bottom:12px"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" id="bulk-import-btn">${icon("copy", "Bulk Import")}</button>
        <button class="btn btn-danger btn-sm" id="clear-students-btn">Clear All Students</button>
      </div>
    </div>
    ` : ""}

    <!-- Display -->
    <div class="settings-section">
      <h3>Display</h3>
      <div class="settings-row">
        <div><div class="settings-row-label">Theme</div><div class="settings-row-desc">Use the theme button in the top bar to change the whole app look.</div></div>
      </div>
      <div class="settings-row">
        <div><div class="settings-row-label">Tutorial</div><div class="settings-row-desc">Replay the guided tour any time.</div></div>
        <button class="btn btn-secondary btn-sm" id="replay-tour-btn">Replay Tour</button>
      </div>
    </div>

    <div class="settings-section">
      <h3>Update Log</h3>
      <div class="update-log-list">
        <div class="update-log-item"><strong>Controller</strong><span>Join by controller code or public link in a fresh tab.</span></div>
        <div class="update-log-item"><strong>Studio Camera</strong><span>Studio mode now has framing guides and auto-hides the HUD while idle.</span></div>
        <div class="update-log-item"><strong>New Tools</strong><span>Notes, drawing board, and feedback pages were added to the app.</span></div>
        <div class="update-log-item"><strong>Grades</strong><span>Calculator mode now sits beside a missed-question lookup table mode.</span></div>
      </div>
    </div>

    <!-- About -->
    <div class="settings-section">
      <h3>About</h3>
      <div class="settings-row">
        <div><div class="settings-row-label">ClassFlow</div><div class="settings-row-desc">Real-time classroom control dashboard</div></div>
        <span style="font-family:'Syne',sans-serif;font-weight:800;color:var(--accent)">v1.0</span>
      </div>
    </div>
  `;

  if (!classId) return wrap;

  // Rename
  wrap.querySelector("#rename-btn").addEventListener("click", async () => {
    const name = wrap.querySelector("#rename-input").value.trim();
    if (!name) return;
    await dbSet(`classes/${classId}/name`, name);
    toast("Class renamed!", "success");
    // Update selector
    const opt = document.querySelector(`#class-selector option[value="${classId}"]`);
    if (opt) opt.textContent = name;
  });

  // Delete class
  wrap.querySelector("#delete-class-btn").addEventListener("click", async () => {
    const confirmed = await openConfirmModal({
      title: "Delete Class",
      message: `Delete "${classData?.name}"? This cannot be undone.`,
      confirmLabel: "Delete Class",
    });
    if (!confirmed) return;
    await dbRemove(`classes/${classId}`);
    toast("Class deleted.", "info");
    document.getElementById("class-selector").value = "";
    const { navigateTo } = await import("./dashboard.js");
    // Just re-navigate
    window.location.reload();
  });

  // Student list
  function renderStudents(students) {
    const list = wrap.querySelector("#students-list");
    if (!list) return;
    const entries = students ? Object.entries(students) : [];
    if (!entries.length) {
      list.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem">No students added yet.</p>`;
      return;
    }
    list.innerHTML = entries.map(([id, s]) => {
      const name = typeof s === "string" ? s : s.name;
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--surface-alt);border-radius:8px">
          <div style="width:28px;height:28px;border-radius:50%;background:var(--accent-alpha);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.78rem;flex-shrink:0">${name[0].toUpperCase()}</div>
          <span style="flex:1;font-size:.88rem;color:var(--text)">${name}</span>
          <button class="icon-button" data-id="${id}" aria-label="Remove student">${icon("close")}</button>
        </div>
      `;
    }).join("");
    list.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", async () => {
        await dbRemove(`classes/${classId}/students/${btn.dataset.id}`);
        toast("Student removed.", "info");
      });
    });
  }

  // Live students
  const { dbListen } = (async () => { return await import("../app.js"); })();
  import("../app.js").then(({ dbListen }) => {
    dbListen(`classes/${classId}/students`, snap => {
      renderStudents(snap.exists() ? snap.val() : {});
    });
  });

  wrap.querySelector("#student-add-btn").addEventListener("click", async () => {
    const inp = wrap.querySelector("#student-input");
    const name = inp.value.trim();
    if (!name) return;
    const id = "stu_" + Date.now();
    await dbSet(`classes/${classId}/students/${id}`, { name });
    inp.value = "";
    toast(`${name} added!`, "success");
  });
  wrap.querySelector("#student-input").addEventListener("keydown", e => {
    if (e.key === "Enter") wrap.querySelector("#student-add-btn").click();
  });

  wrap.querySelector("#bulk-import-btn").addEventListener("click", async () => {
    const raw = await openPromptModal({
      title: "Bulk Import Students",
      label: "Student Names",
      placeholder: "One student per line",
      confirmLabel: "Import Students",
      multiline: true,
      validate: (value) => value.trim() ? null : "Enter at least one student name.",
    });
    if (!raw) return;
    const names = raw.split("\n").map(n => n.trim()).filter(Boolean);
    for (const name of names) {
      const id = "stu_" + Date.now() + Math.random().toString(36).slice(2,5);
      await dbSet(`classes/${classId}/students/${id}`, { name });
    }
    toast(`${names.length} students imported!`, "success");
  });

  wrap.querySelector("#clear-students-btn").addEventListener("click", async () => {
    const confirmed = await openConfirmModal({
      title: "Clear Students",
      message: "Remove all students from this class?",
      confirmLabel: "Clear Students",
    });
    if (!confirmed) return;
    await dbSet(`classes/${classId}/students`, {});
    toast("Student list cleared.", "info");
  });

  renderStudents(classData?.students || {});
  wrap.querySelector("#replay-tour-btn")?.addEventListener("click", () => {
    localStorage.removeItem(`cf_tour_seen_${user.uid}`);
    window.location.reload();
  });
  return wrap;
}
