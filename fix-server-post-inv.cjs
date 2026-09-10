const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

const targetFunc = 'app.post("/api/inventories", async (req, res) => {';
const nextFunc = 'app.post("/api/inventories/:id/upload-products", async (req, res) => {';

const newFunc = `app.post("/api/inventories", async (req, res) => {
  try {
    const inv = req.body;
    if (!inv.id) inv.id = "inv_" + Date.now();
    const existingSnap = await getDoc(doc(db, "inventories", inv.id));
    let merged;
    if (existingSnap.exists()) {
      const existing = existingSnap.data();
      merged = {
        ...existing,
        ...inv,
        sectors: inv.sectors || existing.sectors || [],
        dataEdicao: new Date().toISOString()
      };
    } else {
      merged = {
        ...inv,
        sectors: inv.sectors || [],
        dataEdicao: new Date().toISOString()
      };
    }
    
    const docData = { ...merged };
    delete docData.products;
    delete docData.addresses;
    
    await setDoc(doc(db, "inventories", merged.id), docData);
    res.json({ success: true, inventory: merged });
  } catch(err:any) { res.status(500).json({ error: err.message }); }
});

`;

const startIdx = content.indexOf(targetFunc);
const endIdx = content.indexOf(nextFunc);

if (startIdx !== -1 && endIdx !== -1) {
  content = content.slice(0, startIdx) + newFunc + content.slice(endIdx);
}

fs.writeFileSync(file, content);
