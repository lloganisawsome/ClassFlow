// js/views/camera.js
import { toast } from "../app.js";
import { icon } from "../ui/icons.js";

export function renderCamera() {
  const wrap = document.createElement("div");
  wrap.className = "view";
  wrap.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Camera</h1><p class="view-subtitle">Webcam viewer for classroom display</p></div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:16px;max-width:700px">
      <div style="position:relative;width:100%;background:#000;border-radius:var(--radius);overflow:hidden;aspect-ratio:16/9">
        <video id="camera-feed" autoplay playsinline style="width:100%;height:100%;object-fit:cover;display:block"></video>
        <canvas id="camera-snapshot" style="display:none;width:100%;height:100%;object-fit:cover"></canvas>
        <div id="camera-overlay" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);color:white;font-size:1rem">
          <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            <p>Camera not started</p>
            <button class="btn btn-primary" id="start-camera-btn">Start Camera</button>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
        <button class="btn btn-primary" id="cam-start-btn">${icon("play", "Start")}</button>
        <button class="btn btn-secondary" id="cam-stop-btn">${icon("stop", "Stop")}</button>
        <button class="btn btn-secondary" id="cam-snapshot-btn">${icon("camera", "Snapshot")}</button>
        <button class="btn btn-secondary" id="cam-flip-btn">${icon("switchCamera", "Switch Camera")}</button>
        <button class="btn btn-secondary" id="cam-fullscreen-btn">${icon("fullscreen", "Studio Mode")}</button>
      </div>
      <div id="snapshot-preview" style="display:none;width:100%">
        <p style="font-size:.82rem;color:var(--text-muted);margin-bottom:8px">Snapshot:</p>
        <img id="snapshot-img" style="width:100%;border-radius:var(--radius);border:1px solid var(--border)"/>
        <div style="display:flex;gap:8px;margin-top:8px">
          <a class="btn btn-primary btn-sm" id="snapshot-download" download="classflow-snapshot.png">${icon("download", "Download")}</a>
          <button class="btn btn-secondary btn-sm" id="snapshot-close">${icon("close", "Close")}</button>
        </div>
      </div>
    </div>
  `;

  let stream = null;
  let facingMode = "user";
  const video   = wrap.querySelector("#camera-feed");
  const overlay = wrap.querySelector("#camera-overlay");

  async function startCamera() {
    try {
      if (stream) { stream.getTracks().forEach(t => t.stop()); }
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
      video.srcObject = stream;
      overlay.style.display = "none";
    } catch(e) {
      toast("Camera access denied or unavailable.", "error");
    }
  }

  wrap.querySelector("#cam-start-btn").addEventListener("click", startCamera);
  wrap.querySelector("#start-camera-btn").addEventListener("click", startCamera);
  wrap.querySelector("#cam-stop-btn").addEventListener("click", () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    video.srcObject = null;
    overlay.style.display = "";
  });
  wrap.querySelector("#cam-flip-btn").addEventListener("click", () => {
    facingMode = facingMode === "user" ? "environment" : "user";
    if (stream) startCamera();
  });
  wrap.querySelector("#cam-snapshot-btn").addEventListener("click", () => {
    if (!stream) { toast("Start camera first.", "error"); return; }
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataURL = canvas.toDataURL("image/png");
    wrap.querySelector("#snapshot-img").src = dataURL;
    wrap.querySelector("#snapshot-download").href = dataURL;
    wrap.querySelector("#snapshot-preview").style.display = "";
    toast("Snapshot taken!", "success");
  });
  wrap.querySelector("#snapshot-close").addEventListener("click", () => {
    wrap.querySelector("#snapshot-preview").style.display = "none";
  });
  wrap.querySelector("#cam-fullscreen-btn").addEventListener("click", () => {
    if (!stream) { toast("Start camera first.", "error"); return; }
    const overlay2 = document.createElement("div");
    overlay2.className = "fullscreen-overlay studio-overlay";
    overlay2.style.background = "#000";
    overlay2.innerHTML = `
      <div class="studio-hud" id="studio-hud">
        <div class="studio-topbar">
          <div class="studio-badge">Studio Mode</div>
          <button class="btn btn-secondary fullscreen-exit" id="fs-exit">${icon("close", "Exit Studio")}</button>
        </div>
        <div class="studio-frame" aria-hidden="true">
          <div class="studio-corner top-left"></div>
          <div class="studio-corner top-right"></div>
          <div class="studio-corner bottom-left"></div>
          <div class="studio-corner bottom-right"></div>
          <div class="studio-center-line"></div>
        </div>
      </div>
    `;
    const v2 = document.createElement("video");
    v2.autoplay = true; v2.playsInline = true;
    v2.srcObject = stream;
    v2.style.cssText = "width:100%;height:100%;object-fit:contain;position:absolute;inset:0";
    overlay2.appendChild(v2);
    document.body.appendChild(overlay2);

    let idleTimer = null;
    const showHud = () => {
      overlay2.classList.remove("studio-idle");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => overlay2.classList.add("studio-idle"), 2200);
    };

    showHud();
    overlay2.addEventListener("mousemove", showHud);
    overlay2.addEventListener("touchstart", showHud, { passive: true });
    overlay2.querySelector("#fs-exit").addEventListener("click", () => overlay2.remove());
  });

  return wrap;
}
