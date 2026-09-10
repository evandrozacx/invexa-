const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

const getInventoryReplace = `async function getInventory(id: string) {
  try {
    const snap = await getDoc(doc(db, "inventories", id));
    if (!snap.exists()) return null;
    const inv = snap.data();
    if (!inv.products) inv.products = [];
    if (!inv.addresses) inv.addresses = [];
    
    // fetch chunks
    const prodSnap = await getDocs(collection(db, \`inventories/\${id}/productChunks\`));
    prodSnap.forEach(d => {
      inv.products = inv.products.concat(d.data().items || []);
    });
    
    const addrSnap = await getDocs(collection(db, \`inventories/\${id}/addressChunks\`));
    addrSnap.forEach(d => {
      inv.addresses = inv.addresses.concat(d.data().items || []);
    });
    
    return inv;
  } catch (err) {
    console.error("Firebase getInventory error:", err);
    return null;
  }
}

async function saveInventory(inv: any) {
  try {
    if (!inv.id) inv.id = "inv_" + Date.now();
    const docData = { ...inv };
    delete docData.products;
    delete docData.addresses;
    await setDoc(doc(db, "inventories", inv.id), docData);
  } catch (err) {
    console.error("Firebase saveInventory error:", err);
  }
}`;

const startGet = content.indexOf('async function getInventory(id: string) {');
const endGet = content.indexOf('function compareCollections(colA: ColetaItem[], colB: ColetaItem[]): boolean {');

if (startGet !== -1 && endGet !== -1) {
  content = content.slice(0, startGet) + getInventoryReplace + '\n\n' + content.slice(endGet);
}

fs.writeFileSync(file, content);
