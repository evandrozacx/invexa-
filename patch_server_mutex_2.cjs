const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// manage-section
const manageSectionRegex = /app\.post\("\/api\/inventories\/:id\/manage-section", async \(req, res\) => \{\n  try \{\n    const \{ id \} = req\.params;/g;
const manageSectionReplace = `app.post("/api/inventories/:id/manage-section", async (req, res) => {
  const { id } = req.params;
  const mutex = getInventoryMutex(id);
  await mutex.lock();
  try {`;
code = code.replace(manageSectionRegex, manageSectionReplace);

// find the end of manage-section
const manageSectionEndRegex = /    return res\.status\(500\)\.json\(\{ error: err\.message \|\| "Erro interno" \}\);\n  \}\n\}\);/g;
const manageSectionEndReplace = `    return res.status(500).json({ error: err.message || "Erro interno" });
  } finally {
    mutex.unlock();
  }
});`;
code = code.replace(manageSectionEndRegex, manageSectionEndReplace);

// shadow-audit (it might not have been matched either)
// Let's check shadow audit signature first:
