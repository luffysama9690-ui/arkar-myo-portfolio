const { list, put } = require("@vercel/blob");
const seed = require("../data/projects.seed.json");

const LIST_PATH = "data/projects.json";
const ORDER_PATH = "data/order.json";

async function readJsonBlob(path, fallback) {
  try {
    const { blobs } = await list({ prefix: path });
    const match = blobs.find((b) => b.pathname === path);
    if (!match) return fallback;
    const r = await fetch(match.url, { cache: "no-store" });
    if (!r.ok) return fallback;
    const data = await r.json();
    return data;
  } catch (e) {
    return fallback;
  }
}

async function writeJsonBlob(path, data) {
  await put(path, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function getOverrides() {
  const data = await readJsonBlob(LIST_PATH, []);
  return Array.isArray(data) ? data : [];
}

async function saveOverrides(list_) {
  await writeJsonBlob(LIST_PATH, list_);
}

async function getOrder() {
  const data = await readJsonBlob(ORDER_PATH, []);
  return Array.isArray(data) ? data : [];
}

async function saveOrder(orderIds) {
  await writeJsonBlob(ORDER_PATH, orderIds);
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

// Apply a saved display order (array of ids) on top of a merged list.
// Any id in orderIds that no longer exists is dropped; any project not yet
// in orderIds (e.g. a brand-new upload) is appended at the end, in its
// natural (merge) order.
function applyOrder(mergedList, orderIds) {
  if (!orderIds || orderIds.length === 0) return mergedList;
  const byId = new Map(mergedList.map((p) => [p.id, p]));
  const ordered = orderIds.map((id) => byId.get(id)).filter(Boolean);
  const seen = new Set(ordered.map((p) => p.id));
  const rest = mergedList.filter((p) => !seen.has(p.id));
  return [...ordered, ...rest];
}

function isSeedId(id) {
  return String(id).startsWith("seed-");
}

module.exports = {
  seed,
  getOverrides,
  saveOverrides,
  getOrder,
  saveOrder,
  mergeProjects,
  applyOrder,
  isSeedId,
  LIST_PATH,
  ORDER_PATH,
};
