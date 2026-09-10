const fs = require('fs');
const file = 'src/lib/apiInterceptor.ts';
let content = fs.readFileSync(file, 'utf8');

const targetFunc = 'if (url === "/api/inventories" && method === "POST") {';
const nextFunc = 'if (url.match(/^\\/api\\/inventories\\/[^\\/]+\\/upload-products$/)) {';

const newFunc = `if (url === "/api/inventories" && method === "POST") {
        const inv = body as Inventory;
        if (!inv.id) inv.id = "inv_" + Date.now();
        
        const existingSnap = await getDoc(doc(db, "inventories", inv.id));
        let merged;
        if (existingSnap.exists()) {
          const existing = existingSnap.data() as Inventory;
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
        
        // Remove products and addresses so they don't bloat the main doc
        const docData = { ...merged };
        delete docData.products;
        delete docData.addresses;
        
        await setDoc(doc(db, "inventories", merged.id), docData);
        return createResponse({ success: true, inventory: merged });
      }
      `;

const startIdx = content.indexOf(targetFunc);
const endIdx = content.indexOf(nextFunc);

if (startIdx !== -1 && endIdx !== -1) {
  content = content.slice(0, startIdx) + newFunc + content.slice(endIdx);
}

fs.writeFileSync(file, content);
