// js/views/wheel.js
import { dbSet, toast } from "../app.js";
import { icon } from "../ui/icons.js";

export function renderWheel({ classId, classData }) {
  const wrap = document.createElement("div");
  wrap.className = "view";

  let items = [];
  if (classData?.students) {
    items = Object.values(classData.students).map(s => typeof s === "string" ? s : s.name).filter(Boolean);
  }
  if (classData?.wheelItems && classData.wheelItems.length) {
    items = classData.wheelItems;
  }
  if (!items.length) items = ["Add students first!"];

  let spinning = false;
  let currentAngle = 0;
  let removeAfterPick = false;
  let resultName = "";

  wrap.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Random Wheel</h1><p class="view-subtitle">Spin to pick randomly</p></div>
    </div>
    <div class="wheel-layout">
      <div class="wheel-canvas-wrap">
        <div class="wheel-container">
          <div class="wheel-pointer"></div>
          <canvas id="wheel-canvas" width="320" height="320" class="wheel-canvas"></canvas>
        </div>
        <div id="wheel-result" class="wheel-result" style="min-height:40px"></div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center">
          <button class="btn btn-primary btn-lg" id="spin-btn">${icon("spin", "Spin!")}</button>
          <label style="display:flex;align-items:center;gap:6px;font-size:.85rem;color:var(--text-muted);cursor:pointer">
            <input type="checkbox" id="remove-after" style="width:14px;height:14px;accent-color:var(--accent)"/>
            Remove after pick
          </label>
        </div>
      </div>
      <div class="card" style="min-width:0">
        <div class="card-title">Wheel Items</div>
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <input type="text" id="wheel-item-input" placeholder="Add name or item…" style="flex:1"/>
          <button class="btn btn-primary btn-sm" id="wheel-add-btn">Add</button>
        </div>
        <div id="wheel-items-list" style="display:flex;flex-direction:column;gap:6px;max-height:320px;overflow-y:auto"></div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" id="wheel-load-students">Load Class</button>
          <button class="btn btn-danger btn-sm" id="wheel-clear">Clear All</button>
        </div>
      </div>
    </div>
  `;

  const canvas = wrap.querySelector("#wheel-canvas");
  const ctx    = canvas.getContext("2d");
  const COLORS  = ["#6c8aff","#ff6b9d","#4ecdc4","#ffe66d","#a8ff78","#ff9a56","#c77dff","#00c8e6","#ff7700","#4ade80"];

  function drawWheel() {
    const w = canvas.width, h = canvas.height;
    const cx = w/2, cy = h/2, r = cx - 8;
    ctx.clearRect(0,0,w,h);
    if (!items.length) return;
    const arc = (2 * Math.PI) / items.length;

    items.forEach((item, i) => {
      const start = currentAngle + i * arc;
      const end   = start + arc;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.font = `bold ${Math.max(10, Math.min(14, 140/items.length))}px 'Syne', sans-serif`;
      const label = item.length > 14 ? item.slice(0,13)+"…" : item;
      ctx.fillText(label, r - 10, 5);
      ctx.restore();
    });

    // Center cap
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = "var(--bg, #0f1117)";
    ctx.fill();
    ctx.strokeStyle = "var(--accent)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function renderItemsList() {
    const list = wrap.querySelector("#wheel-items-list");
    list.innerHTML = "";
    items.forEach((item, i) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--surface-alt);border-radius:6px;font-size:.85rem";
      row.innerHTML = `
        <div style="width:12px;height:12px;border-radius:3px;flex-shrink:0;background:${COLORS[i % COLORS.length]}"></div>
        <span style="flex:1;color:var(--text)">${item}</span>
        <button class="icon-button" data-idx="${i}" aria-label="Remove item">${icon("close")}</button>
      `;
      row.querySelector("button").addEventListener("click", () => {
        items.splice(i, 1);
        saveItems(); renderItemsList(); drawWheel();
      });
      list.appendChild(row);
    });
  }

  function saveItems() {
    if (classId) dbSet(`classes/${classId}/wheelItems`, items);
  }

  function spin() {
    if (spinning || items.length < 2) {
      if (items.length < 2) toast("Add at least 2 items first!", "error");
      return;
    }
    spinning = true;
    wrap.querySelector("#spin-btn").disabled = true;
    wrap.querySelector("#wheel-result").textContent = "";

    const arc    = (2 * Math.PI) / items.length;
    const spins  = 5 + Math.random() * 5;
    const target = Math.random() * 2 * Math.PI;
    const totalAngle = spins * 2 * Math.PI + target;
    const duration = 3000 + Math.random() * 1500;
    const startTime = performance.now();
    const startAngle = currentAngle;

    function easeOut(t) {
      return 1 - Math.pow(1 - t, 4);
    }

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const angle = startAngle + totalAngle * easeOut(progress);
      currentAngle = angle;
      drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        spinning = false;
        wrap.querySelector("#spin-btn").disabled = false;
        // Determine winner: pointer is at top (angle 0 = -90deg / 3*PI/2)
        const normalized = (((-currentAngle + (3 * Math.PI / 2)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const idx = Math.floor((normalized / (2 * Math.PI)) * items.length) % items.length;
        const winner = items[idx];
        resultName = winner;

        const resultEl = wrap.querySelector("#wheel-result");
        resultEl.innerHTML = `${icon("spark")} <strong>${winner}</strong>`;
        resultEl.style.animation = "none";
        void resultEl.offsetWidth;
        resultEl.style.animation = "";

        if (removeAfterPick) {
          items.splice(idx, 1);
          saveItems(); renderItemsList(); drawWheel();
        }
        playPop();
      }
    }
    requestAnimationFrame(animate);
  }

  // Events
  wrap.querySelector("#spin-btn").addEventListener("click", spin);
  wrap.querySelector("#remove-after").addEventListener("change", (e) => { removeAfterPick = e.target.checked; });
  wrap.querySelector("#wheel-add-btn").addEventListener("click", () => {
    const inp = wrap.querySelector("#wheel-item-input");
    const val = inp.value.trim();
    if (!val) return;
    items.push(val); inp.value = "";
    saveItems(); renderItemsList(); drawWheel();
  });
  wrap.querySelector("#wheel-item-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") wrap.querySelector("#wheel-add-btn").click();
  });
  wrap.querySelector("#wheel-load-students").addEventListener("click", () => {
    if (classData?.students) {
      items = Object.values(classData.students).map(s => typeof s === "string" ? s : s.name).filter(Boolean);
      saveItems(); renderItemsList(); drawWheel();
    } else toast("No students in this class yet.", "info");
  });
  wrap.querySelector("#wheel-clear").addEventListener("click", () => {
    items = []; saveItems(); renderItemsList(); drawWheel();
  });

  renderItemsList();
  drawWheel();
  return wrap;
}

function playPop() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine"; osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } catch(e) {}
}
