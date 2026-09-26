const { isAuthed } = require("../lib/auth");
const {
  getOverrides,
  getOrder,
  saveOrder,
  mergeProjects,
  applyOrder,
} = require("../lib/projects-store");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAuthed(req)) return res.status(401).json({ error: "Unauthorized" });

  const { id, direction, order } = req.body || {};

  try {
    // Drag-and-drop path: caller supplies the full desired order in one shot.
    if (Array.isArray(order)) {
      if (order.length === 0) return res.status(400).json({ error: "Order list is empty." });
      // Defensive dedupe: never persist an order list with a repeated id
      // (this is what previously caused a project to render twice).
      const seenIds = new Set();
      const cleanOrder = order.filter((id) => {
        if (seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
      });
      await saveOrder(cleanOrder);
      return res.status(200).json({ ok: true, order: cleanOrder });
    }

    // Fine-tune path: nudge a single project up or down by one step.
    if (!id) return res.status(400).json({ error: "Missing id" });
    if (direction !== "up" && direction !== "down") {
      return res.status(400).json({ error: "direction must be 'up' or 'down'." });
    }

    const [overrides, savedOrder] = await Promise.all([getOverrides(), getOrder()]);
    const merged = mergeProjects(overrides);
    const currentOrder = applyOrder(merged, savedOrder).map((p) => p.id);

    const idx = currentOrder.indexOf(id);
    if (idx === -1) return res.status(404).json({ error: "Project not found." });

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= currentOrder.length) {
      // already at the top/bottom — nothing to do, not an error
      return res.status(200).json({ ok: true, order: currentOrder });
    }

    const newOrder = currentOrder.slice();
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];

    await saveOrder(newOrder);
    res.status(200).json({ ok: true, order: newOrder });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Reorder failed: " + e.message });
  }
};
