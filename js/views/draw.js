import { toast } from "../app.js";
import { icon } from "../ui/icons.js";

const COLORS = ["#ffffff", "#111827", "#ef4444", "#f59e0b", "#22c55e", "#0ea5e9", "#8b5cf6", "#ec4899"];

export function renderDraw() {
  const wrap = document.createElement("div");
  wrap.className = "view";
  wrap.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Drawing Board</h1><p class="view-subtitle">Sketch, annotate, trace shapes, and save classroom visuals</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" id="draw-undo-btn">${icon("reset", "Undo")}</button>
        <button class="btn btn-secondary btn-sm" id="draw-redo-btn">${icon("play", "Redo")}</button>
        <button class="btn btn-secondary btn-sm" id="draw-download-btn">${icon("download", "Save PNG")}</button>
      </div>
    </div>
    <div class="draw-layout">
      <div class="card draw-panel">
        <div class="card-title">Tools</div>
        <div class="draw-tool-grid" id="draw-tools">
          ${[
            ["brush", "pen", "Brush"],
            ["marker", "palette", "Marker"],
            ["eraser", "close", "Eraser"],
            ["line", "shape", "Line"],
            ["rectangle", "shape", "Rectangle"],
            ["circle", "shape", "Circle"],
            ["arrow", "send", "Arrow"],
          ].map(([tool, iconName, label]) => `
            <button class="draw-tool-btn ${tool === "brush" ? "active" : ""}" data-tool="${tool}">${icon(iconName, label)}</button>
          `).join("")}
        </div>
        <label class="field-label">Color</label>
        <div class="draw-swatches" id="draw-swatches">
          ${COLORS.map((color, index) => `<button class="draw-swatch ${index === 0 ? "active" : ""}" data-color="${color}" style="background:${color}"></button>`).join("")}
        </div>
        <label class="field-label">Size</label>
        <input type="range" id="draw-size" min="1" max="40" value="6" />
        <label class="field-label">Options</label>
        <label class="draw-check"><input type="checkbox" id="draw-fill" /> Fill shapes</label>
        <label class="draw-check"><input type="checkbox" id="draw-grid" checked /> Show guide grid</label>
        <div class="modal-actions" style="justify-content:flex-start;margin-top:8px">
          <button class="btn btn-secondary btn-sm" id="draw-clear-btn">${icon("close", "Clear Canvas")}</button>
        </div>
      </div>
      <div class="card draw-stage">
        <canvas id="draw-canvas" width="1400" height="900"></canvas>
      </div>
    </div>
  `;

  const canvas = wrap.querySelector("#draw-canvas");
  const ctx = canvas.getContext("2d");
  let tool = "brush";
  let color = COLORS[0];
  let size = 6;
  let fillShapes = false;
  let showGrid = true;
  let drawing = false;
  let startPoint = null;
  let snapshot = null;
  const history = [];
  const future = [];

  const getPos = (event) => {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] || event;
    return {
      x: ((source.clientX - rect.left) / rect.width) * canvas.width,
      y: ((source.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const pushHistory = () => {
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.length > 30) history.shift();
    future.length = 0;
  };

  const redrawGrid = () => {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (showGrid) {
      ctx.strokeStyle = "rgba(148,163,184,0.18)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  const resetCanvas = () => {
    redrawGrid();
    pushHistory();
  };

  const drawArrow = (from, to) => {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const headLength = Math.max(14, size * 2.2);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6), to.y - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6), to.y - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    fillShapes ? ctx.fill() : ctx.stroke();
  };

  const drawShape = (from, to) => {
    const width = to.x - from.x;
    const height = to.y - from.y;
    ctx.putImageData(snapshot, 0, 0);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "line") {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      return;
    }

    if (tool === "rectangle") {
      if (fillShapes) ctx.fillRect(from.x, from.y, width, height);
      else ctx.strokeRect(from.x, from.y, width, height);
      return;
    }

    if (tool === "circle") {
      ctx.beginPath();
      ctx.ellipse(from.x + width / 2, from.y + height / 2, Math.abs(width / 2), Math.abs(height / 2), 0, 0, Math.PI * 2);
      fillShapes ? ctx.fill() : ctx.stroke();
      return;
    }

    if (tool === "arrow") {
      drawArrow(from, to);
    }
  };

  const beginDraw = (event) => {
    event.preventDefault();
    drawing = true;
    startPoint = getPos(event);
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.fillStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "marker" ? size * 2.2 : size;
    ctx.globalAlpha = tool === "marker" ? 0.35 : 1;
    if (tool === "brush" || tool === "marker" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
    }
  };

  const moveDraw = (event) => {
    if (!drawing) return;
    const point = getPos(event);
    if (tool === "brush" || tool === "marker" || tool === "eraser") {
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      return;
    }
    drawShape(startPoint, point);
  };

  const endDraw = () => {
    if (!drawing) return;
    drawing = false;
    ctx.globalAlpha = 1;
    pushHistory();
  };

  canvas.addEventListener("pointerdown", beginDraw);
  canvas.addEventListener("pointermove", moveDraw);
  window.addEventListener("pointerup", endDraw);
  canvas.addEventListener("pointerleave", endDraw);

  wrap.querySelectorAll(".draw-tool-btn").forEach((button) => {
    button.addEventListener("click", () => {
      wrap.querySelectorAll(".draw-tool-btn").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
      tool = button.dataset.tool;
    });
  });

  wrap.querySelectorAll(".draw-swatch").forEach((button) => {
    button.addEventListener("click", () => {
      wrap.querySelectorAll(".draw-swatch").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
      color = button.dataset.color;
    });
  });

  wrap.querySelector("#draw-size").addEventListener("input", (event) => {
    size = parseInt(event.target.value, 10);
  });
  wrap.querySelector("#draw-fill").addEventListener("change", (event) => {
    fillShapes = event.target.checked;
  });
  wrap.querySelector("#draw-grid").addEventListener("change", (event) => {
    showGrid = event.target.checked;
    const latest = history[history.length - 1];
    redrawGrid();
    if (latest) ctx.putImageData(latest, 0, 0);
  });

  wrap.querySelector("#draw-clear-btn").addEventListener("click", () => {
    redrawGrid();
    pushHistory();
    toast("Canvas cleared.", "info");
  });
  wrap.querySelector("#draw-undo-btn").addEventListener("click", () => {
    if (history.length <= 1) return;
    future.push(history.pop());
    ctx.putImageData(history[history.length - 1], 0, 0);
  });
  wrap.querySelector("#draw-redo-btn").addEventListener("click", () => {
    const next = future.pop();
    if (!next) return;
    history.push(next);
    ctx.putImageData(next, 0, 0);
  });
  wrap.querySelector("#draw-download-btn").addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "classflow-drawing.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  redrawGrid();
  pushHistory();
  return wrap;
}
