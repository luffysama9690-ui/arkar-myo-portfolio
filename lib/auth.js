const crypto = require("crypto");

const SESSION_COOKIE = "session";
const MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

function sign(payloadObj) {
  const secret = process.env.SESSION_SECRET || "dev-secret-change-me";
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function verify(token) {
  if (!token) return null;
  const secret = process.env.SESSION_SECRET || "dev-secret-change-me";
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (expected !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64").toString());
    if (data.exp && data.exp < Date.now()) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function getCookie(req, name) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setSessionCookie(res, value) {
  const maxAgeSec = Math.floor(MAX_AGE / 1000);
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
  );
}

function isAuthed(req) {
  const token = getCookie(req, SESSION_COOKIE);
  const data = verify(token);
  return !!(data && data.role === "admin");
}

module.exports = {
  sign,
  verify,
  getCookie,
  setSessionCookie,
  clearSessionCookie,
  isAuthed,
  SESSION_COOKIE,
  MAX_AGE,
};
