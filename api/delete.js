const { del } = require("@vercel/blob");
const { isAuthed } = require("../lib/auth");
const { getOverrides, saveOverrides, isSeedId } = require("../lib/projects-store");

async function safeDelete(url) {
  if (url && url.startsWith("http")) {
    try {
      await del(url);
    } catch (e) {
      /* ignore */
    }
  }
}

async function cleanupBlobs(target) {
  if (!target) return;
  await safeDelete(target.image);
  const gallery = target.images && target.images.length ? target.images : [];
  for (const url of gallery) {
    await safeDelete(url);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAuthed(req)) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: "Missing id" });

  const overrides = await getOverrides();
  const target = overrides.find((p) => p.id === id);
  const remaining = overrides.filter((p) => p.id !== id);

  if (isSeedId(id)) {
    // "Delete" on a seed project just reverts any edits back to the original.
    // Only clean up blob images that were part of the override (not the static seed assets).
    await cleanupBlobs(target);
    await saveOverrides(remaining);
    return res.status(200).json({ ok: true, reverted: true });
  }

  // Full delete for genuinely-uploaded projects.
  await cleanupBlobs(target);
  await saveOverrides(remaining);
  res.status(200).json({ ok: true });
};
