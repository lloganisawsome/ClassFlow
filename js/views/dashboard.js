// js/views/dashboard.js
import { navigateTo } from "../app.js";

const TOOLS = [
  { view: "timer",      name: "Timer",       desc: "Countdown with presets & alarm",   icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 3"/><path d="M9.5 2.5h5"/></svg>` },
  { view: "wheel",      name: "Random Wheel", desc: "Spin to pick a random student",   icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v9M12 12l6.5 6.5"/></svg>` },
  { view: "groups",     name: "Groups",      desc: "Auto-generate student groups",      icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>` },
  { view: "scoreboard", name: "Scoreboard",  desc: "Live team & individual scores",     icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>` },
  { view: "qr",         name: "QR Code",     desc: "Instant QR for any link",           icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="17" y="17" width="3" height="3"/></svg>` },
  { view: "grades",     name: "Grades",      desc: "Quick grade & percentage calc",     icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>` },
  { view: "links",      name: "Quick Links", desc: "Saved links for fast lesson setup", icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>` },
  { view: "notes",      name: "Notes",       desc: "Keep quick notes by class",         icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4M9 9h2"/></svg>` },
  { view: "draw",       name: "Draw",        desc: "Brushes, shapes, arrows, and more", icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m4 20 4.5-1 9.6-9.6a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z"/><path d="m13.5 6.5 4 4"/></svg>` },
  { view: "camera",     name: "Camera",      desc: "Webcam viewer & snapshot",          icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>` },
  { view: "controller", name: "Controller",  desc: "Link another device to control",    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="3"/><path d="M16 3h-1a4 4 0 00-4 4v14"/></svg>` },
  { view: "feedback",   name: "Feedback",    desc: "Report bugs and suggest features",  icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/><path d="M8 9h8M8 13h5"/></svg>` },
];

export function renderDashboard({ classData }) {
  const wrap = document.createElement("div");
  wrap.className = "view";

  const className = classData?.name || null;

  wrap.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">${className ? className : "Dashboard"}</h1>
        <p class="view-subtitle">${className ? "Select a tool to get started" : "Select or create a class to begin"}</p>
      </div>
    </div>
    <div class="dashboard-grid">
      ${TOOLS.map((t, i) => `
        <div class="tool-card" data-view="${t.view}" style="animation-delay:${i * 0.04}s">
          <div class="tool-card-icon">${t.icon}</div>
          <div>
            <div class="tool-card-name">${t.name}</div>
            <div class="tool-card-desc">${t.desc}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  wrap.querySelectorAll(".tool-card").forEach(card => {
    card.addEventListener("click", () => navigateTo(card.dataset.view));
  });

  return wrap;
}
