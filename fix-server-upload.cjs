const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

const uploadProductsStart = content.indexOf('app.post("/api/inventories/:id/upload-products", async (req, res) => {');
const uploadProductsEnd = content.indexOf('app.post("/api/inventories/:id/upload-addresses", async (req, res) => {');

const newUploadProducts = `app.post("/api/inventories/:id/upload-products", async (req, res) => {
  try {
    const { products } = req.body;
    const inv = await getInventory(req.params.id);
    if (!inv) return res.status(404).json({ error: "Inventory not found" });

    const cleaned: Product[] = [];
    const seenKeys = new Set<string>();

    for (const p of (products as Product[])) {
      const key = p.ean ? p.ean.trim() : p.sap ? p.sap.trim() : p.descricao ? p.descricao.trim() : "";
      if (!key) continue;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        cleaned.push({
          ean: p.ean || "",
          sap: p.sap || "",
          descricao: p.descricao || "PRODUTO SEM DESCRIÇÃO",
          estoque: p.estoque || 0,
          precoCusto: p.precoCusto || 0,
          departamento: p.departamento || "GERAL"
        });
      }
    }

    const CHUNK_SIZE = 2500;
    const colRef = collection(db, \`inventories/\${req.params.id}/productChunks\`);
    const oldSnap = await getDocs(colRef);
    for (const d of oldSnap.docs) {
      await deleteDoc(d.ref);
    }
    for (let i = 0; i < cleaned.length; i += CHUNK_SIZE) {
      const chunk = cleaned.slice(i, i + CHUNK_SIZE);
      await setDoc(doc(db, \`inventories/\${req.params.id}/productChunks\`, \`chunk_\${i}\`), { items: chunk });
    }

    inv.products = cleaned;
    inv.dataEdicao = new Date().toISOString();
    await saveInventory(inv);
    res.json({ success: true, count: cleaned.length });
  } catch(err:any) { res.status(500).json({ error: err.message }); }
});

`;

if (uploadProductsStart !== -1 && uploadProductsEnd !== -1) {
  content = content.slice(0, uploadProductsStart) + newUploadProducts + content.slice(uploadProductsEnd);
}

const uploadAddrStart = content.indexOf('app.post("/api/inventories/:id/upload-addresses", async (req, res) => {');
const uploadAddrEnd = content.indexOf('app.post("/api/collect", async (req, res) => {');

const newUploadAddr = `app.post("/api/inventories/:id/upload-addresses", async (req, res) => {
  try {
    const { addresses } = req.body;
    const inv = await getInventory(req.params.id);
    if (!inv) return res.status(404).json({ error: "Inventory not found" });

    const cleaned: Address[] = [];
    const seenKeys = new Set<string>();

    for (const a of (addresses as Address[])) {
      const key = a.address ? a.address.trim() : "";
      if (!key) continue;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        cleaned.push({
          address: a.address || "",
          type: a.type || "GERAL",
          status: "NAO_INICIADO"
        });
      }
    }

    const CHUNK_SIZE = 2500;
    const colRef = collection(db, \`inventories/\${req.params.id}/addressChunks\`);
    const oldSnap = await getDocs(colRef);
    for (const d of oldSnap.docs) {
      await deleteDoc(d.ref);
    }
    for (let i = 0; i < cleaned.length; i += CHUNK_SIZE) {
      const chunk = cleaned.slice(i, i + CHUNK_SIZE);
      await setDoc(doc(db, \`inventories/\${req.params.id}/addressChunks\`, \`chunk_\${i}\`), { items: chunk });
    }

    inv.addresses = cleaned;
    inv.dataEdicao = new Date().toISOString();
    await saveInventory(inv);
    res.json({ success: true, count: cleaned.length });
  } catch(err:any) { res.status(500).json({ error: err.message }); }
});

`;

if (uploadAddrStart !== -1 && uploadAddrEnd !== -1) {
  content = content.slice(0, uploadAddrStart) + newUploadAddr + content.slice(uploadAddrEnd);
}

fs.writeFileSync(file, content);
