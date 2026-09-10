import { doc, setDoc, getDoc, getDocs, collection, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Company, Operator, Device, Inventory, Product, Address } from "../types";

const originalFetch = window.fetch;

// Helper to ensure localStorage is seeded from db.json if the cache is completely empty
async function ensureLocalStorageSeeded() {
  try {
    const check = localStorage.getItem("invexa_cache_companies");
    if (!check) {
      console.log("Local database fallback cache is empty. Seeding from db.json...");
      const res = await originalFetch("/db.json");
      if (res.ok) {
        const fullDb = await res.json();
        localStorage.setItem("invexa_cache_companies", JSON.stringify(fullDb.companies || []));
        localStorage.setItem("invexa_cache_operators", JSON.stringify(fullDb.operators || []));
        localStorage.setItem("invexa_cache_devices", JSON.stringify(fullDb.devices || []));
        localStorage.setItem("invexa_cache_inventories", JSON.stringify(fullDb.inventories || []));
        console.log("Fallback cache seeded successfully from db.json!");
      }
    }
  } catch (e) {
    console.error("Failed to seed fallback database from db.json:", e);
  }
}

// Robust wrapped Firebase operation helpers with localStorage fallbacks
async function safeGetDocs(colName: string) {
  try {
    const snap = await getDocs(collection(db, colName));
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    try {
      localStorage.setItem(`invexa_cache_${colName}`, JSON.stringify(data));
    } catch (e) { console.error(e); }
    return data;
  } catch (err) {
    console.warn(`Firestore getDocs failed for "${colName}". Falling back to localStorage database. Error:`, err);
    await ensureLocalStorageSeeded();
    const cached = localStorage.getItem(`invexa_cache_${colName}`);
    return cached ? JSON.parse(cached) : [];
  }
}

async function safeGetDoc(colName: string, docId: string) {
  try {
    const snap = await getDoc(doc(db, colName, docId));
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() };
      return data;
    }
  } catch (err) {
    console.warn(`Firestore getDoc failed for "${colName}/${docId}". Falling back to localStorage database. Error:`, err);
  }
  await ensureLocalStorageSeeded();
  try {
    const cached = localStorage.getItem(`invexa_cache_${colName}`);
    const list = cached ? JSON.parse(cached) : [];
    if (Array.isArray(list)) {
      const found = list.find((item: any) => item.id === docId);
      if (found) return found;
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

async function safeSetDoc(colName: string, docId: string, data: any) {
  try {
    await setDoc(doc(db, colName, docId), data);
  } catch (err) {
    console.warn(`Firestore setDoc failed for "${colName}/${docId}". Saving to localStorage fallback instead. Error:`, err);
  }
  await ensureLocalStorageSeeded();
  try {
    const cached = localStorage.getItem(`invexa_cache_${colName}`);
    let list = cached ? JSON.parse(cached) : [];
    if (!Array.isArray(list)) list = [];
    const index = list.findIndex((item: any) => item.id === docId);
    if (index >= 0) {
      list[index] = { ...list[index], ...data };
    } else {
      list.push({ id: docId, ...data });
    }
    localStorage.setItem(`invexa_cache_${colName}`, JSON.stringify(list));
    // Dispatch event to dynamically reload useDb
    window.dispatchEvent(new CustomEvent("invexa-db-updated"));
  } catch (e) {
    console.error(e);
  }
}

async function safeDeleteDoc(colName: string, docId: string) {
  try {
    await deleteDoc(doc(db, colName, docId));
  } catch (err) {
    console.warn(`Firestore deleteDoc failed for "${colName}/${docId}". Deleting from localStorage fallback. Error:`, err);
  }
  await ensureLocalStorageSeeded();
  try {
    const cached = localStorage.getItem(`invexa_cache_${colName}`);
    let list = cached ? JSON.parse(cached) : [];
    if (Array.isArray(list)) {
      list = list.filter((item: any) => item.id !== docId);
      localStorage.setItem(`invexa_cache_${colName}`, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("invexa-db-updated"));
    }
  } catch (e) {
    console.error(e);
  }
}

async function safeGetChunks(inventoryId: string, type: "productChunks" | "addressChunks") {
  try {
    const snap = await getDocs(collection(db, `inventories/${inventoryId}/${type}`));
    const chunks = snap.docs.map(d => d.data());
    try {
      localStorage.setItem(`invexa_cache_${type}_${inventoryId}`, JSON.stringify(chunks));
    } catch (e) { console.error(e); }
    return chunks;
  } catch (err) {
    console.warn(`Firestore getDocs failed for chunks of "${inventoryId}/${type}". Falling back to localStorage database. Error:`, err);
    const cached = localStorage.getItem(`invexa_cache_${type}_${inventoryId}`);
    if (cached) return JSON.parse(cached);
    // Fetch original template products from db.json if the cache is empty
    try {
      const res = await originalFetch("/db.json");
      if (res.ok) {
        const fullDb = await res.json();
        const inv = (fullDb.inventories || []).find((i: any) => i.id === inventoryId);
        if (inv) {
          const items = type === "productChunks" ? (inv.products || []) : (inv.addresses || []);
          const chunks = [];
          for (let i = 0; i < items.length; i += 200) {
            chunks.push({ items: items.slice(i, i + 200) });
          }
          return chunks;
        }
      }
    } catch (e) { console.error(e); }
    return [];
  }
}

async function safeSetChunk(inventoryId: string, type: "productChunks" | "addressChunks", chunkId: string, data: any) {
  try {
    await setDoc(doc(db, `inventories/${inventoryId}/${type}`, chunkId), data);
  } catch (err) {
    console.warn(`Firestore setDoc failed for chunk "${inventoryId}/${type}/${chunkId}". Saving to localStorage fallback instead. Error:`, err);
  }
  try {
    const key = `invexa_cache_${type}_${inventoryId}`;
    const cached = localStorage.getItem(key);
    let chunks = cached ? JSON.parse(cached) : [];
    if (!Array.isArray(chunks)) chunks = [];
    
    const chunkIndexStr = chunkId.replace("chunk_", "");
    const chunkIdx = parseInt(chunkIndexStr, 10);
    if (!isNaN(chunkIdx)) {
      chunks[chunkIdx] = data;
    } else {
      chunks.push(data);
    }
    localStorage.setItem(key, JSON.stringify(chunks));
  } catch (e) {
    console.error(e);
  }
}

async function safeDeleteCollection(inventoryId: string, type: "productChunks" | "addressChunks") {
  try {
    const snap = await getDocs(collection(db, `inventories/${inventoryId}/${type}`));
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  } catch (err) {
    console.warn(`Firestore delete collection failed for "${inventoryId}/${type}". Clearing local cache instead. Error:`, err);
  }
  try {
    localStorage.removeItem(`invexa_cache_${type}_${inventoryId}`);
  } catch (e) {
    console.error(e);
  }
}

export const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  if (url.startsWith("/api/")) {
    const method = init?.method || "GET";
    const body = init?.body ? JSON.parse(init.body as string) : null;

    const createResponse = (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
      });
    };

    try {
      if (url === "/api/companies" && method === "GET") {
        const list = await safeGetDocs("companies");
        return createResponse(list);
      }

      if (url === "/api/companies" && method === "POST") {
        const comp: Company = body;
        if (!comp.id) comp.id = "comp_" + Date.now();
        await safeSetDoc("companies", comp.id, comp);
        return createResponse({ success: true, company: comp });
      }

      if (url === "/api/operators" && method === "GET") {
        const list = await safeGetDocs("operators");
        return createResponse(list);
      }

      if (url === "/api/operators" && method === "POST") {
        const op: Operator = body;
        if (!op.id) op.id = "op_" + Date.now();
        await safeSetDoc("operators", op.id, op);
        return createResponse({ success: true, operator: op });
      }

      if (url === "/api/devices" && method === "GET") {
        const list = await safeGetDocs("devices");
        return createResponse(list);
      }

      if (url === "/api/devices" && method === "POST") {
        const dev: Device = body;
        if (!dev.id) dev.id = "dev_" + Date.now();
        await safeSetDoc("devices", dev.id, dev);
        return createResponse({ success: true, device: dev });
      }

      if (url === "/api/inventories" && method === "GET") {
        const snapList = await safeGetDocs("inventories");
        const minimized = snapList.map((inv: any) => ({
          ...inv,
          products: [],
          addresses: []
        }));
        return createResponse(minimized);
      }

      if (url.match(/^\/api\/inventories\/[^\/]+$/) && method === "GET") {
        const id = url.split("/")[3];
        const inv = await safeGetDoc("inventories", id);
        if (!inv) return createResponse({ error: "Not found" }, 404);
        const minimized = {
          ...inv,
          products: [],
          addresses: []
        };
        return createResponse(minimized);
      }

      if (url.match(/^\/api\/inventories\/[^\/]+\/products$/) && method === "GET") {
        const id = url.split("/")[3];
        const chunks = await safeGetChunks(id, "productChunks");
        let products: any[] = [];
        chunks.forEach((chunk: any) => {
          products = products.concat(chunk.items || []);
        });
        
        const inv = await safeGetDoc("inventories", id);
        const totalCount = inv ? (inv.totalProductsCount ?? products.length) : products.length;
        return createResponse({ success: true, count: totalCount, products });
      }

      if (url.match(/^\/api\/inventories\/[^\/]+\/addresses$/) && method === "GET") {
        const id = url.split("/")[3];
        const chunks = await safeGetChunks(id, "addressChunks");
        let addresses: any[] = [];
        chunks.forEach((chunk: any) => {
          addresses = addresses.concat(chunk.items || []);
        });

        const inv = await safeGetDoc("inventories", id);
        const totalCount = inv ? (inv.totalAddressesCount ?? addresses.length) : addresses.length;
        return createResponse({ success: true, count: totalCount, addresses });
      }

      if (url === "/api/inventories" && method === "POST") {
        const inv = body as Inventory;
        if (!inv.id) inv.id = "inv_" + Date.now();
        
        const existing = await safeGetDoc("inventories", inv.id);
        let merged;
        if (existing) {
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
        
        await safeSetDoc("inventories", merged.id, docData);
        return createResponse({ success: true, inventory: merged });
      }

      if (url.match(/^\/api\/inventories\/[^\/]+$/) && method === "DELETE") {
        const id = url.split("/")[3];
        await safeDeleteDoc("inventories", id);
        await safeDeleteCollection(id, "productChunks");
        await safeDeleteCollection(id, "addressChunks");
        return createResponse({ success: true });
      }

      if (url.match(/^\/api\/inventories\/[^\/]+\/(products|addresses)$/) && method === "DELETE") {
        const id = url.split("/")[3];
        const type = url.split("/")[4];
        const chunkType = type === "products" ? "productChunks" : "addressChunks";
        await safeDeleteCollection(id, chunkType);
        
        const inv = await safeGetDoc("inventories", id);
        if (inv) {
          if (type === "products") {
            inv.totalProductsCount = 0;
          } else {
            inv.totalAddressesCount = 0;
          }
          inv.dataEdicao = new Date().toISOString();
          await safeSetDoc("inventories", id, inv);
        }
        return createResponse({ success: true });
      }

      if (url.match(/^\/api\/inventories\/[^\/]+\/upload-products$/)) {
        const id = url.split("/")[3];
        const inv = await safeGetDoc("inventories", id);
        if (!inv) return createResponse({ error: "Not found" }, 404);
        
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
        
        const CHUNK_SIZE = 2500;
        await safeDeleteCollection(id, "productChunks");
        for (let i = 0; i < cleaned.length; i += CHUNK_SIZE) {
          const chunk = cleaned.slice(i, i + CHUNK_SIZE);
          await safeSetChunk(id, "productChunks", `chunk_${i}`, { items: chunk });
        }
        
        delete inv.products;
        inv.totalProductsCount = cleaned.length;
        inv.dataEdicao = new Date().toISOString();
        await safeSetDoc("inventories", id, inv);
        return createResponse({ success: true, count: cleaned.length });
      }

      if (url.match(/^\/api\/inventories\/[^\/]+\/upload-addresses$/)) {
        const id = url.split("/")[3];
        const inv = await safeGetDoc("inventories", id);
        if (!inv) return createResponse({ error: "Not found" }, 404);

        const addresses = body.addresses as Address[];
        const cleaned: Address[] = [];
        const seenKeys = new Set<string>();
        for (const a of addresses) {
          const code = (a.codigo || (a as any).address || "").trim();
          if (!code) continue;
          if (!seenKeys.has(code)) {
            seenKeys.add(code);
            cleaned.push({
              codigo: code
            });
          }
        }
        
        const CHUNK_SIZE = 2500;
        await safeDeleteCollection(id, "addressChunks");
        for (let i = 0; i < cleaned.length; i += CHUNK_SIZE) {
          const chunk = cleaned.slice(i, i + CHUNK_SIZE);
          await safeSetChunk(id, "addressChunks", `chunk_${i}`, { items: chunk });
        }
        
        delete inv.addresses;
        inv.totalAddressesCount = cleaned.length;
        inv.dataEdicao = new Date().toISOString();
        await safeSetDoc("inventories", id, inv);
        return createResponse({ success: true, count: cleaned.length });
      }

      if (url === "/api/collect" && method === "POST") {
        const { inventoryId, sectorId, sectionCode, operatorId, operatorName, collectorNumber, items, startTime, endTime } = body;
        const inv = await safeGetDoc("inventories", inventoryId);
        if (!inv) return createResponse({ error: "Inventory not found" }, 404);
        const sector = (inv.sectors || []).find((s: any) => s.id === sectorId);
        if (!sector) return createResponse({ error: "Sector not found" }, 404);
        let section = sector.sections.find((s: any) => s.code === sectionCode);
        if (!section) {
          section = { code: sectionCode, status: "NAO_INICIADO", contagens: [], finalizado: false };
          sector.sections.push(section);
        } else {
          if (section.finalizado) {
            return createResponse({ error: "Sessão já finalizada." }, 400);
          }
        }

        const novaContagem = {
          operatorId, operatorName, collectorNumber: collectorNumber || "99",
          startTime, endTime, transmitTime: new Date().toISOString(), items
        };

        if (inv.compara) {
          section.contagens.push(novaContagem);
          section.status = section.contagens.length >= 2 ? "DIVERGENTE" : "CONTADO";
        } else {
          section.contagens = [novaContagem];
          section.status = "CONTADO";
        }
        section.finalizado = true;
        await safeSetDoc("inventories", inventoryId, inv);
        return createResponse({ success: true });
      }

      if (url.match(/^\/api\/inventories\/[^\/]+\/manage-section$/)) {
        const id = url.split("/")[3];
        const { sectorId, sectionCode, sectionCodes, action, items, operatorId, operatorName } = body;
        const inv = await safeGetDoc("inventories", id);
        if (!inv) return createResponse({ error: "Not found" }, 404);
        const sector = (inv.sectors || []).find((s: any) => s.id === sectorId);
        if (!sector) return createResponse({ error: "Sector not found" }, 404);

        if (action === "delete_multiple" || (action === "delete" && Array.isArray(sectionCodes))) {
          const targets = new Set((sectionCodes || []).map((c: any) => String(c).toUpperCase().trim()));
          sector.sections = sector.sections.filter((s: any) => !targets.has(String(s.code).toUpperCase().trim()));
        } else if (action === "add_multiple" || (action === "add" && Array.isArray(sectionCodes))) {
          const existingCodes = new Set(sector.sections.map((s: any) => String(s.code).toUpperCase().trim()));
          const codesToAdd = (sectionCodes || []).map((c: any) => String(c).trim()).filter(Boolean);
          codesToAdd.forEach((code: any) => {
            const normalized = code.padStart(4, "0");
            if (!existingCodes.has(normalized.toUpperCase()) && !existingCodes.has(code.toUpperCase())) {
              sector.sections.push({
                code: normalized,
                status: "NAO_INICIADO",
                contagens: [],
                finalizado: false
              });
              existingCodes.add(normalized.toUpperCase());
            }
          });
          sector.sections.sort((a: any, b: any) => {
            const numA = parseInt(a.code, 10);
            const numB = parseInt(b.code, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return String(a.code).localeCompare(String(b.code));
          });
        } else {
          let section = sector.sections.find((s: any) => s.code === sectionCode);
          if (!section && action !== "add") return createResponse({ error: "Section not found" }, 404);

          if (action === "clear" || action === "clear_all_counts") {
            if (section) {
              section.contagens = [];
              section.status = "NAO_INICIADO";
              section.finalizado = false;
              if (section.shadowAudit) section.shadowAudit = undefined;
            }
          } else if (action === "delete") {
            sector.sections = sector.sections.filter((s: any) => s.code !== sectionCode);
          } else if (action === "reopen") {
            if (section) section.finalizado = false;
          } else if (action === "conferido_ok") {
            if (section) section.status = "CONFERIDO_OK";
          } else if (action === "clear_second_count") {
            if (section && section.contagens.length > 1) {
              section.contagens = [section.contagens[0]];
              section.status = "CONTADO";
              section.finalizado = false;
            }
          } else if (action === "save_items") {
            if (section) {
              const manualContagem = {
                operatorId: operatorId || "coordenador",
                operatorName: operatorName || "COORDENADOR",
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                transmitTime: new Date().toISOString(),
                items: items.map((it: any) => ({ ...it, quantidade: Number(it.quantidade) || 0 }))
              };
              section.contagens = [manualContagem];
              section.status = "CONTADO";
              section.finalizado = true;
            }
          } else if (action === "add") {
            if (!section) {
              sector.sections.push({ code: sectionCode, status: "NAO_INICIADO", contagens: [], finalizado: false });
            }
          }
        }
        await safeSetDoc("inventories", id, inv);
        return createResponse({ success: true });
      }
      
      if (url.match(/^\/api\/inventories\/[^\/]+\/sectors$/) && method === "POST") {
        const id = url.split("/")[3];
        const { action, sectorId, nome, nomeStart, numeroStart, numeroEnd, rangeStart, rangeEnd } = body;
        const inv = await safeGetDoc("inventories", id);
        if (!inv) return createResponse({ error: "Not found" }, 404);

        if (action === "delete_sector") {
          inv.sectors = (inv.sectors || []).filter((s: any) => s.id !== sectorId);
        } else if (action === "save_sector" || action === "rename_sector") {
          if (sectorId) {
            const existing = (inv.sectors || []).find((s: any) => s.id === sectorId);
            if (existing) {
              const newName = (nome || nomeStart || "").trim().toUpperCase();
              if (newName) existing.nome = newName;
              if (numeroStart !== undefined && numeroStart !== "") existing.numero = numeroStart;
            }
          } else {
            const nStart = numeroStart ? parseInt(numeroStart) : null;
            const nEnd = numeroEnd ? parseInt(numeroEnd) : nStart;
            const sStartNum = parseInt(rangeStart) || 0;
            const sEndNum = parseInt(rangeEnd) || 0;

            if (nStart !== null && nEnd !== null) {
              for (let n = nStart; n <= nEnd; n++) {
                const generatedSections: any[] = [];
                for (let idx = sStartNum; idx <= sEndNum; idx++) {
                  generatedSections.push({ code: String(idx).padStart(4, "0"), status: "NAO_INICIADO", contagens: [], finalizado: false });
                }
                const currentName = (nStart === nEnd) ? nomeStart : `${nomeStart} ${n}`;
                if (!inv.sectors) inv.sectors = [];
                inv.sectors.push({
                  id: "sec_" + Date.now() + "_" + n,
                  nome: (currentName || "").toUpperCase(),
                  numero: String(n),
                  rangeStart,
                  rangeEnd,
                  sections: generatedSections
                });
              }
            } else {
              const generatedSections: any[] = [];
              for (let idx = sStartNum; idx <= sEndNum; idx++) {
                generatedSections.push({ code: String(idx).padStart(4, "0"), status: "NAO_INICIADO", contagens: [], finalizado: false });
              }
              if (!inv.sectors) inv.sectors = [];
              inv.sectors.push({
                id: "sec_" + Date.now() + "_single",
                nome: (nomeStart || "").toUpperCase(),
                numero: "",
                rangeStart,
                rangeEnd,
                sections: generatedSections
              });
            }
          }
        }
        await safeSetDoc("inventories", id, inv);
        return createResponse({ success: true });
      }

      if (url.match(/^\/api\/inventories\/[^\/]+\/shadow-audit$/)) {
        const id = url.split("/")[3];
        const { sectorId, sectionCode, auditorName, auditQuantity, expectedQuantity } = body;
        const inv = await safeGetDoc("inventories", id);
        if (!inv) return createResponse({ error: "Not found" }, 404);
        const sector = (inv.sectors || []).find((s: any) => s.id === sectorId);
        if (!sector) return createResponse({ error: "Sector not found" }, 404);
        let section = sector.sections.find((s: any) => s.code === sectionCode);
        if (!section) return createResponse({ error: "Section not found" }, 404);

        let totalCollected = 0;
        if (section.contagens && section.contagens.length > 0) {
          if (inv.compara) {
            const lastCount = section.contagens[section.contagens.length - 1];
            totalCollected = (lastCount?.items || []).reduce((sum: number, it: any) => sum + (Number(it.quantidade) || 0), 0);
          } else {
            totalCollected = section.contagens.reduce((sum: number, c: any) => 
              sum + (c.items || []).reduce((itSum: number, it: any) => itSum + (Number(it.quantidade) || 0), 0), 0
            );
          }
        }

        const finalExpected = expectedQuantity !== undefined && expectedQuantity !== null ? Number(expectedQuantity) : totalCollected;
        const auditQty = Number(auditQuantity) || 0;
        const isMatch = (auditQty === finalExpected);

        section.shadowAudit = {
          auditorName: auditorName || "Auditor Cliente",
          auditQuantity: auditQty,
          collectedQuantity: finalExpected,
          timestamp: new Date().toISOString(),
          divergente: !isMatch
        };

        if (isMatch) {
          section.status = "CONFERIDO_OK";
        } else {
          section.status = "DIVERGENTE";
        }
        section.finalizado = true;

        await safeSetDoc("inventories", id, inv);
        return createResponse({ 
          success: true, 
          isMatch, 
          status: section.status, 
          auditQuantity: auditQty, 
          collectedQuantity: finalExpected,
          sectorId: sector.id,
          sectorName: sector.nome,
          sectionCode: section.code
        });
      }

      if (url === "/api/reset") {
        try {
          console.log("Client-side local reset requested.");
          localStorage.removeItem("invexa_cache_companies");
          localStorage.removeItem("invexa_cache_operators");
          localStorage.removeItem("invexa_cache_devices");
          localStorage.removeItem("invexa_cache_inventories");
          await ensureLocalStorageSeeded();
          window.dispatchEvent(new CustomEvent("invexa-db-updated"));
          return createResponse({ success: true });
        } catch (e: any) {
          return createResponse({ error: e.message }, 500);
        }
      }
    } catch (e: any) {
      console.error("API Fetch Interceptor caught exception:", e);
      return createResponse({ error: e.message }, 500);
    }
  }

  return originalFetch(input, init);
};
