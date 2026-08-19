const { clearSessionCookie } = require("../lib/auth");

module.exports = async function handler(req, res) {
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
};
