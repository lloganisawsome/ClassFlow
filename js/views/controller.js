// js/views/controller.js
import { dbSet, toast } from "../app.js";
import { icon } from "../ui/icons.js";

export function renderController({ classId, classData, user }) {
  const wrap = document.createElement("div");
  wrap.className = "view";

  const controllerUrl = classId
    ? `${location.origin}${location.pathname}?controller=${user?.uid}_${classId}`
    : null;
  const controllerCode = classId
    ? `${user?.uid?.slice(0, 6)}-${classId.slice(0, 6)}`.toUpperCase()
    : "";

  wrap.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Controller</h1><p class="view-subtitle">Link another device to control your classroom</p></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;max-width:900px">
      <div class="card">
        <div class="card-title">Controller Link</div>
        ${classId ? `
          <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:16px">Open this URL on another device to control your class remotely — no login needed.</p>
          <div class="controller-code-display" id="ctrl-code">${controllerCode}</div>
          <p style="font-size:.8rem;color:var(--text-muted);text-align:center;margin-top:-6px">You can also open ClassFlow on another device and join with this controller code.</p>
          <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;gap:8px">
              <input type="text" id="ctrl-url" value="${controllerUrl}" readonly style="flex:1;font-size:.78rem"/>
              <button class="btn btn-primary btn-sm" id="ctrl-copy-btn">Copy</button>
            </div>
            <button class="btn btn-secondary btn-sm" id="ctrl-qr-btn">${icon("qr", "Show as QR")}</button>
          </div>
        ` : `<p style="color:var(--text-muted);font-size:.9rem">Select a class first to generate a controller link.</p>`}
      </div>

      <div class="card">
        <div class="card-title">Send to Screen</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <label class="field-label">Message</label>
            <textarea id="ctrl-message" placeholder="Type a message to display on the main screen…" style="min-height:80px"></textarea>
          </div>
          <button class="btn btn-primary" id="ctrl-send-btn">${icon("send", "Show Message")}</button>
          <button class="btn btn-secondary btn-sm" id="ctrl-clear-btn">Clear Message</button>
        </div>
      </div>

      <div class="card" style="grid-column:1/-1">
        <div class="card-title">Remote Controls</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-secondary" id="rc-timer-start">${icon("play", "Start Timer")}</button>
          <button class="btn btn-secondary" id="rc-timer-stop">${icon("pause", "Stop Timer")}</button>
          <button class="btn btn-secondary" id="rc-timer-reset">${icon("reset", "Reset Timer")}</button>
          <button class="btn btn-secondary" id="rc-wheel-spin">${icon("spin", "Spin Wheel")}</button>
        </div>
        <p style="font-size:.78rem;color:var(--text-muted);margin-top:10px">These actions sync via Firebase to all devices viewing this class.</p>
      </div>
    </div>
  `;

  if (!classId) return wrap;

  // Copy URL
  wrap.querySelector("#ctrl-copy-btn")?.addEventListener("click", () => {
    navigator.clipboard.writeText(controllerUrl);
    toast("Link copied!", "success");
  });

  // QR for controller
  wrap.querySelector("#ctrl-qr-btn")?.addEventListener("click", () => {
    const overlay = document.createElement("div");
    overlay.className = "fullscreen-overlay";
    overlay.innerHTML = `
      <button class="btn btn-secondary fullscreen-exit" onclick="this.parentElement.remove()">${icon("close", "Exit")}</button>
      <div id="ctrl-qr-wrap" style="background:#fff;padding:20px;border-radius:16px"></div>
      <p style="color:var(--text-muted);margin-top:12px;font-size:.85rem">Scan to open controller on another device</p>
    `;
    document.body.appendChild(overlay);
    // Use QRCode lib if loaded
    if (typeof QRCode !== "undefined") {
      new QRCode(overlay.querySelector("#ctrl-qr-wrap"), { text: controllerUrl, width: 300, height: 300 });
    } else {
      overlay.querySelector("#ctrl-qr-wrap").innerHTML = `<p style="color:#333;padding:20px">${controllerUrl}</p>`;
    }
  });

  // Send message
  wrap.querySelector("#ctrl-send-btn").addEventListener("click", async () => {
    const msg = wrap.querySelector("#ctrl-message").value.trim();
    if (!msg) return;
    await dbSet(`classes/${classId}/controllerMsg`, { text: msg, show: true, ts: Date.now() });
    toast("Message sent to screen!", "success");
  });
  wrap.querySelector("#ctrl-clear-btn").addEventListener("click", async () => {
    await dbSet(`classes/${classId}/controllerMsg`, { text: "", show: false, ts: Date.now() });
    document.getElementById("overlay-message")?.classList.add("hidden");
    toast("Message cleared.", "info");
  });

  // Remote control buttons
  wrap.querySelector("#rc-timer-start")?.addEventListener("click", () => {
    dbSet(`classes/${classId}/controllerCmd`, { cmd: "timer_start", ts: Date.now() });
    toast("Timer start command sent.", "success");
  });
  wrap.querySelector("#rc-timer-stop")?.addEventListener("click", () => {
    dbSet(`classes/${classId}/controllerCmd`, { cmd: "timer_stop", ts: Date.now() });
    toast("Timer stop command sent.", "success");
  });
  wrap.querySelector("#rc-timer-reset")?.addEventListener("click", () => {
    dbSet(`classes/${classId}/controllerCmd`, { cmd: "timer_reset", ts: Date.now() });
    toast("Timer reset command sent.", "success");
  });
  wrap.querySelector("#rc-wheel-spin")?.addEventListener("click", () => {
    dbSet(`classes/${classId}/controllerCmd`, { cmd: "wheel_spin", ts: Date.now() });
    toast("Wheel spin command sent.", "success");
  });

  return wrap;
}
