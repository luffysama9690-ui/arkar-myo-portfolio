const CATEGORIES = [
  { key: "all", label: "All Work" },
  { key: "logo", label: "Logo Design" },
  { key: "social", label: "Social Media" },
  { key: "menu", label: "Menu Design" },
  { key: "banner", label: "Banner & Stand" },
  { key: "brochure", label: "Brochure" },
  { key: "packaging", label: "Packaging" },
];

let allProjects = [];
let activeFilter = "all";

function ratioClass(ratio) {
  const map = {
    "16:9": "ratio-16-9",
    "1:1": "ratio-1-1",
    "4:5": "ratio-4-5",
    "3:4": "ratio-3-4",
    "9:16": "ratio-9-16",
  };
  return map[ratio] || "ratio-16-9";
}

function catLabel(key) {
  const found = CATEGORIES.find((c) => c.key === key);
  return found ? found.label : key;
}

function renderFilterBar() {
  const bar = document.getElementById("filterBar");
  bar.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const count =
      cat.key === "all"
        ? allProjects.length
        : allProjects.filter((p) => p.category === cat.key).length;
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (cat.key === activeFilter ? " active" : "");
    btn.innerHTML = `${cat.label}<span class="filter-count">${count}</span>`;
    btn.addEventListener("click", () => {
      activeFilter = cat.key;
      renderFilterBar();
      renderGrid();
    });
    bar.appendChild(btn);
  });
}

let currentList = [];

function renderGrid() {
  const grid = document.getElementById("projectGrid");
  const list =
    activeFilter === "all"
      ? allProjects
      : allProjects.filter((p) => p.category === activeFilter);

  currentList = list;

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state">No projects in this category yet.</div>`;
    return;
  }

  grid.innerHTML = list
    .map(
      (p, i) => `
    <div class="project">
      <div class="project-media ${ratioClass(p.ratio)}" data-index="${i}">
        <img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy">
      </div>
      <div class="project-info">
        <div>
          <h4>${escapeHtml(p.title)}</h4>
          <div class="meta">${escapeHtml(p.meta || "")}</div>
        </div>
        <span class="chip">${p.tagNum ? p.tagNum : catLabel(p.category)}</span>
      </div>
    </div>`
    )
    .join("");

  grid.querySelectorAll(".project-media").forEach((el) => {
    el.addEventListener("click", () => {
      openLightbox(parseInt(el.dataset.index, 10));
    });
  });
}

/* ---------- lightbox (per-project gallery) ---------- */
const lightbox = document.getElementById("lightbox");
const lbImage = document.getElementById("lbImage");
const lbTitle = document.getElementById("lbTitle");
const lbMeta = document.getElementById("lbMeta");
const lbCount = document.getElementById("lbCount");
const lbPrevBtn = document.getElementById("lbPrev");
const lbNextBtn = document.getElementById("lbNext");

let activeProject = null;
let activeImages = [];
let activeImgIndex = 0;

function openLightbox(index) {
  const project = currentList[index];
  if (!project) return;
  activeProject = project;
  activeImages =
    project.images && project.images.length ? project.images : [project.image];
  activeImgIndex = 0;
  updateLightbox();
  lightbox.classList.add("open");
}

function updateLightbox() {
  if (!activeProject) return;
  lbImage.src = activeImages[activeImgIndex];
  lbImage.alt = activeProject.title;
  lbTitle.textContent = activeProject.title;
  lbMeta.textContent = activeProject.meta || "";
  const multi = activeImages.length > 1;
  lbCount.textContent = multi
    ? `${activeImgIndex + 1} / ${activeImages.length}`
    : "";
  lbPrevBtn.style.display = multi ? "flex" : "none";
  lbNextBtn.style.display = multi ? "flex" : "none";
}

function closeLightbox() {
  lightbox.classList.remove("open");
}

function showNext() {
  activeImgIndex = (activeImgIndex + 1) % activeImages.length;
  updateLightbox();
}

function showPrev() {
  activeImgIndex = (activeImgIndex - 1 + activeImages.length) % activeImages.length;
  updateLightbox();
}

document.getElementById("lbClose").addEventListener("click", closeLightbox);
lbNextBtn.addEventListener("click", showNext);
lbPrevBtn.addEventListener("click", showPrev);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (!lightbox.classList.contains("open")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowRight") showNext();
  if (e.key === "ArrowLeft") showPrev();
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function loadProjects() {
  try {
    const res = await fetch("/api/projects", { cache: "no-store" });
    if (!res.ok) throw new Error("api unavailable");
    const data = await res.json();
    allProjects = data.projects || data;
  } catch (e) {
    // fallback for static hosting (e.g. GitHub Pages) without /api
    const res = await fetch("data/projects.seed.json");
    allProjects = await res.json();
  }
  renderFilterBar();
  renderGrid();
}

async function loadProfilePhoto() {
  try {
    const res = await fetch("/api/profile", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (data.url) {
      document.getElementById("heroPhoto").src = data.url;
    }
  } catch (e) {
    /* keep default bundled photo */
  }
}

document.addEventListener("DOMContentLoaded", loadProfilePhoto);
document.addEventListener("DOMContentLoaded", loadProjects);
