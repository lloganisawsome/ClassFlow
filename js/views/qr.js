// js/views/qr.js
import { toast } from "../app.js";
import { icon } from "../ui/icons.js";

export function renderQR({ classData }) {
  const wrap = document.createElement("div");
  wrap.className = "view";
  wrap.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">QR Code Generator</h1><p class="view-subtitle">Instant QR for any URL or text</p></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;max-width:800px">
      <div class="card" style="display:flex;flex-direction:column;gap:14px">
        <div>
          <label class="field-label">URL or Text</label>
          <input type="text" id="qr-input" placeholder="https://example.com"/>
        </div>
        <div>
          <label class="field-label">Size</label>
          <input type="range" id="qr-size" min="100" max="400" value="240" style="width:100%;accent-color:var(--accent)"/>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" id="qr-gen-btn">Generate QR</button>
          <button class="btn btn-secondary" id="qr-download-btn">${icon("download", "Download")}</button>
          <button class="btn btn-secondary" id="qr-fullscreen-btn">${icon("fullscreen", "Fullscreen")}</button>
        </div>
        <!-- Quick presets -->
        <div>
          <div class="card-title" style="margin-bottom:8px">Quick Links</div>
          <div id="qr-presets" style="display:flex;flex-direction:column;gap:6px"></div>
        </div>
      </div>
      <div class="qr-display" id="qr-display">
        <canvas id="qr-canvas" width="240" height="240" style="border-radius:12px;background:#fff;padding:12px"></canvas>
        <p style="font-size:.78rem;color:var(--text-muted);text-align:center;max-width:200px;word-break:break-all" id="qr-label">Enter a URL and click Generate</p>
      </div>
    </div>
  `;

  // Load QR lib dynamically
  let qrLoaded = false;
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
  script.onload = () => { qrLoaded = true; generateQR(); };
  document.head.appendChild(script);

  let qrInstance = null;

  function generateQR() {
    if (!qrLoaded || typeof QRCode === "undefined") { toast("QR library loading…", "info"); return; }
    const val  = wrap.querySelector("#qr-input").value.trim();
    if (!val) { toast("Enter a URL or text first.", "error"); return; }
    const size = parseInt(wrap.querySelector("#qr-size").value);
    const canvas = wrap.querySelector("#qr-canvas");
    canvas.width  = size;
    canvas.height = size;
    // Clear previous
    canvas.getContext("2d").clearRect(0,0,size,size);
    // Wrap in a temp div since QRCode needs DOM
    const tmp = document.createElement("div");
    new QRCode(tmp, { text: val, width: size, height: size, colorDark: "#000", colorLight: "#fff", correctLevel: QRCode.CorrectLevel.H });
    setTimeout(() => {
      const img = tmp.querySelector("img") || tmp.querySelector("canvas");
      if (img) {
        const ctx2 = canvas.getContext("2d");
        if (img.tagName === "CANVAS") {
          ctx2.drawImage(img, 0, 0, size, size);
        } else {
          const i = new Image(); i.src = img.src;
          i.onload = () => ctx2.drawImage(i, 0, 0, size, size);
        }
      }
    }, 100);
    wrap.querySelector("#qr-label").textContent = val.length > 50 ? val.slice(0,50)+"…" : val;
  }

  wrap.querySelector("#qr-gen-btn").addEventListener("click", generateQR);
  wrap.querySelector("#qr-input").addEventListener("keydown", e => { if (e.key === "Enter") generateQR(); });
  wrap.querySelector("#qr-size").addEventListener("input", () => {
    if (qrLoaded) generateQR();
  });

  // Download
  wrap.querySelector("#qr-download-btn").addEventListener("click", () => {
    const canvas = wrap.querySelector("#qr-canvas");
    const a = document.createElement("a");
    a.download = "classflow-qr.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
    toast("QR downloaded!", "success");
  });

  // Fullscreen
  wrap.querySelector("#qr-fullscreen-btn").addEventListener("click", () => {
    const canvas = wrap.querySelector("#qr-canvas");
    const overlay = document.createElement("div");
    overlay.className = "fullscreen-overlay";
    overlay.innerHTML = `<button class="btn btn-secondary fullscreen-exit" onclick="this.parentElement.remove()">${icon("close", "Exit")}</button>`;
    const bigCanvas = canvas.cloneNode(true);
    bigCanvas.style.cssText = "width:min(70vw,70vh);height:min(70vw,70vh);border-radius:16px;background:#fff;padding:20px;image-rendering:pixelated";
    overlay.appendChild(bigCanvas);
    const label = document.createElement("p");
    label.style.cssText = "color:var(--text-muted);font-size:1rem;margin-top:16px;max-width:500px;text-align:center;word-break:break-all";
    label.textContent = wrap.querySelector("#qr-label").textContent;
    overlay.appendChild(label);
    document.body.appendChild(overlay);
  });

  // Saved links as presets
  const presets = wrap.querySelector("#qr-presets");
  if (classData?.links && Object.keys(classData.links).length) {
    Object.values(classData.links).forEach(link => {
      const btn = document.createElement("button");
      btn.className = "btn btn-secondary btn-sm";
      btn.style.justifyContent = "flex-start";
      btn.textContent = link.name || link.url;
      btn.addEventListener("click", () => {
        wrap.querySelector("#qr-input").value = link.url;
        generateQR();
      });
      presets.appendChild(btn);
    });
  } else {
    presets.innerHTML = `<p style="font-size:.8rem;color:var(--text-muted)">Save links in Quick Links to show them here.</p>`;
  }

  return wrap;
}
