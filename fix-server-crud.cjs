const fs = require('fs');

const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

// I will just replace the REST API implementations that use getLocalDb with Firestore code.

const apiDbReplace = `app.get("/api/db", async (req, res) => {
  try {
    const compSnap = await getDocs(collection(db, "companies"));
    const opSnap = await getDocs(collection(db, "operators"));
    const devSnap = await getDocs(collection(db, "devices"));
    const invSnap = await getDocs(collection(db, "inventories"));

    res.json({
      usingFallback: !useMysql,
      companies: compSnap.docs.map(d => d.data()),
      operators: opSnap.docs.map(d => d.data()),
      devices: devSnap.docs.map(d => d.data()),
      inventories: invSnap.docs.map(d => d.data())
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});`;

// Replace api/db
const startDb = content.indexOf('app.get("/api/db"');
const endDb = content.indexOf('app.post("/api/reset"');
if (startDb !== -1 && endDb !== -1) {
  content = content.slice(0, startDb) + apiDbReplace + '\n\n' + content.slice(endDb);
}

const apiCompReplace = `app.post("/api/companies", async (req, res) => {
  try {
    const comp = req.body;
    if (!comp.id) comp.id = "comp_" + Date.now();
    await setDoc(doc(db, "companies", comp.id), comp);
    res.json({ success: true, company: comp });
  } catch(err) { res.status(500).json({ error: err.message }); }
});`;
const startComp = content.indexOf('app.post("/api/companies"');
const endComp = content.indexOf('app.post("/api/operators"');
if (startComp !== -1 && endComp !== -1) {
  content = content.slice(0, startComp) + apiCompReplace + '\n\n' + content.slice(endComp);
}

const apiOpReplace = `app.post("/api/operators", async (req, res) => {
  try {
    const op = req.body;
    if (!op.id) op.id = "op_" + Date.now();
    await setDoc(doc(db, "operators", op.id), op);
    res.json({ success: true, operator: op });
  } catch(err) { res.status(500).json({ error: err.message }); }
});`;
const startOp = content.indexOf('app.post("/api/operators"');
const endOp = content.indexOf('app.post("/api/devices"');
if (startOp !== -1 && endOp !== -1) {
  content = content.slice(0, startOp) + apiOpReplace + '\n\n' + content.slice(endOp);
}

const apiDevReplace = `app.post("/api/devices", async (req, res) => {
  try {
    const dev = req.body;
    if (!dev.id) dev.id = "dev_" + Date.now();
    await setDoc(doc(db, "devices", dev.id), dev);
    res.json({ success: true, device: dev });
  } catch(err) { res.status(500).json({ error: err.message }); }
});`;
const startDev = content.indexOf('app.post("/api/devices"');
const endDev = content.indexOf('app.get("/api/inventories"');
if (startDev !== -1 && endDev !== -1) {
  content = content.slice(0, startDev) + apiDevReplace + '\n\n' + content.slice(endDev);
}

const apiInvGetReplace = `app.get("/api/inventories", async (req, res) => {
  try {
    const invSnap = await getDocs(collection(db, "inventories"));
    res.json(invSnap.docs.map(d => d.data()));
  } catch(err) { res.status(500).json({ error: err.message }); }
});`;
const startInvGet = content.indexOf('app.get("/api/inventories"');
const endInvGet = content.indexOf('app.get("/api/inventories/:id"');
if (startInvGet !== -1 && endInvGet !== -1) {
  content = content.slice(0, startInvGet) + apiInvGetReplace + '\n\n' + content.slice(endInvGet);
}

const apiInvGetIdReplace = `app.get("/api/inventories/:id", async (req, res) => {
  try {
    const inv = await getInventory(req.params.id);
    if (!inv) return res.status(404).json({ error: "Not found" });
    res.json(inv);
  } catch(err) { res.status(500).json({ error: err.message }); }
});`;
const startInvGetId = content.indexOf('app.get("/api/inventories/:id"');
const endInvGetId = content.indexOf('app.delete("/api/inventories/:id"');
if (startInvGetId !== -1 && endInvGetId !== -1) {
  content = content.slice(0, startInvGetId) + apiInvGetIdReplace + '\n\n' + content.slice(endInvGetId);
}

const apiInvDelReplace = `app.delete("/api/inventories/:id", async (req, res) => {
  try {
    await deleteDoc(doc(db, "inventories", req.params.id));
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});`;
const startInvDel = content.indexOf('app.delete("/api/inventories/:id"');
const endInvDel = content.indexOf('app.post("/api/inventories"');
if (startInvDel !== -1 && endInvDel !== -1) {
  content = content.slice(0, startInvDel) + apiInvDelReplace + '\n\n' + content.slice(endInvDel);
}

const apiInvPostReplace = `app.post("/api/inventories", async (req, res) => {
  try {
    const inv = req.body;
    if (!inv.id) inv.id = "inv_" + Date.now();
    const existingSnap = await getDoc(doc(db, "inventories", inv.id));
    if (existingSnap.exists()) {
      const existing = existingSnap.data();
      const merged = {
        ...existing,
        ...inv,
        sectors: inv.sectors || existing.sectors || [],
        products: inv.products || existing.products || [],
        addresses: inv.addresses || existing.addresses || [],
        dataEdicao: new Date().toISOString()
      };
      await setDoc(doc(db, "inventories", merged.id), merged);
      res.json({ success: true, inventory: merged });
    } else {
      inv.sectors = inv.sectors || [];
      inv.products = inv.products || [];
      inv.addresses = inv.addresses || [];
      inv.dataEdicao = new Date().toISOString();
      await setDoc(doc(db, "inventories", inv.id), inv);
      res.json({ success: true, inventory: inv });
    }
  } catch(err) { res.status(500).json({ error: err.message }); }
});`;
const startInvPost = content.indexOf('app.post("/api/inventories"');
const endInvPost = content.indexOf('app.post("/api/inventories/:id/upload-products"');
if (startInvPost !== -1 && endInvPost !== -1) {
  content = content.slice(0, startInvPost) + apiInvPostReplace + '\n\n' + content.slice(endInvPost);
}

fs.writeFileSync(file, content);
