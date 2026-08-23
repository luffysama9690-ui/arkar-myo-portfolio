const { del, put, list } = require("@vercel/blob");
const { isAuthed } = require("../lib/auth");

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
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAuthed(req)) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "Missing id" });
  if (String(id).startsWith("seed-")) {
    return res.status(400).json({ error: "Cannot delete seed projects." });
  }

  const uploaded = await getUploaded();
  const target = uploaded.find((p) => p.id === id);
  const remaining = uploaded.filter((p) => p.id !== id);

  if (target) {
    const urls = target.images && target.images.length ? target.images : [target.image];
    for (const url of urls) {
      if (!url) continue;
      try {
        await del(url);
      } catch (e) {
        /* ignore blob delete errors */
      }
    }
  }

  await put(LIST_PATH, JSON.stringify(remaining), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });

  res.status(200).json({ ok: true });
};
