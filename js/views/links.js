// js/views/links.js
import { dbSet, dbRemove, toast, openPromptModal } from "../app.js";
import { icon } from "../ui/icons.js";

export function renderLinks({ classId, classData }) {
  const wrap = document.createElement("div");
  wrap.className = "view";
  const links = classData?.links ? Object.entries(classData.links) : [];

  wrap.innerHTML = `
    <div class="view-header">
      <div><h1 class="view-title">Quick Links</h1><p class="view-subtitle">Saved links for lightning-fast lesson setup</p></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" id="open-all-btn">${icon("send", "Open All")}</button>
        <button class="btn btn-primary btn-sm" id="add-link-btn">${icon("add", "Add Link")}</button>
      </div>
    </div>
    <div class="links-grid" id="links-grid"></div>
    <div id="no-links" style="display:none;text-align:center;padding:48px;color:var(--text-muted)">
      <p style="font-size:1rem">No links saved yet.</p>
      <p style="font-size:.82rem;margin-top:4px">Add links to quickly open them during class.</p>
    </div>
  `;

  function renderLinksList(data) {
    const grid  = wrap.querySelector("#links-grid");
    const empty = wrap.querySelector("#no-links");
    const entries = data ? Object.entries(data) : [];
    if (!entries.length) { grid.innerHTML = ""; empty.style.display = ""; return; }
    empty.style.display = "none";
    grid.innerHTML = entries.map(([id, link]) => `
      <div class="link-card" data-url="${link.url}">
        <div class="link-favicon">
          <img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(link.url)}&sz=32" 
               style="width:20px;height:20px;border-radius:4px"
               onerror="this.style.display='none'"/>
        </div>
        <div style="flex:1;min-width:0">
          <div class="link-name">${link.name || "Link"}</div>
          <div class="link-url">${link.url}</div>
        </div>
        <button class="link-delete" data-id="${id}" title="Remove" aria-label="Remove">${icon("close")}</button>
      </div>
    `).join("");

    grid.querySelectorAll(".link-card").forEach(card => {
      card.addEventListener("click", (e) => {
        if (!e.target.closest(".link-delete")) window.open(card.dataset.url, "_blank");
      });
    });
    grid.querySelectorAll(".link-delete").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (classId) await dbRemove(`classes/${classId}/links/${btn.dataset.id}`);
        toast("Link removed.", "info");
        const newLinks = classData?.links ? { ...classData.links } : {};
        delete newLinks[btn.dataset.id];
        renderLinksList(newLinks);
      });
    });
  }

  wrap.querySelector("#add-link-btn").addEventListener("click", async () => {
    if (!classId) { toast("Select a class first.", "error"); return; }
    const url  = await openPromptModal({
      title: "Add Link",
      label: "URL",
      value: "https://",
      confirmLabel: "Next",
      validate: (value) => {
        const trimmed = value.trim();
        if (!trimmed) return "Enter a URL first.";
        if (!/^https?:\/\//i.test(trimmed)) return "Use a full URL starting with http or https.";
        return null;
      },
    });
    if (!url?.trim() || !url.startsWith("http")) { if (url) toast("Please enter a valid URL starting with http.", "error"); return; }
    const name = await openPromptModal({
      title: "Name This Link",
      label: "Link Name",
      value: new URL(url).hostname,
      confirmLabel: "Save Link",
    });
    const id   = "lnk_" + Date.now();
    await dbSet(`classes/${classId}/links/${id}`, { url: url.trim(), name: name?.trim() || url });
    const updated = { ...(classData?.links||{}), [id]: { url: url.trim(), name: name?.trim() || url } };
    renderLinksList(updated);
    toast("Link saved!", "success");
  });

  wrap.querySelector("#open-all-btn").addEventListener("click", () => {
    const links2 = classData?.links ? Object.values(classData.links) : [];
    if (!links2.length) { toast("No links to open.", "info"); return; }
    links2.forEach(l => window.open(l.url, "_blank"));
  });

  renderLinksList(classData?.links);
  return wrap;
}
