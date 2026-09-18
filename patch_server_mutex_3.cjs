const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const shadowAuditRegex = /app\.post\("\/api\/inventories\/:id\/shadow-audit", async \(req, res\) => \{\n  try \{\n    const \{ id \} = req\.params;/g;
const shadowAuditReplace = `app.post("/api/inventories/:id/shadow-audit", async (req, res) => {
  const { id } = req.params;
  const mutex = getInventoryMutex(id);
  await mutex.lock();
  try {`;
code = code.replace(shadowAuditRegex, shadowAuditReplace);

const shadowAuditEndRegex = /    return res\.status\(500\)\.json\(\{ error: err\.message \|\| "Erro interno ao auditar" \}\);\n  \}\n\}\);/g;
const shadowAuditEndReplace = `    return res.status(500).json({ error: err.message || "Erro interno ao auditar" });
  } finally {
    mutex.unlock();
  }
});`;
code = code.replace(shadowAuditEndRegex, shadowAuditEndReplace);

fs.writeFileSync('server.ts', code);
