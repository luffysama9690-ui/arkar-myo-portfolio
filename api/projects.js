const { getOverrides, getOrder, mergeProjects, applyOrder } = require("../lib/projects-store");

module.exports = async function handler(req, res) {
  const [overrides, order] = await Promise.all([getOverrides(), getOrder()]);
  const merged = mergeProjects(overrides);
  const ordered = applyOrder(merged, order);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ projects: ordered });
};
