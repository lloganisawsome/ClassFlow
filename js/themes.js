// js/themes.js
// ClassFlow — Theme system

import { dbSet, dbListen, currentClass, currentUser, toast } from "./app.js";

export const THEMES = [
  { id: "dark-default",     name: "Dark Slate",       swatch: ["#0f1117","#6c8aff"] },
  { id: "neon-blue",        name: "Neon Blue",         swatch: ["#060b18","#00b4ff"] },
  { id: "whiteboard",       name: "Whiteboard",        swatch: ["#f4f5f7","#4361ee"] },
  { id: "retro-arcade",     name: "Retro Arcade",      swatch: ["#0d0d0d","#ff3c78"] },
  { id: "minimal-gray",     name: "Minimal",           swatch: ["#f9fafb","#374151"] },
  { id: "solarized",        name: "Solarized",         swatch: ["#002b36","#268bd2"] },
  { id: "cyberpunk",        name: "Cyberpunk",         swatch: ["#0a0010","#ff00aa"] },
  { id: "soft-pastel",      name: "Soft Pastel",       swatch: ["#fef6ff","#c77dff"] },
  { id: "forest",           name: "Forest",            swatch: ["#0c1a0e","#4caf75"] },
  { id: "ocean",            name: "Ocean Depth",       swatch: ["#040e1a","#00c8e6"] },
  { id: "sunset",           name: "Sunset",            swatch: ["#1a0a00","#ff7700"] },
  { id: "rose-gold",        name: "Rose Gold",         swatch: ["#fdf3f3","#d4547a"] },
  { id: "nord",             name: "Nord",              swatch: ["#2e3440","#88c0d0"] },
  { id: "dracula",          name: "Dracula",           swatch: ["#282a36","#bd93f9"] },
  { id: "monokai",          name: "Monokai",           swatch: ["#272822","#a6e22e"] },
  { id: "midnight-navy",    name: "Midnight Navy",     swatch: ["#07090f","#4d8fff"] },
  { id: "emerald",          name: "Emerald",           swatch: ["#f0faf5","#059669"] },
  { id: "warm-cream",       name: "Warm Cream",        swatch: ["#faf8f3","#c88c3a"] },
  { id: "electric-violet",  name: "Electric Violet",   swatch: ["#0d0515","#9b30ff"] },
  { id: "hot-coral",        name: "Hot Coral",         swatch: ["#fff5f5","#ff4444"] },
  { id: "slate-blue",       name: "Slate Blue",        swatch: ["#1e2233","#7b9cff"] },
  { id: "gold-rush",        name: "Gold Rush",         swatch: ["#111008","#f0c020"] },
  { id: "arctic",           name: "Arctic",            swatch: ["#f8fbff","#0a7aff"] },
  { id: "terminal",         name: "Terminal",          swatch: ["#0a0f0a","#00ff44"] },
  { id: "coffee",           name: "Coffee",            swatch: ["#1a1208","#d4862a"] },
];

let currentTheme = "dark-default";

export function initThemes() {
  buildDropdown();
  // Load saved theme
  const saved = localStorage.getItem("cf_theme") || "dark-default";
  applyTheme(saved);

  // Toggle button
  document.getElementById("theme-toggle-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    const dd = document.getElementById("theme-dropdown");
    dd.classList.toggle("hidden");
    dd.classList.toggle("anim-slide-down");
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".theme-picker-wrap")) {
      document.getElementById("theme-dropdown").classList.add("hidden");
    }
  });
}

function buildDropdown() {
  const dd = document.getElementById("theme-dropdown");
  dd.innerHTML = `<h4>Theme</h4><div class="theme-grid"></div>`;
  const grid = dd.querySelector(".theme-grid");
  THEMES.forEach(t => {
    const opt = document.createElement("div");
    opt.className = "theme-option";
    opt.dataset.id = t.id;
    opt.innerHTML = `
      <div class="theme-swatch" style="background:linear-gradient(135deg,${t.swatch[0]} 50%,${t.swatch[1]} 50%)"></div>
      <span>${t.name}</span>
    `;
    opt.addEventListener("click", () => {
      applyTheme(t.id);
      document.getElementById("theme-dropdown").classList.add("hidden");
      toast(`Theme: ${t.name}`, "info");
    });
    grid.appendChild(opt);
  });
}

export function applyTheme(themeId) {
  const body = document.body;
  THEMES.forEach(t => body.classList.remove(`theme-${t.id}`));
  body.classList.add(`theme-${themeId}`);
  currentTheme = themeId;
  localStorage.setItem("cf_theme", themeId);
  // Highlight active in dropdown
  document.querySelectorAll(".theme-option").forEach(o => {
    o.classList.toggle("active", o.dataset.id === themeId);
  });
}
