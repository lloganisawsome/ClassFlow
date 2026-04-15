import { dbSet } from "../app.js";
import { icon } from "../ui/icons.js";

let timerInterval = null;
let timerSeconds = 600;
let timerRunning = false;
let timerTotal = 600;

export function renderTimer({ classId, classData }) {
  const wrap = document.createElement("div");
  wrap.className = "view";
  wrap.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Timer</h1><p class="view-subtitle">Countdown for any activity</p></div>
      <button class="btn btn-secondary" id="timer-fullscreen-btn">${icon("fullscreen", "Fullscreen")}</button>
    </div>

    <div class="timer-display" id="timer-display">
      <div class="timer-digit-editor" id="timer-digit-editor"></div>
      <div style="margin-top:10px;color:var(--text-muted);font-size:.82rem" id="timer-label">Ready</div>
    </div>

    <div style="margin-top:20px;display:flex;flex-direction:column;gap:16px;align-items:center">
      <div class="timer-presets">
        ${[1, 5, 10, 15, 20, 30].map((m) => `<button class="preset-btn" data-min="${m}">${m}m</button>`).join("")}
      </div>

      <div class="timer-controls">
        <button class="btn-icon-round" id="timer-reset-btn" title="Reset">${icon("reset")}</button>
        <button class="timer-main-btn" id="timer-play-btn" aria-label="Start timer">${icon("play")}</button>
        <button class="btn-icon-round" id="timer-add30-btn" title="+30s">+30s</button>
      </div>

      <div style="width:100%;max-width:440px;height:6px;background:var(--border);border-radius:99px;overflow:hidden">
        <div id="timer-progress" style="height:100%;background:var(--accent);border-radius:99px;transition:width .5s;width:100%"></div>
      </div>
    </div>
  `;

  const editor = wrap.querySelector("#timer-digit-editor");
  const initialSeconds = classData?.timerPresetSeconds || (classData?.timerPreset || 10) * 60;
  setTimerTo(initialSeconds);

  function getDigits() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    return `${String(minutes).padStart(2, "0")}${String(seconds).padStart(2, "0")}`.split("");
  }

  function digitsToSeconds() {
    const values = [...editor.querySelectorAll("[data-digit-index]")].map((input) => input.value || "0");
    const minutes = parseInt(values.slice(0, 2).join(""), 10);
    const seconds = Math.min(59, parseInt(values.slice(2).join(""), 10));
    return Math.max(0, (minutes * 60) + seconds);
  }

  function persistTimerPreset() {
    if (!classId) return;
    dbSet(`classes/${classId}/timerPresetSeconds`, timerTotal);
    dbSet(`classes/${classId}/timerPreset`, Math.max(1, Math.ceil(timerTotal / 60)));
  }

  function renderDigitEditor() {
    const digits = getDigits();
    editor.innerHTML = digits.map((digit, index) => `
      <div class="timer-digit-stack">
        <button class="timer-digit-step" data-action="up" data-index="${index}">${icon("arrowUp")}</button>
        <input class="timer-digit-input" data-digit-index="${index}" inputmode="numeric" maxlength="1" value="${digit}" />
        <button class="timer-digit-step" data-action="down" data-index="${index}">${icon("arrowDown")}</button>
      </div>
      ${index === 1 ? `<div class="timer-colon">:</div>` : ""}
    `).join("");

    editor.querySelectorAll(".timer-digit-step").forEach((button) => {
      button.addEventListener("click", () => {
        const index = parseInt(button.dataset.index, 10);
        const inputs = [...editor.querySelectorAll("[data-digit-index]")];
        const input = inputs[index];
        const current = parseInt(input.value || "0", 10);
        const next = button.dataset.action === "up" ? (current + 1) % 10 : (current + 9) % 10;
        input.value = String(next);
        applyManualDigits();
      });
    });

    editor.querySelectorAll(".timer-digit-input").forEach((input, index, all) => {
      input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(0, 1);
        if (input.value && index < all.length - 1) all[index + 1].focus();
        applyManualDigits();
      });
      input.addEventListener("blur", applyManualDigits);
      input.addEventListener("focus", () => input.select());
      input.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          const current = parseInt(input.value || "0", 10);
          input.value = String(event.key === "ArrowUp" ? (current + 1) % 10 : (current + 9) % 10);
          applyManualDigits();
        }
      });
    });
  }

  function applyManualDigits() {
    stopTimer();
    timerSeconds = digitsToSeconds();
    timerTotal = Math.max(timerSeconds, 1);
    updateDisplay();
    persistTimerPreset();
  }

  function setTimerTo(seconds) {
    stopTimer();
    timerSeconds = Math.max(0, seconds);
    timerTotal = Math.max(timerSeconds, 1);
    updateDisplay();
    persistTimerPreset();
  }

  function updateDisplay() {
    renderDigitEditor();
    const display = wrap.querySelector("#timer-display");
    display.classList.remove("warning", "urgent", "done");
    if (timerSeconds <= 0) display.classList.add("done");
    else if (timerSeconds <= 10) display.classList.add("urgent");
    else if (timerSeconds <= timerTotal * 0.2) display.classList.add("warning");

    const pct = timerTotal > 0 ? (timerSeconds / timerTotal) * 100 : 100;
    wrap.querySelector("#timer-progress").style.width = `${pct}%`;

    const label = wrap.querySelector("#timer-label");
    if (timerRunning) label.textContent = "Running...";
    else if (timerSeconds <= 0) label.textContent = "Time's up!";
    else label.textContent = "Ready";
  }

  function startTimer() {
    if (timerSeconds <= 0) return;
    timerRunning = true;
    wrap.querySelector("#timer-play-btn").innerHTML = icon("pause");
    timerInterval = setInterval(() => {
      timerSeconds -= 1;
      updateDisplay();
      if (timerSeconds <= 0) {
        stopTimer();
        playAlarm();
        flashScreen();
        wrap.querySelector("#timer-label").textContent = "Time's up!";
      }
    }, 1000);
  }

  function stopTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    wrap.querySelector("#timer-play-btn").innerHTML = icon("play");
  }

  wrap.querySelectorAll(".preset-btn").forEach((button) => {
    button.addEventListener("click", () => {
      setTimerTo(parseInt(button.dataset.min, 10) * 60);
    });
  });
  wrap.querySelector("#timer-play-btn").addEventListener("click", () => {
    if (timerRunning) stopTimer();
    else startTimer();
    updateDisplay();
  });
  wrap.querySelector("#timer-reset-btn").addEventListener("click", () => {
    setTimerTo(timerTotal);
  });
  wrap.querySelector("#timer-add30-btn").addEventListener("click", () => {
    timerSeconds += 30;
    timerTotal += 30;
    persistTimerPreset();
    updateDisplay();
  });
  wrap.querySelector("#timer-fullscreen-btn").addEventListener("click", () => showTimerFullscreen());

  return wrap;
}

function showTimerFullscreen() {
  const overlay = document.createElement("div");
  overlay.className = "fullscreen-overlay";
  overlay.innerHTML = `
    <button class="btn btn-secondary fullscreen-exit" onclick="this.parentElement.remove();clearInterval(window._fsTimer)">${icon("close", "Exit")}</button>
    <div id="fs-digits" style="font-family:'Syne',sans-serif;font-size:18vw;font-weight:800;color:var(--text);letter-spacing:-0.04em;font-variant-numeric:tabular-nums;">${getDisplayTime()}</div>
    <div style="font-size:1.2rem;color:var(--text-muted)">${timerRunning ? "Running" : "Paused"}</div>
  `;
  document.body.appendChild(overlay);
  window._fsTimer = setInterval(() => {
    const el = overlay.querySelector("#fs-digits");
    if (el) {
      el.textContent = getDisplayTime();
      if (timerSeconds <= 0) el.style.color = "var(--accent)";
      else if (timerSeconds <= 10) el.style.color = "#ef4444";
      else el.style.color = "var(--text)";
    }
  }, 300);
}

function getDisplayTime() {
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function playAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.2, 0.4, 0.6].forEach((time) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0, ctx.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + time + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + time + 0.18);
      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + 0.2);
    });
  } catch {}
}

function flashScreen() {
  document.body.classList.add("screen-flash");
  setTimeout(() => document.body.classList.remove("screen-flash"), 1500);
}
