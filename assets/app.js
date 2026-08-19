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

function renderGrid() {
  const grid = document.getElementById("projectGrid");
  const list =
    activeFilter === "all"
      ? allProjects
      : allProjects.filter((p) => p.category === activeFilter);

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state">No projects in this category yet.</div>`;
    return;
  }

  grid.innerHTML = list
    .map(
      (p) => `
    <div class="project">
      <div class="project-media ${ratioClass(p.ratio)}">
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
}

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

document.addEventListener("DOMContentLoaded", loadProjects);
