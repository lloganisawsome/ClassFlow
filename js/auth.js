// js/auth.js
// ClassFlow — Authentication (email/password via Firebase Auth)

import { auth } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ── Tab switching ──────────────────────────────────────
const tabs     = document.querySelectorAll(".auth-tab");
const forms    = document.querySelectorAll(".auth-form");
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    forms.forEach(f => f.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab + "-form").classList.add("active");
  });
});

// ── Login ──────────────────────────────────────────────
document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const pass  = document.getElementById("login-password").value;
  const errEl = document.getElementById("login-error");
  errEl.classList.add("hidden");
  if (!email || !pass) { showAuthError(errEl, "Please fill in all fields."); return; }
  setLoading("login-btn", true);
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    showAuthError(errEl, friendlyError(e.code));
    setLoading("login-btn", false);
  }
});

// ── Signup ─────────────────────────────────────────────
document.getElementById("signup-btn").addEventListener("click", async () => {
  const name  = document.getElementById("signup-username").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const pass  = document.getElementById("signup-password").value;
  const errEl = document.getElementById("signup-error");
  errEl.classList.add("hidden");
  if (!name || !email || !pass) { showAuthError(errEl, "Please fill in all fields."); return; }
  if (pass.length < 6) { showAuthError(errEl, "Password must be at least 6 characters."); return; }
  setLoading("signup-btn", true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    // Auth state change will trigger app load
  } catch (e) {
    showAuthError(errEl, friendlyError(e.code));
    setLoading("signup-btn", false);
  }
});

// ── Logout ─────────────────────────────────────────────
document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut(auth);
});

// ── Auth State Observer (used by app.js via window.onAuthReady) ──
export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── Helpers ────────────────────────────────────────────
function showAuthError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  btn.style.opacity = loading ? "0.6" : "1";
}
function friendlyError(code) {
  const map = {
    "auth/user-not-found":       "No account found with that email.",
    "auth/wrong-password":       "Incorrect password.",
    "auth/email-already-in-use": "An account with that email already exists.",
    "auth/invalid-email":        "Please enter a valid email address.",
    "auth/too-many-requests":    "Too many attempts. Please try again later.",
    "auth/weak-password":        "Password is too weak.",
    "auth/invalid-credential":   "Invalid email or password.",
  };
  return map[code] || "Something went wrong. Please try again.";
}
