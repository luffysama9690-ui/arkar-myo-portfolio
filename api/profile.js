const { list } = require("@vercel/blob");

const PROFILE_PATH = "profile/photo.jpg";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const { blobs } = await list({ prefix: PROFILE_PATH });
    const match = blobs.find((b) => b.pathname === PROFILE_PATH);
    if (!match) return res.status(200).json({ url: null });
    const version = match.uploadedAt ? new Date(match.uploadedAt).getTime() : Date.now();
    res.status(200).json({ url: match.url, version });
  } catch (e) {
    res.status(200).json({ url: null });
  }
};
