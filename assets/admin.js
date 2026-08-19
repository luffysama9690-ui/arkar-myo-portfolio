const loginCard = document.getElementById("loginCard");
const panelCard = document.getElementById("panelCard");
const loginMsg = document.getElementById("loginMsg");
const uploadMsg = document.getElementById("uploadMsg");

let selectedFile = null;
let selectedBase64 = null;

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

// --- dropzone / file handling ---
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");

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
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

function handleFile(file) {
  if (!file.type.startsWith("image/")) return;
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    selectedBase64 = e.target.result;
    dropzone.classList.add("has-image");
    dropzone.innerHTML = `<img src="${selectedBase64}" alt="preview">`;
  };
  reader.readAsDataURL(file);
}

// --- upload ---
document.getElementById("uploadBtn").addEventListener("click", async () => {
  hideMsg(uploadMsg);
  const title = document.getElementById("title").value.trim();
  const meta = document.getElementById("meta").value.trim();
  const category = document.getElementById("category").value;
  const ratio = document.getElementById("ratio").value;

  if (!selectedBase64) return showMsg(uploadMsg, "Please choose an image first.", "err");
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
        imageBase64: selectedBase64,
        filename: selectedFile ? selectedFile.name : "upload.jpg",
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
  selectedFile = null;
  selectedBase64 = null;
  fileInput.value = "";
  dropzone.classList.remove("has-image");
  dropzone.innerHTML =
    '<span id="dropzoneLabel">Click to choose an image, or drag &amp; drop</span>';
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
          <span>${escapeHtml(p.category)} · ${escapeHtml(p.ratio)}</span>
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
