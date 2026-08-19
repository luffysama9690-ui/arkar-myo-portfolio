const { sign, setSessionCookie, MAX_AGE } = require("../lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { password } = req.body || {};
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ error: "Server not configured. Set ADMIN_PASSWORD in Vercel env vars." });
  }
  if (!password || password !== adminPassword) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  const token = sign({ role: "admin", exp: Date.now() + MAX_AGE });
  setSessionCookie(res, token);
  res.status(200).json({ ok: true });
};
