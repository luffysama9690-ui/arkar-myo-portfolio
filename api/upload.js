const { put, list } = require("@vercel/blob");
const { isAuthed } = require("../lib/auth");

const LIST_PATH = "data/projects.json";
const VALID_CATEGORIES = ["logo", "social", "menu", "banner", "brochure", "packaging"];
const VALID_RATIOS = ["16:9", "4:5", "3:4", "1:1", "9:16"];

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

  try {
    const { imageBase64, filename, title, meta, category, ratio } = req.body || {};

    if (!imageBase64 || !title || !category || !ratio) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Invalid category." });
    }
    if (!VALID_RATIOS.includes(ratio)) {
      return res.status(400).json({ error: "Invalid ratio." });
    }

    const base64Data = String(imageBase64).split(",").pop();
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(400).json({ error: "Image too large (max 8MB)." });
    }

    const extMatch = String(filename || "").match(/\.(\w+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
    const contentType =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const key = `projects/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const blob = await put(key, buffer, { access: "public", contentType });

    const uploaded = await getUploaded();
    const newProject = {
      id: `up-${Date.now()}`,
      title: String(title).slice(0, 120),
      meta: String(meta || "").slice(0, 200),
      category,
      ratio,
      image: blob.url,
      tagNum: "",
    };
    uploaded.push(newProject);

    await put(LIST_PATH, JSON.stringify(uploaded), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });

    res.status(200).json({ ok: true, project: newProject });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Upload failed: " + e.message });
  }
};
