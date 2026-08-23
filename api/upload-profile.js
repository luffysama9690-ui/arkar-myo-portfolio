const { put } = require("@vercel/blob");
const { isAuthed } = require("../lib/auth");

const PROFILE_PATH = "profile/photo.jpg";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAuthed(req)) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: "No image provided." });

    const base64Data = String(imageBase64).split(",").pop();
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length === 0) return res.status(400).json({ error: "Invalid image." });
    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(400).json({ error: "Image too large (max 8MB)." });
    }
    const mimeMatch = String(imageBase64).match(/^data:(image\/\w+);base64,/);
    const contentType = mimeMatch ? mimeMatch[1] : "image/jpeg";

    const blob = await put(PROFILE_PATH, buffer, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });

    res.status(200).json({ ok: true, url: blob.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Upload failed: " + e.message });
  }
};
