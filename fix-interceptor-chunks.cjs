const fs = require('fs');

const file = 'src/lib/apiInterceptor.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace upload-products
const uploadProductsStart = content.indexOf('if (url.match(/^\\/api\\/inventories\\/[^\\/]+\\/upload-products$/)) {');
const uploadProductsEnd = content.indexOf('if (url.match(/^\\/api\\/inventories\\/[^\\/]+\\/upload-addresses$/)) {');

const newUploadProducts = `if (url.match(/^\\/api\\/inventories\\/[^\\/]+\\/upload-products$/)) {
        const id = url.split("/")[3];
        const snap = await getDoc(doc(db, "inventories", id));
        if (!snap.exists()) return createResponse({ error: "Not found" }, 404);
        const inv = snap.data() as Inventory;
        const products = body.products as Product[];
        const cleaned: Product[] = [];
        const seenKeys = new Set<string>();
        for (const p of products) {
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
        
        // Save to chunks
        const CHUNK_SIZE = 2500;
        const colRef = collection(db, \`inventories/\${id}/productChunks\`);
        const oldSnap = await getDocs(colRef);
        for (const d of oldSnap.docs) {
          await deleteDoc(d.ref);
        }
        for (let i = 0; i < cleaned.length; i += CHUNK_SIZE) {
          const chunk = cleaned.slice(i, i + CHUNK_SIZE);
          await setDoc(doc(db, \`inventories/\${id}/productChunks\`, \`chunk_\${i}\`), { items: chunk });
        }
        
        // Remove products from main doc to save space
        delete inv.products;
        inv.dataEdicao = new Date().toISOString();
        await setDoc(doc(db, "inventories", id), inv);
        return createResponse({ success: true, count: cleaned.length });
      }
      `;

if (uploadProductsStart !== -1 && uploadProductsEnd !== -1) {
  content = content.slice(0, uploadProductsStart) + newUploadProducts + content.slice(uploadProductsEnd);
}

// Replace upload-addresses
const uploadAddressesStart = content.indexOf('if (url.match(/^\\/api\\/inventories\\/[^\\/]+\\/upload-addresses$/)) {');
const uploadAddressesEnd = content.indexOf('if (url === "/api/collect" && method === "POST") {');

const newUploadAddresses = `if (url.match(/^\\/api\\/inventories\\/[^\\/]+\\/upload-addresses$/)) {
        const id = url.split("/")[3];
        const snap = await getDoc(doc(db, "inventories", id));
        if (!snap.exists()) return createResponse({ error: "Not found" }, 404);
        const inv = snap.data() as Inventory;
        const addresses = body.addresses as Address[];
        const cleaned: Address[] = [];
        const seenKeys = new Set<string>();
        for (const a of addresses) {
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
        const colRef = collection(db, \`inventories/\${id}/addressChunks\`);
        const oldSnap = await getDocs(colRef);
        for (const d of oldSnap.docs) {
          await deleteDoc(d.ref);
        }
        for (let i = 0; i < cleaned.length; i += CHUNK_SIZE) {
          const chunk = cleaned.slice(i, i + CHUNK_SIZE);
          await setDoc(doc(db, \`inventories/\${id}/addressChunks\`, \`chunk_\${i}\`), { items: chunk });
        }
        
        delete inv.addresses;
        inv.dataEdicao = new Date().toISOString();
        await setDoc(doc(db, "inventories", id), inv);
        return createResponse({ success: true, count: cleaned.length });
      }
      `;

if (uploadAddressesStart !== -1 && uploadAddressesEnd !== -1) {
  content = content.slice(0, uploadAddressesStart) + newUploadAddresses + content.slice(uploadAddressesEnd);
}

// Replace GET inventories/:id to assemble chunks
const getInvStart = content.indexOf('if (url.match(/^\\/api\\/inventories\\/[^\\/]+$/)) {');
const getInvEnd = content.indexOf('if (url === "/api/inventories" && method === "POST") {');

const newGetInv = `if (url.match(/^\\/api\\/inventories\\/[^\\/]+$/)) {
        const id = url.split("/").pop()!;
        if (method === "GET") {
          const snap = await getDoc(doc(db, "inventories", id));
          if (snap.exists()) {
            const inv = snap.data() as Inventory;
            if (!inv.products) inv.products = [];
            if (!inv.addresses) inv.addresses = [];
            
            // fetch products chunks
            const prodSnap = await getDocs(collection(db, \`inventories/\${id}/productChunks\`));
            prodSnap.forEach(d => {
              inv.products = inv.products.concat(d.data().items || []);
            });
            
            // fetch addresses chunks
            const addrSnap = await getDocs(collection(db, \`inventories/\${id}/addressChunks\`));
            addrSnap.forEach(d => {
              inv.addresses = inv.addresses.concat(d.data().items || []);
            });
            
            return createResponse(inv);
          }
          return createResponse({ error: "Not found" }, 404);
        }
        if (method === "DELETE") {
          await deleteDoc(doc(db, "inventories", id));
          return createResponse({ success: true });
        }
      }
      `;

if (getInvStart !== -1 && getInvEnd !== -1) {
  content = content.slice(0, getInvStart) + newGetInv + content.slice(getInvEnd);
}

fs.writeFileSync(file, content);
