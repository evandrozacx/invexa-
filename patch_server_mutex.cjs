const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Define the Mutex
const mutexCode = `
// --- MUTEX FOR CONCURRENCY CONTROL ---
class Mutex {
  constructor() {
    this.queue = [];
    this.locked = false;
  }
  lock() {
    return new Promise(resolve => {
      if (this.locked) {
        this.queue.push(resolve);
      } else {
        this.locked = true;
        resolve();
      }
    });
  }
  unlock() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    } else {
      this.locked = false;
    }
  }
}
const inventoryMutexes = new Map();
function getInventoryMutex(id) {
  if (!inventoryMutexes.has(id)) {
    inventoryMutexes.set(id, new Mutex());
  }
  return inventoryMutexes.get(id);
}
`;

// Insert mutex code after the imports
if (!code.includes('class Mutex')) {
  code = code.replace('const app = express();', mutexCode + '\nconst app = express();');
}

// 2. Wrap /api/collect logic in the Mutex
const collectStart = 'app.post("/api/collect", async (req, res) => {';
const newCollectStart = `app.post("/api/collect", async (req, res) => {
  const { inventoryId } = req.body;
  if (!inventoryId) return res.status(400).json({ error: "inventoryId is required" });
  
  const mutex = getInventoryMutex(inventoryId);
  await mutex.lock();
  try {`;

// Replace the start
code = code.replace(
  'app.post("/api/collect", async (req, res) => {\n  try {\n    const { inventoryId,',
  newCollectStart + '\n    const {'
);

// We need to add the finally block to release the mutex
// Find the end of /api/collect
// It currently ends like this:
/*
    return res.json({ success: true, count: formattedItems.length, message: "Transmissão registrada com sucesso." });
  } catch (err: any) {
    console.error("Erro no POST /api/collect:", err);
    return res.status(500).json({ error: err.message || "Erro interno ao processar transmissão." });
  }
});
*/

const collectEndRegex = /    return res\.status\(500\)\.json\(\{ error: err\.message \|\| "Erro interno ao processar transmissão\." \}\);\n  \}\n\}\);/g;

code = code.replace(collectEndRegex, `    return res.status(500).json({ error: err.message || "Erro interno ao processar transmissão." });
  } finally {
    mutex.unlock();
  }
});`);


// Do the same for /api/inventories/:id/manage-section just in case
const manageSectionRegex = /app\.post\("\/api\/inventories\/:id\/manage-section", async \(req, res\) => \{\n  const inventoryId = req\.params\.id;\n  try \{/g;
const manageSectionReplace = `app.post("/api/inventories/:id/manage-section", async (req, res) => {
  const inventoryId = req.params.id;
  const mutex = getInventoryMutex(inventoryId);
  await mutex.lock();
  try {`;
code = code.replace(manageSectionRegex, manageSectionReplace);

const manageSectionEndRegex = /    return res\.status\(500\)\.json\(\{ error: "Erro interno" \}\);\n  \}\n\}\);/g;
const manageSectionEndReplace = `    return res.status(500).json({ error: "Erro interno" });
  } finally {
    mutex.unlock();
  }
});`;
code = code.replace(manageSectionEndRegex, manageSectionEndReplace);


// Do the same for /api/inventories/:id/shadow-audit
const shadowAuditRegex = /app\.post\("\/api\/inventories\/:id\/shadow-audit", async \(req, res\) => \{\n  const inventoryId = req\.params\.id;\n  try \{/g;
const shadowAuditReplace = `app.post("/api/inventories/:id/shadow-audit", async (req, res) => {
  const inventoryId = req.params.id;
  const mutex = getInventoryMutex(inventoryId);
  await mutex.lock();
  try {`;
code = code.replace(shadowAuditRegex, shadowAuditReplace);

const shadowAuditEndRegex = /    return res\.status\(500\)\.json\(\{ error: "Erro interno ao auditar" \}\);\n  \}\n\}\);/g;
const shadowAuditEndReplace = `    return res.status(500).json({ error: "Erro interno ao auditar" });
  } finally {
    mutex.unlock();
  }
});`;
code = code.replace(shadowAuditEndRegex, shadowAuditEndReplace);


fs.writeFileSync('server.ts', code);
