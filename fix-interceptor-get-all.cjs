const fs = require('fs');
const file = 'src/lib/apiInterceptor.ts';
let content = fs.readFileSync(file, 'utf8');

const getInvStart = content.indexOf('if (url === "/api/inventories" && method === "GET") {');
const getInvEnd = content.indexOf('if (url === "/api/inventories" && method === "POST") {');

const newGetInv = `if (url === "/api/inventories" && method === "GET") {
        const snap = await getDocs(collection(db, "inventories"));
        const inventories = [];
        
        for (const d of snap.docs) {
          const inv = d.data() as Inventory;
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
        
        return createResponse(inventories);
      }
      `;

if (getInvStart !== -1 && getInvEnd !== -1) {
  content = content.slice(0, getInvStart) + newGetInv + content.slice(getInvEnd);
}

fs.writeFileSync(file, content);
