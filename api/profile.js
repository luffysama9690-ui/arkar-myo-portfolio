const { list } = require("@vercel/blob");

const PROFILE_PATH = "profile/photo.jpg";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const { blobs } = await list({ prefix: PROFILE_PATH });
    const match = blobs.find((b) => b.pathname === PROFILE_PATH);
    if (!match) return res.status(200).json({ url: null });
    res.status(200).json({ url: match.url });
  } catch (e) {
    res.status(200).json({ url: null });
  }
};
