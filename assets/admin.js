const loginCard = document.getElementById("loginCard");
const panelCard = document.getElementById("panelCard");
const loginMsg = document.getElementById("loginMsg");
const uploadMsg = document.getElementById("uploadMsg");

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
        profilePreviewImg.src = data.url;
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
    if (data.url) profilePreviewImg.src = data.url;
  } catch (e) {
    /* keep default */
  }
}

let selectedImages = []; // { file, base64 }

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = "admin-msg show " + type;
}
function hideMsg(el) {
  el.className = "admin-msg";
}

async function checkSession() {
  try {
    const res = await fetch("/api/session");
    const data = await res.json();
    if (data.authenticated) {
      loginCard.style.display = "none";
      panelCard.style.display = "block";
      loadUploadedList();
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
      loadUploadedList();
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

// --- dropzone / file handling (multi-image) ---
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
      selectedImages.push({ file, base64: e.target.result });
      renderThumbGrid();
    };
    reader.readAsDataURL(file);
  });
}

function renderThumbGrid() {
  thumbGrid.innerHTML = selectedImages
    .map(
      (img, i) => `
    <div class="thumb-item">
      <img src="${img.base64}" alt="">
      <span class="thumb-num">${i + 1}</span>
      <button type="button" class="thumb-remove" data-i="${i}" aria-label="Remove">✕</button>
    </div>`
    )
    .join("");

  thumbGrid.querySelectorAll(".thumb-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedImages.splice(parseInt(btn.dataset.i, 10), 1);
      renderThumbGrid();
    });
  });

  document.getElementById("uploadHint").textContent =
    selectedImages.length > 1
      ? `${selectedImages.length} photos selected — first photo is used as the cover thumbnail.`
      : "";
}

// --- upload ---
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
  btnText.innerHTML = '<span class="spin-loader"></span> Uploading...';

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images: selectedImages.map((img) => ({
          imageBase64: img.base64,
          filename: img.file.name,
        })),
        title,
        meta,
        category,
        ratio,
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      showMsg(uploadMsg, "Project uploaded successfully.", "ok");
      resetForm();
      loadUploadedList();
    } else {
      showMsg(uploadMsg, data.error || "Upload failed.", "err");
    }
  } catch (e) {
    showMsg(uploadMsg, "Upload failed. Check your connection.", "err");
  } finally {
    btn.disabled = false;
    btnText.textContent = "Upload Project";
  }
});

function resetForm() {
  selectedImages = [];
  renderThumbGrid();
  document.getElementById("title").value = "";
  document.getElementById("meta").value = "";
}

async function loadUploadedList() {
  const container = document.getElementById("uploadedItems");
  try {
    const res = await fetch("/api/projects");
    const data = await res.json();
    const list = (data.projects || data).filter((p) => !String(p.id).startsWith("seed-"));
    if (list.length === 0) {
      container.innerHTML = '<p style="color:var(--ink-faint); font-size:13.5px;">No uploads yet — new projects you add will appear here.</p>';
      return;
    }
    container.innerHTML = list
      .slice()
      .reverse()
      .map(
        (p) => `
      <div class="uploaded-item">
        <img src="${p.image}" alt="">
        <div class="info">
          <b>${escapeHtml(p.title)}</b>
          <span>${escapeHtml(p.category)} · ${escapeHtml(p.ratio)} · ${
          (p.images && p.images.length) || 1
        } photo${(p.images && p.images.length > 1) ? "s" : ""}</span>
        </div>
        <button class="del-btn" data-id="${p.id}">Delete</button>
      </div>`
      )
      .join("");

    container.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this project?")) return;
        btn.textContent = "...";
        try {
          const res = await fetch("/api/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: btn.dataset.id }),
          });
          if (res.ok) loadUploadedList();
        } catch (e) {
          btn.textContent = "Delete";
        }
      });
    });
  } catch (e) {
    container.innerHTML = '<p style="color:var(--ink-faint); font-size:13.5px;">Could not load uploads.</p>';
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

checkSession();
