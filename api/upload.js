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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAuthed(req)) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { images, title, meta, category, ratio } = req.body || {};

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Please provide at least one image." });
    }
    if (images.length > MAX_IMAGES) {
      return res.status(400).json({ error: `Too many images (max ${MAX_IMAGES}).` });
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

    const uploadedUrls = [];
    for (const img of images) {
      const base64Data = String(img.imageBase64 || "").split(",").pop();
      const buffer = Buffer.from(base64Data, "base64");
      if (buffer.length === 0) continue;
      if (buffer.length > 8 * 1024 * 1024) {
        return res.status(400).json({ error: "One of the images exceeds 8MB." });
      }
      const { ext, contentType } = extAndType(img.filename);
      const key = `projects/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const blob = await put(key, buffer, { access: "public", contentType });
      uploadedUrls.push(blob.url);
    }

    if (uploadedUrls.length === 0) {
      return res.status(400).json({ error: "No valid images were uploaded." });
    }

    const overrides = await getOverrides();
    const newProject = {
      id: `up-${Date.now()}`,
      title: String(title).slice(0, 120),
      meta: String(meta || "").slice(0, 200),
      category,
      ratio,
      image: uploadedUrls[0],
      images: uploadedUrls,
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
