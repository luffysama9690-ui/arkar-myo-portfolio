const { list, put } = require("@vercel/blob");
const seed = require("../data/projects.seed.json");

const LIST_PATH = "data/projects.json";

async function getOverrides() {
  try {
    const { blobs } = await list({ prefix: LIST_PATH });
    const match = blobs.find((b) => b.pathname === LIST_PATH);
    if (!match) return [];
    const r = await fetch(match.url, { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

async function saveOverrides(list_) {
  await put(LIST_PATH, JSON.stringify(list_), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

// Merge seed (stable order) with overrides/new uploads (stored in blob).
// An override entry with the same id as a seed entry replaces it in place.
// Entries with new ids are appended at the end, in the order they were added.
function mergeProjects(overrides) {
  const overrideMap = new Map(overrides.map((p) => [p.id, p]));
  const merged = seed.map((p) => overrideMap.get(p.id) || p);
  const newOnes = overrides.filter((p) => !seed.some((s) => s.id === p.id));
  return [...merged, ...newOnes];
}

function isSeedId(id) {
  return String(id).startsWith("seed-");
}

module.exports = { seed, getOverrides, saveOverrides, mergeProjects, isSeedId, LIST_PATH };
