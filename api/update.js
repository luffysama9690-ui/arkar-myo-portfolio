const { put, del } = require("@vercel/blob");
const { isAuthed } = require("../lib/auth");
const { seed, getOverrides, saveOverrides } = require("../lib/projects-store");

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

async function safeDelete(url) {
  if (url && url.startsWith("http")) {
    try {
      await del(url);
    } catch (e) {
      /* ignore */
    }
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAuthed(req)) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { id, title, meta, category, ratio, newCover, keepImages, newImages } = req.body || {};
    if (!id) return res.status(400).json({ error: "Missing project id." });

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Invalid category." });
    }
    if (ratio && !VALID_RATIOS.includes(ratio)) {
      return res.status(400).json({ error: "Invalid ratio." });
    }

    const overrides = await getOverrides();
    let existing = overrides.find((p) => p.id === id);
    if (!existing) {
      existing = seed.find((p) => p.id === id);
    }
    if (!existing) return res.status(404).json({ error: "Project not found." });

    // --- cover photo ---
    let finalCover = existing.image;
    if (newCover && newCover.imageBase64) {
      const newCoverUrl = await uploadOne(newCover);
      if (newCoverUrl) {
        await safeDelete(existing.image);
        finalCover = newCoverUrl;
      }
    }

    // --- gallery photos ---
    const baseGallery = existing.images && existing.images.length ? existing.images : [];
    const kept = Array.isArray(keepImages) ? keepImages : baseGallery;
    const removed = baseGallery.filter((url) => url && !kept.includes(url));
    for (const url of removed) {
      await safeDelete(url);
    }

    let addedUrls = [];
    if (Array.isArray(newImages) && newImages.length > 0) {
      if (kept.length + newImages.length > MAX_IMAGES) {
        return res.status(400).json({ error: `Too many gallery images (max ${MAX_IMAGES}).` });
      }
      for (const img of newImages) {
        const url = await uploadOne(img);
        if (url) addedUrls.push(url);
      }
    }
    const finalGallery = [...kept, ...addedUrls];

    const updated = {
      ...existing,
      title: title !== undefined && title !== "" ? String(title).slice(0, 120) : existing.title,
      meta: meta !== undefined ? String(meta).slice(0, 200) : existing.meta,
      category: category || existing.category,
      ratio: ratio || existing.ratio,
      image: finalCover,
      images: finalGallery,
    };

    const idx = overrides.findIndex((p) => p.id === id);
    if (idx >= 0) {
      overrides[idx] = updated;
    } else {
      overrides.push(updated);
    }
    await saveOverrides(overrides);

    res.status(200).json({ ok: true, project: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Update failed: " + e.message });
  }
};
