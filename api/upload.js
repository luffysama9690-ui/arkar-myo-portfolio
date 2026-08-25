const { put } = require("@vercel/blob");
const { isAuthed } = require("../lib/auth");
const { getOverrides, saveOverrides } = require("../lib/projects-store");

const VALID_CATEGORIES = ["logo", "social", "menu", "banner", "brochure", "packaging"];
const VALID_RATIOS = ["16:9", "4:5", "3:4", "1:1", "9:16"];
const MAX_IMAGES = 12;

function extAndType(filename) {
  const extMatch = String(filename || "").match(/\.(\w+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
  const contentType =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { ext, contentType };
}

async function uploadOne(img) {
  const base64Data = String(img.imageBase64 || "").split(",").pop();
  const buffer = Buffer.from(base64Data, "base64");
  if (buffer.length === 0) return null;
  if (buffer.length > 8 * 1024 * 1024) {
    throw new Error("One of the images exceeds 8MB.");
  }
  const { ext, contentType } = extAndType(img.filename);
  const key = `projects/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const blob = await put(key, buffer, { access: "public", contentType });
  return blob.url;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAuthed(req)) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { cover, images, title, meta, category, ratio } = req.body || {};

    if (!cover || !cover.imageBase64) {
      return res.status(400).json({ error: "Please provide a cover photo." });
    }
    if (!title || !category || !ratio) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Invalid category." });
    }
    if (!VALID_RATIOS.includes(ratio)) {
      return res.status(400).json({ error: "Invalid ratio." });
    }
    const galleryInput = Array.isArray(images) ? images : [];
    if (galleryInput.length > MAX_IMAGES) {
      return res.status(400).json({ error: `Too many gallery images (max ${MAX_IMAGES}).` });
    }

    const coverUrl = await uploadOne(cover);
    if (!coverUrl) return res.status(400).json({ error: "Invalid cover photo." });

    const galleryUrls = [];
    for (const img of galleryInput) {
      const url = await uploadOne(img);
      if (url) galleryUrls.push(url);
    }

    const overrides = await getOverrides();
    const newProject = {
      id: `up-${Date.now()}`,
      title: String(title).slice(0, 120),
      meta: String(meta || "").slice(0, 200),
      category,
      ratio,
      image: coverUrl,
      images: galleryUrls,
      tagNum: "",
    };
    overrides.push(newProject);
    await saveOverrides(overrides);

    res.status(200).json({ ok: true, project: newProject });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Upload failed: " + e.message });
  }
};
