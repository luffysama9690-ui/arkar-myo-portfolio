const { getOverrides, mergeProjects } = require("../lib/projects-store");

module.exports = async function handler(req, res) {
  const overrides = await getOverrides();
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ projects: mergeProjects(overrides) });
};
