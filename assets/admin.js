const loginCard = document.getElementById("loginCard");
const panelCard = document.getElementById("panelCard");
const loginMsg = document.getElementById("loginMsg");
const uploadMsg = document.getElementById("uploadMsg");

const CATEGORY_LABELS = {
  logo: "Logo Design",
  social: "Social Media",
  menu: "Menu Design",
  banner: "Banner & Stand",
  brochure: "Brochure",
  packaging: "Packaging",
};

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = "admin-msg show " + type;
}
function hideMsg(el) {
  el.className = "admin-msg";
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function checkSession() {
  try {
    const res = await fetch("/api/session");
    const data = await res.json();
    if (data.authenticated) {
      loginCard.style.display = "none";
      panelCard.style.display = "block";
      loadAllProjects();
      loadCurrentProfilePhoto();
    }
  } catch (e) {
    /* not logged in */
  }
}

document.getElementById("loginBtn").addEventListener("click", async () => {
  const pw = document.getElementById("pw").value;
  if (!pw) return;
  hideMsg(loginMsg);
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      loginCard.style.display = "none";
      panelCard.style.display = "block";
      loadAllProjects();
      loadCurrentProfilePhoto();
    } else {
      showMsg(loginMsg, data.error || "Incorrect password.", "err");
    }
  } catch (e) {
    showMsg(loginMsg, "Could not reach server. Is this deployed on Vercel?", "err");
  }
});

document.getElementById("pw").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("loginBtn").click();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  location.reload();
});

// --- profile photo ---
const profileFileInput = document.getElementById("profileFileInput");
const profileChangeBtn = document.getElementById("profileChangeBtn");
const profilePreviewImg = document.getElementById("profilePreviewImg");
const profileHint = document.getElementById("profileHint");

profileChangeBtn.addEventListener("click", () => profileFileInput.click());

profileFileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith("image/")) return;

  const reader = new FileReader();
  reader.onload = async (ev) => {
    const base64 = ev.target.result;
    profilePreviewImg.src = base64;
    profileHint.textContent = "Uploading...";
    try {
      const res = await fetch("/api/upload-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        profileHint.textContent = "Profile photo updated — now live on the site.";
        profilePreviewImg.src = data.url + "?v=" + Date.now();
      } else {
        profileHint.textContent = data.error || "Failed to update photo.";
      }
    } catch (err) {
      profileHint.textContent = "Failed to update photo.";
    }
  };
  reader.readAsDataURL(file);
  profileFileInput.value = "";
});

async function loadCurrentProfilePhoto() {
  try {
    const res = await fetch("/api/profile");
    const data = await res.json();
    if (data.url) profilePreviewImg.src = data.url + "?v=" + (data.version || Date.now());
  } catch (e) {
    /* keep default */
  }
}

// --- unified photo state: {type:'existing', url} | {type:'new', file, base64} ---
let selectedImages = [];
let currentEditId = null;
let allProjectsCache = [];

// --- dropzone / file handling ---
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const thumbGrid = document.getElementById("thumbGrid");

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.style.borderColor = "var(--violet)";
});
dropzone.addEventListener("dragleave", () => {
  dropzone.style.borderColor = "";
});
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.style.borderColor = "";
  if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length) handleFiles(e.target.files);
  fileInput.value = "";
});

function handleFiles(fileList) {
  Array.from(fileList).forEach((file) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      selectedImages.push({ type: "new", file, base64: e.target.result });
      renderThumbGrid();
    };
    reader.readAsDataURL(file);
  });
}

function renderThumbGrid() {
  thumbGrid.innerHTML = selectedImages
    .map((img, i) => {
      const src = img.type === "existing" ? img.url : img.base64;
      const cls = img.type === "existing" ? "thumb-item is-existing" : "thumb-item";
      return `
    <div class="${cls}">
      <img src="${src}" alt="">
      <span class="thumb-num">${i + 1}</span>
      <button type="button" class="thumb-remove" data-i="${i}" aria-label="Remove">✕</button>
    </div>`;
    })
    .join("");

  thumbGrid.querySelectorAll(".thumb-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedImages.splice(parseInt(btn.dataset.i, 10), 1);
      renderThumbGrid();
    });
  });

  const hint = document.getElementById("uploadHint");
  if (selectedImages.length > 1) {
    hint.textContent = `${selectedImages.length} photos — first photo is the cover thumbnail.`;
  } else {
    hint.textContent = "";
  }
}

// --- edit mode helpers ---
function enterEditMode(project) {
  currentEditId = project.id;
  document.getElementById("formTitle").textContent = "Editing: " + project.title;
  document.getElementById("cancelEditBtn").style.display = "inline-flex";
  document.getElementById("uploadBtnText").textContent = "Save Changes";
  document.getElementById("photosLabel").textContent = "Project Photos (remove old, add new)";

  const imgs = project.images && project.images.length ? project.images : [project.image];
  selectedImages = imgs.map((url) => ({ type: "existing", url }));
  renderThumbGrid();

  document.getElementById("title").value = project.title || "";
  document.getElementById("meta").value = project.meta || "";
  document.getElementById("category").value = project.category || "logo";
  document.getElementById("ratio").value = project.ratio || "16:9";

  hideMsg(uploadMsg);
  document.getElementById("panelCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

function exitEditMode() {
  currentEditId = null;
  selectedImages = [];
  document.getElementById("formTitle").textContent = "New Project";
  document.getElementById("cancelEditBtn").style.display = "none";
  document.getElementById("uploadBtnText").textContent = "Upload Project";
  document.getElementById("photosLabel").textContent = "Project Photos";
  renderThumbGrid();
  document.getElementById("title").value = "";
  document.getElementById("meta").value = "";
  hideMsg(uploadMsg);
}

document.getElementById("cancelEditBtn").addEventListener("click", exitEditMode);

// --- submit (create or save changes) ---
document.getElementById("uploadBtn").addEventListener("click", async () => {
  hideMsg(uploadMsg);
  const title = document.getElementById("title").value.trim();
  const meta = document.getElementById("meta").value.trim();
  const category = document.getElementById("category").value;
  const ratio = document.getElementById("ratio").value;

  if (selectedImages.length === 0)
    return showMsg(uploadMsg, "Please choose at least one image.", "err");
  if (!title) return showMsg(uploadMsg, "Please enter a project title.", "err");

  const btn = document.getElementById("uploadBtn");
  const btnText = document.getElementById("uploadBtnText");
  btn.disabled = true;
  const originalLabel = currentEditId ? "Save Changes" : "Upload Project";
  btnText.innerHTML = '<span class="spin-loader"></span> Saving...';

  const newImages = selectedImages
    .filter((i) => i.type === "new")
    .map((i) => ({ imageBase64: i.base64, filename: i.file.name }));

  try {
    let res, data;
    if (currentEditId) {
      const keepImages = selectedImages.filter((i) => i.type === "existing").map((i) => i.url);
      res = await fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentEditId, title, meta, category, ratio, keepImages, newImages }),
      });
    } else {
      res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: newImages, title, meta, category, ratio }),
      });
    }
    data = await res.json();
    if (res.ok && data.ok) {
      showMsg(uploadMsg, currentEditId ? "Changes saved." : "Project uploaded successfully.", "ok");
      exitEditMode();
      loadAllProjects();
    } else {
      showMsg(uploadMsg, data.error || "Something went wrong.", "err");
    }
  } catch (e) {
    showMsg(uploadMsg, "Request failed. Check your connection.", "err");
  } finally {
    btn.disabled = false;
    btnText.textContent = originalLabel;
  }
});

// --- browse all projects ---
const browserFilter = document.getElementById("browserFilter");
browserFilter.addEventListener("change", renderBrowseList);

async function loadAllProjects() {
  const container = document.getElementById("uploadedItems");
  try {
    const res = await fetch("/api/projects");
    const data = await res.json();
    allProjectsCache = data.projects || data;
    renderBrowseList();
  } catch (e) {
    container.innerHTML = '<p style="color:var(--ink-faint); font-size:13.5px;">Could not load projects.</p>';
  }
}

function renderBrowseList() {
  const container = document.getElementById("uploadedItems");
  const filter = browserFilter.value;
  const list = filter === "all" ? allProjectsCache : allProjectsCache.filter((p) => p.category === filter);

  if (list.length === 0) {
    container.innerHTML = '<p style="color:var(--ink-faint); font-size:13.5px;">No projects in this category.</p>';
    return;
  }

  container.innerHTML = list
    .map((p) => {
      const isSeed = String(p.id).startsWith("seed-");
      const photoCount = (p.images && p.images.length) || 1;
      return `
    <div class="browse-item">
      <img src="${p.image}" alt="">
      <div class="info">
        <b>${escapeHtml(p.title)}</b>
        <span>${CATEGORY_LABELS[p.category] || p.category} · ${photoCount} photo${photoCount > 1 ? "s" : ""}${isSeed ? " · original" : ""}</span>
      </div>
      <div class="browse-actions">
        <button class="edit-btn" data-id="${p.id}">Edit</button>
        <button class="del-btn" data-id="${p.id}" data-seed="${isSeed}">${isSeed ? "Revert" : "Delete"}</button>
      </div>
    </div>`;
    })
    .join("");

  container.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const project = allProjectsCache.find((p) => p.id === btn.dataset.id);
      if (project) enterEditMode(project);
    });
  });

  container.querySelectorAll(".del-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const isSeed = btn.dataset.seed === "true";
      const confirmMsg = isSeed
        ? "Revert this project back to its original photos and details?"
        : "Delete this project permanently?";
      if (!confirm(confirmMsg)) return;
      btn.textContent = "...";
      try {
        const res = await fetch("/api/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: btn.dataset.id }),
        });
        if (res.ok) {
          if (currentEditId === btn.dataset.id) exitEditMode();
          loadAllProjects();
        }
      } catch (e) {
        btn.textContent = isSeed ? "Revert" : "Delete";
      }
    });
  });
}

checkSession();
