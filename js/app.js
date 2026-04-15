// js/app.js
// ClassFlow — Main app orchestrator

import { auth, db } from "./firebase-init.js";
import { watchAuth } from "./auth.js";
import { ref, set, get, push, remove, onValue, update }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { renderDashboard }   from "./views/dashboard.js";
import { renderTimer }       from "./views/timer.js";
import { renderWheel }       from "./views/wheel.js";
import { renderGroups }      from "./views/groups.js";
import { renderScoreboard }  from "./views/scoreboard.js";
import { renderQR }          from "./views/qr.js";
import { renderGrades }      from "./views/grades.js";
import { renderLinks }       from "./views/links.js";
import { renderNotes }       from "./views/notes.js";
import { renderDraw }        from "./views/draw.js";
import { renderFeedback }    from "./views/feedback.js";
import { renderCamera }      from "./views/camera.js";
import { renderController }  from "./views/controller.js";
import { renderSettings }    from "./views/settings.js";
import { initThemes }        from "./themes.js";

// ── State ──────────────────────────────────────────────
export let currentUser  = null;
export let currentClass = null;  // { id, name, ... }
export let classData    = {};    // current class Firebase data
let classUnsubscribe    = null;
let controllerUnsubscribe = null;
let activeModalCleanup = null;

// ── Boot ───────────────────────────────────────────────
(async () => {
  if (renderControllerShellFromQuery()) return;

  // Show particles on loading screen
  spawnParticles();

  // Wait for auth state
  watchAuth(async (user) => {
    if (user) {
      currentUser = user;
      updateUserChip();
      hideLoading();
      showApp();
      await loadClasses();
      initThemes();
      maybeStartOnboarding();
      // Restore last active class
      const lastClass = localStorage.getItem(`cf_lastClass_${user.uid}`);
      if (lastClass) selectClass(lastClass);
    } else {
      currentUser = null;
      currentClass = null;
      hideLoading();
      showAuth();
    }
  });
})();

// ── Screen management ──────────────────────────────────
function hideLoading() {
  setTimeout(() => {
    document.getElementById("loading-screen").style.opacity = "0";
    document.getElementById("loading-screen").style.transition = "opacity 0.4s";
    setTimeout(() => {
      document.getElementById("loading-screen").classList.add("hidden");
    }, 400);
  }, 1800);
}
function showApp() {
  setTimeout(() => {
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    document.body.dataset.page = "app";
    navigateTo("dashboard");
  }, 1900);
}
function showAuth() {
  setTimeout(() => {
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
    document.body.dataset.page = "auth";
    ensureControllerJoinEntry();
  }, 1900);
}

// ── User chip ─────────────────────────────────────────
function updateUserChip() {
  const name = currentUser.displayName || currentUser.email.split("@")[0];
  document.getElementById("user-name-display").textContent = name;
  document.getElementById("user-initial").textContent = name[0].toUpperCase();
}

// ── Navigation ─────────────────────────────────────────
const viewMap = {
  dashboard: renderDashboard,
  timer: renderTimer,
  wheel: renderWheel,
  groups: renderGroups,
  scoreboard: renderScoreboard,
  qr: renderQR,
  grades: renderGrades,
  links: renderLinks,
  notes: renderNotes,
  draw: renderDraw,
  feedback: renderFeedback,
  camera: renderCamera,
  controller: renderController,
  settings: renderSettings,
};

export function navigateTo(view) {
  const container = document.getElementById("view-container");
  // Update nav
  document.querySelectorAll(".nav-item").forEach(n => {
    n.classList.toggle("active", n.dataset.view === view);
  });
  // Render view
  const renderer = viewMap[view];
  if (renderer) {
    container.innerHTML = "";
    const el = renderer({ user: currentUser, classId: currentClass?.id, classData });
    if (el) container.appendChild(el);
  }
}

// Wire nav clicks
document.querySelectorAll(".nav-item[data-view]").forEach(item => {
  item.addEventListener("click", () => navigateTo(item.dataset.view));
});
document.getElementById("settings-btn").addEventListener("click", () => navigateTo("settings"));
document.getElementById("join-controller-btn")?.addEventListener("click", () => openControllerJoinFlow());

// Sidebar toggle
document.getElementById("sidebar-toggle").addEventListener("click", () => {
  const sidebar = document.getElementById("sidebar");
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle("mobile-open");
  } else {
    sidebar.classList.toggle("collapsed");
  }
});

// ── Classes ────────────────────────────────────────────
async function loadClasses() {
  const uid = currentUser.uid;
  const classesRef = ref(db, `users/${uid}/classes`);
  onValue(classesRef, (snap) => {
    const selector = document.getElementById("class-selector");
    const prev = selector.value;
    selector.innerHTML = '<option value="">— Select Class —</option>';
    if (snap.exists()) {
      Object.entries(snap.val()).forEach(([id, cls]) => {
        const opt = document.createElement("option");
        opt.value = id; opt.textContent = cls.name;
        selector.appendChild(opt);
      });
      // Restore selection
      if (prev && selector.querySelector(`option[value="${prev}"]`)) {
        selector.value = prev;
      }
    }
  });
}

document.getElementById("class-selector").addEventListener("change", function () {
  selectClass(this.value);
});

export function selectClass(classId) {
  if (!classId) return;
  document.getElementById("class-selector").value = classId;
  localStorage.setItem(`cf_lastClass_${currentUser.uid}`, classId);
  publishControllerLookup(currentUser.uid, classId);

  // Unsubscribe previous
  if (classUnsubscribe) classUnsubscribe();
  if (controllerUnsubscribe) controllerUnsubscribe();

  const uid = currentUser.uid;
  const classRef = ref(db, `users/${uid}/classes/${classId}`);

  classUnsubscribe = onValue(classRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.val();
    currentClass = { id: classId, ...data };
    classData    = data;
    // Re-render current view
    const activeNav = document.querySelector(".nav-item.active");
    if (activeNav) navigateTo(activeNav.dataset.view || "dashboard");
  });

  // Controller messages listener
  const msgRef = ref(db, `users/${uid}/classes/${classId}/controllerMsg`);
  controllerUnsubscribe = onValue(msgRef, (snap) => {
    if (!snap.exists() || !snap.val()) return;
    const msg = snap.val();
    if (msg.text && msg.show) {
      showOverlayMessage(msg.text);
    }
  });

  selectClass._current = classId;
}

function showOverlayMessage(text) {
  document.getElementById("overlay-message-text").textContent = text;
  document.getElementById("overlay-message").classList.remove("hidden");
}

// ── Add class ──────────────────────────────────────────
document.getElementById("add-class-btn").addEventListener("click", () => {
  openModal("New Class", `
    <label class="field-label">Class Name</label>
    <input type="text" id="new-class-name" placeholder="e.g. Period 3 — Algebra" />
    <button class="btn btn-primary" id="create-class-confirm">Create Class</button>
  `);
  setTimeout(() => {
    document.getElementById("create-class-confirm").addEventListener("click", async () => {
      const name = document.getElementById("new-class-name").value.trim();
      if (!name) return;
      const uid = currentUser.uid;
      const newRef = push(ref(db, `users/${uid}/classes`));
      await set(newRef, {
        name,
        students: {},
        scoreboard: {},
        links: {},
        timerPreset: 10,
        theme: null,
        wheelItems: [],
        createdAt: Date.now()
      });
      closeModal();
      toast("Class created!", "success");
      selectClass(newRef.key);
    });
  }, 50);
});

// ── DB helpers (exported for views) ───────────────────
export async function dbSet(path, value) {
  if (!currentUser) return;
  return set(ref(db, `users/${currentUser.uid}/${path}`), value);
}
export async function dbUpdate(path, value) {
  if (!currentUser) return;
  return update(ref(db, `users/${currentUser.uid}/${path}`), value);
}
export async function dbPush(path, value) {
  if (!currentUser) return;
  const r = push(ref(db, `users/${currentUser.uid}/${path}`));
  await set(r, value);
  return r.key;
}
export async function dbRemove(path) {
  if (!currentUser) return;
  return remove(ref(db, `users/${currentUser.uid}/${path}`));
}
export function dbListen(path, cb) {
  if (!currentUser) return () => {};
  return onValue(ref(db, `users/${currentUser.uid}/${path}`), cb);
}

// ── Modal helpers ──────────────────────────────────────
function openModal(title, bodyHTML) {
  if (activeModalCleanup) {
    activeModalCleanup();
    activeModalCleanup = null;
  }
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = bodyHTML;
  document.getElementById("modal-backdrop").classList.remove("hidden");
}
function closeModal() {
  if (activeModalCleanup) {
    activeModalCleanup();
    activeModalCleanup = null;
  }
  document.getElementById("modal-backdrop").classList.add("hidden");
  document.getElementById("modal-backdrop").classList.remove("tour-mode");
  document.getElementById("modal-title").textContent = "";
  document.getElementById("modal-body").innerHTML = "";
}
document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal-backdrop").addEventListener("click", (e) => {
  if (e.target === document.getElementById("modal-backdrop")) closeModal();
});

function bindModalEscape(handler) {
  const onKeydown = (event) => {
    if (event.key === "Escape") handler();
  };
  document.addEventListener("keydown", onKeydown);
  activeModalCleanup = () => document.removeEventListener("keydown", onKeydown);
}

export function openConfirmModal({
  title = "Confirm Action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
}) {
  return new Promise((resolve) => {
    openModal(title, `
      <p class="modal-copy">${message}</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel-btn">${cancelLabel}</button>
        <button class="btn ${tone === "danger" ? "btn-danger" : "btn-primary"}" id="modal-confirm-btn">${confirmLabel}</button>
      </div>
    `);

    const finish = (value) => {
      closeModal();
      resolve(value);
    };

    document.getElementById("modal-cancel-btn")?.addEventListener("click", () => finish(false));
    document.getElementById("modal-confirm-btn")?.addEventListener("click", () => finish(true));
    bindModalEscape(() => finish(false));
  });
}

export function openPromptModal({
  title = "Enter Value",
  label = "Value",
  placeholder = "",
  value = "",
  confirmLabel = "Save",
  cancelLabel = "Cancel",
  multiline = false,
  validate,
}) {
  return new Promise((resolve) => {
    const fieldMarkup = multiline
      ? `<textarea id="modal-prompt-input" placeholder="${placeholder}"></textarea>`
      : `<input type="text" id="modal-prompt-input" placeholder="${placeholder}" />`;

    openModal(title, `
      <label class="field-label" for="modal-prompt-input">${label}</label>
      ${fieldMarkup}
      <p class="modal-error hidden" id="modal-error-text"></p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel-btn">${cancelLabel}</button>
        <button class="btn btn-primary" id="modal-confirm-btn">${confirmLabel}</button>
      </div>
    `);

    const input = document.getElementById("modal-prompt-input");
    const error = document.getElementById("modal-error-text");
    if (input) input.value = value;

    const finish = (result) => {
      closeModal();
      resolve(result);
    };
    const submit = () => {
      const nextValue = input?.value ?? "";
      const validation = validate ? validate(nextValue) : null;
      if (validation) {
        error.textContent = validation;
        error.classList.remove("hidden");
        input?.focus();
        return;
      }
      finish(nextValue);
    };

    document.getElementById("modal-cancel-btn")?.addEventListener("click", () => finish(null));
    document.getElementById("modal-confirm-btn")?.addEventListener("click", submit);
    input?.addEventListener("keydown", (event) => {
      if (!multiline && event.key === "Enter") submit();
    });
    bindModalEscape(() => finish(null));
    setTimeout(() => {
      input?.focus();
      if (typeof input?.select === "function" && !multiline) input.select();
    }, 0);
  });
}

function maybeStartOnboarding() {
  if (!currentUser || localStorage.getItem(`cf_tour_seen_${currentUser.uid}`) === "1") return;

  const steps = [
    {
      title: "Welcome to ClassFlow",
      body: `
        <p class="modal-copy">This quick tour points out the pieces you will use most during class.</p>
        <div class="tour-points">
          <div class="tour-point"><strong>Classes</strong><span>Create or switch your active class from the top bar.</span></div>
          <div class="tour-point"><strong>Dashboard</strong><span>Jump into timer, wheel, links, camera, and controller tools from one place.</span></div>
          <div class="tour-point"><strong>Settings</strong><span>Rename classes and manage your student roster without leaving the app.</span></div>
        </div>
      `,
      target: null,
    },
    {
      title: "Pick or Create a Class",
      body: `<p class="modal-copy">Use the class picker to switch classes, or the plus button to create one before using class-based tools.</p>`,
      target: ".class-selector-wrap",
    },
    {
      title: "Theme Picker",
      body: `<p class="modal-copy">Find themes here. Click the theme button now and I will show you what it does next.</p>`,
      target: "#theme-toggle-btn",
      waitForClick: "#theme-toggle-btn",
    },
    {
      title: "Themes Change The Look",
      body: `<p class="modal-copy">This opens the theme picker so you can switch the whole app style fast during class.</p>`,
      target: ".theme-picker-wrap",
    },
    {
      title: "Navigation",
      body: `<p class="modal-copy">Use the sidebar to jump between timer, wheel, notes, drawing, controller, and the rest of your tools.</p>`,
      target: ".sidebar-nav",
    },
    {
      title: "Settings and Feedback",
      body: `<p class="modal-copy">Settings handles class management and the update log. Feedback lets you send bug reports and feature requests.</p>`,
      target: ".sidebar-bottom",
    },
  ];

  let index = 0;
  let stepCleanup = null;

  const showStep = () => {
    stepCleanup?.();
    stepCleanup = null;
    document.querySelectorAll(".tour-highlight").forEach((node) => node.classList.remove("tour-highlight"));
    const step = steps[index];
    if (step.target) {
      const target = document.querySelector(step.target);
      if (target) {
        target.classList.add("tour-highlight");
        target.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
    document.getElementById("modal-backdrop")?.classList.toggle("tour-mode", Boolean(step.waitForClick));

    openModal(step.title, `
      ${step.body}
      <div class="modal-actions">
        <button class="btn btn-secondary" id="tour-skip-btn">${index === steps.length - 1 ? "Close" : "Skip Tour"}</button>
        <button class="btn btn-primary" id="tour-next-btn">${step.waitForClick ? "Waiting..." : index === steps.length - 1 ? "Finish" : "Next"}</button>
      </div>
    `);

    const finishTour = () => {
      stepCleanup?.();
      stepCleanup = null;
      localStorage.setItem(`cf_tour_seen_${currentUser.uid}`, "1");
      document.querySelectorAll(".tour-highlight").forEach((node) => node.classList.remove("tour-highlight"));
      document.getElementById("modal-backdrop")?.classList.remove("tour-mode");
      closeModal();
    };

    const goNext = () => {
      if (index === steps.length - 1) {
        finishTour();
        return;
      }
      index += 1;
      showStep();
    };

    document.getElementById("tour-skip-btn")?.addEventListener("click", finishTour);
    const nextButton = document.getElementById("tour-next-btn");
    if (step.waitForClick) {
      nextButton.disabled = true;
      const target = document.querySelector(step.waitForClick);
      const handleClick = () => {
        stepCleanup?.();
        stepCleanup = null;
        setTimeout(goNext, 150);
      };
      target?.addEventListener("click", handleClick, { once: true });
      stepCleanup = () => target?.removeEventListener("click", handleClick);
    } else {
      nextButton?.addEventListener("click", goNext);
    }
    bindModalEscape(finishTour);
  };

  setTimeout(showStep, 300);
}

function renderControllerShellFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const controllerToken = params.get("controller");
  if (!controllerToken) return false;

  const [ownerUid, classId] = controllerToken.split("_");
  if (!ownerUid || !classId) return false;

  document.getElementById("loading-screen")?.classList.add("hidden");
  document.getElementById("auth-screen")?.classList.add("hidden");
  document.getElementById("app")?.classList.add("hidden");
  document.getElementById("modal-backdrop")?.classList.add("hidden");
  document.body.dataset.page = "controller";
  document.body.classList.add("controller-page");

  const root = document.createElement("main");
  root.id = "public-controller-root";
  root.className = "public-controller-root";
  root.innerHTML = `
    <section class="public-controller-shell">
      <div class="public-controller-header">
        <div>
          <p class="public-controller-kicker">ClassFlow Remote</p>
          <h1 id="public-controller-title">Connecting...</h1>
          <p id="public-controller-subtitle">Looking up this classroom controller.</p>
        </div>
      </div>
      <div class="public-controller-grid">
        <div class="card">
          <div class="card-title">Message</div>
          <label class="field-label" for="public-controller-message">Display on main screen</label>
          <textarea id="public-controller-message" placeholder="Type a message for the classroom display"></textarea>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="public-controller-clear">Clear</button>
            <button class="btn btn-primary" id="public-controller-send">Show Message</button>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Controls</div>
          <div class="public-controller-actions">
            <button class="btn btn-secondary" data-cmd="timer_start">Start Timer</button>
            <button class="btn btn-secondary" data-cmd="timer_stop">Pause Timer</button>
            <button class="btn btn-secondary" data-cmd="timer_reset">Reset Timer</button>
            <button class="btn btn-secondary" data-cmd="wheel_spin">Spin Wheel</button>
          </div>
          <p class="public-controller-note">This device sends commands directly to the selected class.</p>
        </div>
      </div>
    </section>
  `;
  document.body.appendChild(root);

  const classRef = ref(db, `users/${ownerUid}/classes/${classId}`);
  get(classRef).then((snap) => {
    if (!snap.exists()) {
      document.getElementById("public-controller-title").textContent = "Controller link not found";
      document.getElementById("public-controller-subtitle").textContent = "Ask the teacher to generate a fresh controller link from the app.";
      root.querySelectorAll("button, textarea").forEach((node) => node.disabled = true);
      return;
    }
    const data = snap.val();
    document.getElementById("public-controller-title").textContent = data?.name || "Class Controller";
    document.getElementById("public-controller-subtitle").textContent = "Connected. You can send messages and control classroom tools from here.";
  }).catch(() => {
    document.getElementById("public-controller-title").textContent = "Unable to connect";
    document.getElementById("public-controller-subtitle").textContent = "Please reload the page or open a new controller link.";
  });

  const writePublic = (path, value) => set(ref(db, `users/${ownerUid}/classes/${classId}/${path}`), value);

  root.querySelector("#public-controller-send")?.addEventListener("click", async () => {
    const message = root.querySelector("#public-controller-message").value.trim();
    if (!message) {
      toast("Enter a message first.", "error");
      return;
    }
    await writePublic("controllerMsg", { text: message, show: true, ts: Date.now() });
    toast("Message sent.", "success");
  });

  root.querySelector("#public-controller-clear")?.addEventListener("click", async () => {
    root.querySelector("#public-controller-message").value = "";
    await writePublic("controllerMsg", { text: "", show: false, ts: Date.now() });
    toast("Message cleared.", "info");
  });

  root.querySelectorAll("[data-cmd]").forEach((button) => {
    button.addEventListener("click", async () => {
      await writePublic("controllerCmd", { cmd: button.dataset.cmd, ts: Date.now() });
      toast("Command sent.", "success");
    });
  });

  return true;
}

function buildControllerCode(ownerUid, classId) {
  return `${ownerUid.slice(0, 6)}-${classId.slice(0, 6)}`.toUpperCase();
}

async function publishControllerLookup(ownerUid, classId) {
  if (!ownerUid || !classId) return;
  const classSnap = await get(ref(db, `users/${ownerUid}/classes/${classId}`)).catch(() => null);
  const className = classSnap?.exists() ? classSnap.val()?.name || "" : "";
  return set(ref(db, `controllerLookup/${buildControllerCode(ownerUid, classId)}`), {
    ownerUid,
    classId,
    className,
    updatedAt: Date.now(),
  });
}

function ensureControllerJoinEntry() {
  if (document.getElementById("controller-join-entry")) return;

  const authCard = document.querySelector(".auth-card");
  if (!authCard) return;

  const entry = document.createElement("div");
  entry.className = "controller-join-entry";
  entry.id = "controller-join-entry";
  entry.innerHTML = `
    <p>Using a classroom remote?</p>
    <button class="btn btn-secondary" id="controller-join-btn">Join with Controller Code</button>
  `;
  authCard.appendChild(entry);

  entry.querySelector("#controller-join-btn")?.addEventListener("click", () => openControllerJoinFlow());
}

async function openControllerJoinFlow() {
  const code = await openPromptModal({
    title: "Join Controller",
    label: "Controller Code",
    placeholder: "ABC123-DEF456",
    confirmLabel: "Join Controller",
    validate: (value) => value.trim() ? null : "Enter the controller code shown in ClassFlow.",
  });
  if (!code) return;

  const normalized = code.trim().toUpperCase();
  const lookupSnap = await get(ref(db, `controllerLookup/${normalized}`)).catch(() => null);
  if (!lookupSnap?.exists()) {
    toast("Controller code not found.", "error");
    return;
  }

  const match = lookupSnap.val();
  const params = new URLSearchParams(window.location.search);
  params.set("controller", `${match.ownerUid}_${match.classId}`);
  window.location.search = params.toString();
}

export { openModal, closeModal };

// ── Toast ──────────────────────────────────────────────
export function toast(msg, type = "info") {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const icons = { success: "✓", error: "✕", info: "ℹ" };
  el.innerHTML = `<span>${icons[type] || "ℹ"}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add("fade-out");
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

// ── Particles ─────────────────────────────────────────
function spawnParticles() {
  const container = document.getElementById("loading-particles");
  for (let i = 0; i < 20; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.left = Math.random() * 100 + "vw";
    p.style.setProperty("--dur", (3 + Math.random() * 4) + "s");
    p.style.setProperty("--delay", (Math.random() * 4) + "s");
    p.style.width = p.style.height = (3 + Math.random() * 5) + "px";
    container.appendChild(p);
  }
}

// ── Logout ─────────────────────────────────────────────
document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut(auth);
  currentUser = null; currentClass = null; classData = {};
  document.getElementById("app").classList.add("hidden");
  document.getElementById("auth-screen").classList.remove("hidden");
  document.getElementById("login-email").value = "";
  document.getElementById("login-password").value = "";
  toast("Signed out.", "info");
});
