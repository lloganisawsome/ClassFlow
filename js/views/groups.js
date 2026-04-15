// js/views/groups.js
import { dbSet, toast } from "../app.js";
import { icon } from "../ui/icons.js";

export function renderGroups({ classId, classData }) {
  const wrap = document.createElement("div");
  wrap.className = "view";
  wrap.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Group Generator</h1><p class="view-subtitle">Auto-create fair groups from your class list</p></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
      <div class="card">
        <div class="card-title">Students</div>
        <div style="margin-bottom:12px;display:flex;gap:8px">
          <input type="text" id="grp-student-input" placeholder="Add student name…" style="flex:1"/>
          <button class="btn btn-primary btn-sm" id="grp-add-btn">Add</button>
        </div>
        <div id="grp-students-list" style="display:flex;flex-direction:column;gap:5px;max-height:280px;overflow-y:auto;margin-bottom:12px"></div>
        <button class="btn btn-secondary btn-sm" id="grp-load-btn">Load Class List</button>
      </div>
      <div class="card">
        <div class="card-title">Generate Groups</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <label class="field-label">Group Size</label>
            <input type="number" id="grp-size" value="3" min="2" max="10" style="width:80px"/>
          </div>
          <button class="btn btn-primary" id="grp-generate-btn">${icon("spark", "Generate Groups")}</button>
          <button class="btn btn-secondary btn-sm" id="grp-copy-btn" style="display:none">${icon("copy", "Copy Results")}</button>
        </div>
      </div>
    </div>
    <div id="groups-result" class="groups-result" style="margin-top:0"></div>
  `;

  let students = [];
  if (classData?.students) {
    students = Object.values(classData.students).map(s => typeof s === "string" ? s : s.name).filter(Boolean);
  }

  function renderStudentList() {
    const list = wrap.querySelector("#grp-students-list");
    list.innerHTML = students.map((s,i) => `
      <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:var(--surface-alt);border-radius:6px;font-size:.85rem">
        <span style="flex:1;color:var(--text)">${s}</span>
        <button class="icon-button" data-idx="${i}" aria-label="Remove student">${icon("close")}</button>
      </div>
    `).join("");
    list.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => { students.splice(+btn.dataset.idx, 1); renderStudentList(); });
    });
  }

  wrap.querySelector("#grp-add-btn").addEventListener("click", () => {
    const inp = wrap.querySelector("#grp-student-input");
    const v = inp.value.trim(); if (!v) return;
    students.push(v); inp.value = ""; renderStudentList();
  });
  wrap.querySelector("#grp-student-input").addEventListener("keydown", e => { if (e.key === "Enter") wrap.querySelector("#grp-add-btn").click(); });
  wrap.querySelector("#grp-load-btn").addEventListener("click", () => {
    if (classData?.students) {
      students = Object.values(classData.students).map(s => typeof s === "string" ? s : s.name).filter(Boolean);
      renderStudentList();
    } else toast("No class students found.", "info");
  });

  wrap.querySelector("#grp-generate-btn").addEventListener("click", () => {
    if (students.length < 2) { toast("Need at least 2 students!", "error"); return; }
    const size = parseInt(wrap.querySelector("#grp-size").value) || 3;
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const groups = [];
    for (let i = 0; i < shuffled.length; i += size) groups.push(shuffled.slice(i, i + size));
    const res = wrap.querySelector("#groups-result");
    res.innerHTML = groups.map((g, i) => `
      <div class="group-card" style="animation-delay:${i*0.06}s">
        <div class="group-card-title">Group ${i + 1}</div>
        ${g.map(name => `<div class="group-member">${name}</div>`).join("")}
      </div>
    `).join("");
    wrap.querySelector("#grp-copy-btn").style.display = "";
    wrap.querySelector("#grp-copy-btn").onclick = () => {
      const txt = groups.map((g,i) => `Group ${i+1}: ${g.join(", ")}`).join("\n");
      navigator.clipboard.writeText(txt).then(() => toast("Copied to clipboard!", "success"));
    };
  });

  renderStudentList();
  return wrap;
}
