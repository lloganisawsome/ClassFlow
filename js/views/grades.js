import { icon } from "../ui/icons.js";

const SCALE = [
  [97, "A+", "#4ade80"], [93, "A", "#4ade80"], [90, "A-", "#86efac"],
  [87, "B+", "#60a5fa"], [83, "B", "#60a5fa"], [80, "B-", "#93c5fd"],
  [77, "C+", "#fbbf24"], [73, "C", "#fbbf24"], [70, "C-", "#fcd34d"],
  [67, "D+", "#fb923c"], [60, "D", "#fb923c"], [0, "F", "#f87171"],
];

export function renderGrades() {
  const wrap = document.createElement("div");
  wrap.className = "view";
  wrap.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Grade Calculator</h1><p class="view-subtitle">Quick calculator plus missed-question lookup mode</p></div>
      <button class="btn btn-secondary" id="grade-fullscreen-btn">${icon("fullscreen", "Fullscreen")}</button>
    </div>

    <div class="grade-mode-tabs">
      <button class="grade-mode-tab active" data-mode="calculator">Calculator</button>
      <button class="grade-mode-tab" data-mode="table">Missed-to-Grade Table</button>
    </div>

    <section data-panel="calculator">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:700px;align-items:start">
        <div class="card" style="display:flex;flex-direction:column;gap:14px">
          <div>
            <label class="field-label">Total Questions</label>
            <input type="number" id="grade-total" value="20" min="1" style="width:100%"/>
          </div>
          <div>
            <label class="field-label">Missed (wrong / skipped)</label>
            <input type="number" id="grade-missed" value="0" min="0" style="width:100%"/>
          </div>
          <label style="font-size:.85rem;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="show-letter" checked style="accent-color:var(--accent)"/> Show letter grade
          </label>
          <button class="btn btn-primary" id="calc-btn">Calculate</button>
          <button class="btn btn-secondary btn-sm" id="grade-reset-btn">Reset</button>
        </div>
        <div class="card" style="text-align:center;padding:32px 20px">
          <div id="grade-pct" class="grade-result-big" style="color:var(--accent)">-</div>
          <div id="grade-letter-display" class="grade-letter" style="color:var(--text-muted)">-</div>
          <div id="grade-fraction" style="margin-top:12px;font-size:.9rem;color:var(--text-muted)"></div>
          <div id="grade-feedback" style="margin-top:8px;font-size:.85rem;font-weight:600"></div>
        </div>
      </div>
    </section>

    <section data-panel="table" class="hidden">
      <div class="card" style="max-width:760px">
        <div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin-bottom:18px">
          <div>
            <label class="field-label">Total Questions</label>
            <input type="number" id="grade-table-total" value="10" min="1" style="width:130px"/>
          </div>
          <button class="btn btn-primary" id="grade-table-build">Build Table</button>
        </div>
        <div class="grade-table-wrap">
          <table class="grade-table" id="grade-table">
            <thead><tr><th>Missed</th><th>Correct</th><th>Grade</th><th>Letter</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </section>

    <div class="card" style="margin-top:20px;max-width:700px">
      <div class="card-title">Grade Scale</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px">
        ${[
          ["A+", "97-100", "#4ade80"], ["A", "93-96", "#4ade80"], ["A-", "90-92", "#86efac"],
          ["B+", "87-89", "#60a5fa"], ["B", "83-86", "#60a5fa"], ["B-", "80-82", "#93c5fd"],
          ["C+", "77-79", "#fbbf24"], ["C", "73-76", "#fbbf24"], ["C-", "70-72", "#fcd34d"],
          ["D+", "67-69", "#fb923c"], ["D", "60-66", "#fb923c"], ["F", "<60", "#f87171"],
        ].map(([letter, range, color]) => `
          <div style="text-align:center;padding:8px 6px;background:var(--surface-alt);border-radius:8px;border-left:3px solid ${color}">
            <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:1rem;color:${color}">${letter}</div>
            <div style="font-size:.72rem;color:var(--text-muted)">${range}%</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  const getLetter = (pct) => SCALE.find(([min]) => pct >= min) || SCALE[SCALE.length - 1];

  function calc() {
    const total = parseInt(wrap.querySelector("#grade-total").value, 10) || 0;
    const missed = parseInt(wrap.querySelector("#grade-missed").value, 10) || 0;
    if (total <= 0) return;
    const correct = Math.max(0, total - missed);
    const pct = Math.round((correct / total) * 1000) / 10;
    const [, letter, color] = getLetter(pct);
    const showLetter = wrap.querySelector("#show-letter").checked;
    wrap.querySelector("#grade-pct").textContent = `${pct}%`;
    wrap.querySelector("#grade-pct").style.color = color;
    wrap.querySelector("#grade-letter-display").textContent = showLetter ? letter : "";
    wrap.querySelector("#grade-letter-display").style.color = color;
    wrap.querySelector("#grade-fraction").textContent = `${correct} / ${total} correct`;
    wrap.querySelector("#grade-feedback").textContent =
      pct >= 90 ? "Excellent work" :
      pct >= 80 ? "Good job" :
      pct >= 70 ? "Passing" :
      pct >= 60 ? "Needs work" :
      "Below passing";
  }

  function buildTable() {
    const total = Math.max(1, parseInt(wrap.querySelector("#grade-table-total").value, 10) || 1);
    const tbody = wrap.querySelector("#grade-table tbody");
    tbody.innerHTML = Array.from({ length: total + 1 }, (_, missed) => {
      const correct = total - missed;
      const pct = Math.round((correct / total) * 1000) / 10;
      const [, letter, color] = getLetter(pct);
      return `
        <tr>
          <td>${missed}</td>
          <td>${correct}</td>
          <td style="color:${color};font-weight:700">${pct}%</td>
          <td>${letter}</td>
        </tr>
      `;
    }).join("");
  }

  wrap.querySelectorAll(".grade-mode-tab").forEach((button) => {
    button.addEventListener("click", () => {
      wrap.querySelectorAll(".grade-mode-tab").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
      const mode = button.dataset.mode;
      wrap.querySelectorAll("[data-panel]").forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.panel !== mode);
      });
    });
  });

  wrap.querySelector("#calc-btn").addEventListener("click", calc);
  wrap.querySelector("#grade-total").addEventListener("input", calc);
  wrap.querySelector("#grade-missed").addEventListener("input", calc);
  wrap.querySelector("#show-letter").addEventListener("change", calc);
  wrap.querySelector("#grade-reset-btn").addEventListener("click", () => {
    wrap.querySelector("#grade-total").value = 20;
    wrap.querySelector("#grade-missed").value = 0;
    calc();
  });
  wrap.querySelector("#grade-table-build").addEventListener("click", buildTable);
  wrap.querySelector("#grade-table-total").addEventListener("input", buildTable);

  wrap.querySelector("#grade-fullscreen-btn").addEventListener("click", () => {
    const pct = wrap.querySelector("#grade-pct").textContent;
    const letter = wrap.querySelector("#grade-letter-display").textContent;
    const fraction = wrap.querySelector("#grade-fraction").textContent;
    const overlay = document.createElement("div");
    overlay.className = "fullscreen-overlay";
    overlay.innerHTML = `
      <button class="btn btn-secondary fullscreen-exit" onclick="this.parentElement.remove()">${icon("close", "Exit")}</button>
      <div style="font-family:'Syne',sans-serif;font-size:20vw;font-weight:800;color:var(--accent);line-height:1">${pct}</div>
      <div style="font-family:'Syne',sans-serif;font-size:8vw;font-weight:800;color:var(--text)">${letter}</div>
      <div style="font-size:1.5rem;color:var(--text-muted);margin-top:12px">${fraction}</div>
    `;
    document.body.appendChild(overlay);
  });

  calc();
  buildTable();
  return wrap;
}
