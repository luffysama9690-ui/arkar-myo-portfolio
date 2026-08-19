const { list } = require("@vercel/blob");
const seed = require("../data/projects.seed.json");

const LIST_PATH = "data/projects.json";

async function getUploaded() {
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

module.exports = async function handler(req, res) {
  const uploaded = await getUploaded();
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ projects: [...seed, ...uploaded] });
};
