(function () {
  const gate = document.getElementById("gate");
  const app = document.getElementById("app");
  const codeInput = document.getElementById("codeInput");
  const gateBtn = document.getElementById("gateBtn");
  const gateErr = document.getElementById("gateErr");

  const list = document.getElementById("list");
  const emptyMsg = document.getElementById("emptyMsg");
  const lastRefreshed = document.getElementById("lastRefreshed");
  const filterStatus = document.getElementById("filterStatus");
  const filterCategory = document.getElementById("filterCategory");
  const filterSearch = document.getElementById("filterSearch");
  const overlay = document.getElementById("overlay");
  const panel = document.getElementById("panel");

  let accessCode = "";
  let items = [];

  function statusClass(s) {
    return "status-" + (s || "New").replace(/\s+/g, "-");
  }

  function fmtTime(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
    } catch (e) {
      return iso;
    }
  }

  async function loadFeedback() {
    const res = await fetch("/api/get-feedback", {
      headers: { "x-hr-access-code": accessCode },
    });
    if (res.status === 401) throw new Error("unauthorized");
    if (!res.ok) throw new Error("load-failed");
    const data = await res.json();
    items = data.items || [];
  }

  function renderStats() {
    document.getElementById("statTotal").textContent = items.length;
    document.getElementById("statNew").textContent = items.filter((i) => i.status === "New").length;
    document.getElementById("statReview").textContent = items.filter((i) => i.status === "In Review").length;
    document.getElementById("statResolved").textContent = items.filter((i) => i.status === "Resolved").length;
  }

  function applyFilters() {
    const status = filterStatus.value;
    const category = filterCategory.value;
    const search = filterSearch.value.trim().toLowerCase();

    return items.filter((i) => {
      if (status && i.status !== status) return false;
      if (category && i.category !== category) return false;
      if (search) {
        const hay = (i.message + " " + i.department + " " + i.submittedBy).toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }

  function renderList() {
    const filtered = applyFilters();
    list.innerHTML = "";
    emptyMsg.style.display = filtered.length ? "none" : "block";

    filtered.forEach((item) => {
      const el = document.createElement("div");
      el.className = "entry";
      el.innerHTML = `
        <div class="entry-head">
          <span class="who">${escapeHtml(item.submittedBy || "Anonymous")}</span>
          <span class="pill ${statusClass(item.status)}">${escapeHtml(item.status || "New")}</span>
        </div>
        <div class="tags">
          <span class="cat">${escapeHtml(item.category || "")}</span>
          ${item.department ? `<span class="dept">· ${escapeHtml(item.department)}</span>` : ""}
        </div>
        <div class="preview">${escapeHtml(item.message || "")}</div>
        <div class="entry-head" style="margin-top:8px; margin-bottom:0;">
          <span class="when">${fmtTime(item.timestamp)}</span>
        </div>
      `;
      el.addEventListener("click", () => openPanel(item));
      list.appendChild(el);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function openPanel(item) {
    panel.innerHTML = `
      <button class="close" id="closeBtn">✕</button>
      <h2>${escapeHtml(item.submittedBy || "Anonymous")}</h2>
      <div class="meta-line">${fmtTime(item.timestamp)} · ${escapeHtml(item.category || "")}${item.department ? " · " + escapeHtml(item.department) : ""} · ID ${escapeHtml(item.id.slice(0, 8))}</div>
      <div class="msg-block">${escapeHtml(item.message || "")}</div>
      <label for="statusSelect">Status</label>
      <select id="statusSelect">
        <option ${item.status === "New" ? "selected" : ""}>New</option>
        <option ${item.status === "In Review" ? "selected" : ""}>In Review</option>
        <option ${item.status === "Resolved" ? "selected" : ""}>Resolved</option>
      </select>
      <label for="notesInput">HR notes <span style="font-weight:400;color:var(--ink-soft);">(internal only)</span></label>
      <textarea id="notesInput" placeholder="Not visible to the employee">${escapeHtml(item.hrNotes || "")}</textarea>
      <button class="save" id="saveBtn">Save changes</button>
      <span class="save-msg" id="saveMsg"></span>
    `;
    overlay.classList.add("active");

    document.getElementById("closeBtn").addEventListener("click", closePanel);
    document.getElementById("saveBtn").addEventListener("click", () => saveChanges(item.id));
  }

  function closePanel() {
    overlay.classList.remove("active");
  }
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePanel();
  });

  async function saveChanges(id) {
    const saveBtn = document.getElementById("saveBtn");
    const saveMsg = document.getElementById("saveMsg");
    const status = document.getElementById("statusSelect").value;
    const hrNotes = document.getElementById("notesInput").value;

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    saveMsg.textContent = "";

    try {
      const res = await fetch("/api/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hr-access-code": accessCode,
        },
        body: JSON.stringify({ id, status, hrNotes }),
      });
      if (!res.ok) throw new Error(await res.text());

      const idx = items.findIndex((i) => i.id === id);
      if (idx !== -1) {
        items[idx].status = status;
        items[idx].hrNotes = hrNotes;
      }
      renderStats();
      renderList();
      saveMsg.textContent = "Saved.";
    } catch (err) {
      console.error(err);
      saveMsg.textContent = "Could not save — try again.";
      saveMsg.style.color = "var(--brick)";
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save changes";
    }
  }

  [filterStatus, filterCategory].forEach((el) => el.addEventListener("change", renderList));
  filterSearch.addEventListener("input", renderList);

  async function enter() {
    accessCode = codeInput.value.trim();
    if (!accessCode) return;
    gateBtn.disabled = true;
    gateBtn.textContent = "Checking…";
    gateErr.style.display = "none";
    try {
      await loadFeedback();
      gate.style.display = "none";
      app.style.display = "block";
      renderStats();
      renderList();
      lastRefreshed.textContent = "Updated " + new Date().toLocaleTimeString();
    } catch (err) {
      gateErr.style.display = "block";
    } finally {
      gateBtn.disabled = false;
      gateBtn.textContent = "Enter";
    }
  }

  gateBtn.addEventListener("click", enter);
  codeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") enter();
  });
})();
