const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

const getInvStart = content.indexOf('app.get("/api/inventories", async (req, res) => {');
const getInvEnd = content.indexOf('app.get("/api/inventories/:id", async (req, res) => {');

const newGetInv = `app.get("/api/inventories", async (req, res) => {
  try {
    const invSnap = await getDocs(collection(db, "inventories"));
    const inventories = [];
    
    for (const d of invSnap.docs) {
      const inv = d.data();
      if (!inv.products) inv.products = [];
      if (!inv.addresses) inv.addresses = [];
      
      const prodSnap = await getDocs(collection(db, \`inventories/\${inv.id}/productChunks\`));
      prodSnap.forEach(chunkDoc => {
        inv.products = inv.products.concat(chunkDoc.data().items || []);
      });
      
      const addrSnap = await getDocs(collection(db, \`inventories/\${inv.id}/addressChunks\`));
      addrSnap.forEach(chunkDoc => {
        inv.addresses = inv.addresses.concat(chunkDoc.data().items || []);
      });
      
      inventories.push(inv);
    }
    
    res.json(inventories);
  } catch(err:any) { res.status(500).json({ error: err.message }); }
});

`;

if (getInvStart !== -1 && getInvEnd !== -1) {
  content = content.slice(0, getInvStart) + newGetInv + content.slice(getInvEnd);
}

// same for apiInterceptor.ts /api/inventories
fs.writeFileSync(file, content);
