import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import { createServer as createViteServer } from "vite";
import { db, initDatabase } from "./src/db";
import { companies, operators, devices, inventories, products, addresses, importedBases } from "./src/db/schema";
import { eq, sql } from "drizzle-orm";
import { readDb, writeDb } from "./db_helper";


// --- MUTEX FOR CONCURRENCY CONTROL ---
class Mutex {
  private queue: (() => void)[] = [];
  private locked: boolean = false;

  lock(): Promise<void> {
    return new Promise<void>(resolve => {
      if (this.locked) {
        this.queue.push(resolve);
      } else {
        this.locked = true;
        resolve();
      }
    });
  }

  unlock(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.locked = false;
    }
  }
}
const inventoryMutexes = new Map<string, Mutex>();
function getInventoryMutex(id: string): Mutex {
  if (!inventoryMutexes.has(id)) {
    inventoryMutexes.set(id, new Mutex());
  }
  return inventoryMutexes.get(id)!;
}

const app = express();
const PORT = 3000;

// Enable CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "100mb" }));

// Rota para download direto do pacote compilado na VPS
app.get("/api/download-build", (req, res) => {
  const filePath = path.join(process.cwd(), "dist_atualizado.tar.gz");
  if (fsSync.existsSync(filePath)) {
    return res.download(filePath, "dist_atualizado.tar.gz");
  }
  return res.status(404).send("Pacote não encontrado");
});
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(express.text({ limit: "100mb" }));

// In-memory log for diagnostic
const recentTransmissions: any[] = [];
app.get("/api/debug/last-transmissions", (req, res) => res.json(recentTransmissions));
app.get(["/api/ping", "/api/health"], (req, res) => {
  res.json({ success: true, status: "OK", online: true, timestamp: new Date().toISOString() });
});

app.get("/api/get-server-cjs", async (req, res) => {
  try {
    const esbuild = await import("esbuild");
    const result = await esbuild.build({
      entryPoints: ["server.ts"],
      bundle: true,
      platform: "node",
      format: "cjs",
      packages: "external",
      sourcemap: true,
      write: false,
    });
    const outputFile = result.outputFiles.find(f => f.path.endsWith('.js') || f.path.endsWith('.cjs') || true);
    let text = "";
    if (outputFile) {
      text = new TextDecoder().decode(outputFile.contents);
    }
    res.setHeader("Content-Type", "application/javascript");
    res.send(text || "// build error");
  } catch (err: any) {
    res.status(500).send(`// Error building: ${err.message}`);
  }
});

// -------------------------------------------------------------
// COMPANIES API
// -------------------------------------------------------------
app.get("/api/companies", async (req, res) => {
  try {
    const list = await db.select().from(companies);
    res.json(list);
  } catch (err: any) {
    try {
      const dbJson = await readDb();
      res.json(dbJson.companies || []);
    } catch (e) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.post("/api/companies", async (req, res) => {
  try {
    const comp = req.body;
    if (!comp.id) comp.id = "comp_" + Date.now();
    await db.insert(companies).values({
      id: comp.id,
      cnpj: comp.cnpj || "",
      razaoSocial: comp.razaoSocial || "",
      nomeFantasia: comp.nomeFantasia || "",
      logotipo: comp.logotipo || null,
      parcerias: comp.parcerias || []
    }).onDuplicateKeyUpdate({
      set: {
        cnpj: comp.cnpj,
        razaoSocial: comp.razaoSocial,
        nomeFantasia: comp.nomeFantasia,
        logotipo: comp.logotipo,
        parcerias: comp.parcerias
      }
    });
    res.json({ success: true, company: comp });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// OPERATORS API
// -------------------------------------------------------------
app.get("/api/operators", async (req, res) => {
  try {
    const list = await db.select().from(operators);
    res.json(list);
  } catch (err: any) {
    try {
      const dbJson = await readDb();
      res.json(dbJson.operators || []);
    } catch (e) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.post("/api/operators", async (req, res) => {
  try {
    const op = req.body;
    if (!op.id) op.id = "op_" + Date.now();
    const cleanCpf = (op.cpf || "").replace(/\D/g, "");
    const senhaPreenchedores = op.senhaPreenchedores || (cleanCpf.length >= 6 ? cleanCpf.slice(-6) : cleanCpf || "123456");

    await db.insert(operators).values({
      id: op.id,
      cpf: op.cpf || "",
      nomeCompleto: op.nomeCompleto || "",
      dataNascimento: op.dataNascimento || "",
      senhaPreenchedores: senhaPreenchedores,
      companyId: op.companyId || "",
      hierarquia: op.hierarquia || "Inventariante"
    }).onDuplicateKeyUpdate({
      set: {
        cpf: op.cpf || "",
        nomeCompleto: op.nomeCompleto || "",
        dataNascimento: op.dataNascimento || "",
        senhaPreenchedores: senhaPreenchedores,
        companyId: op.companyId || "",
        hierarquia: op.hierarquia || "Inventariante"
      }
    });
    res.json({ success: true, operator: { ...op, senhaPreenchedores } });
  } catch (err: any) {
    console.error("Erro ao salvar operador:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/operators/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(operators).where(eq(operators.id, id));
    res.json({ success: true, message: "Operador excluído com sucesso" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/companies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(companies).where(eq(companies.id, id));
    res.json({ success: true, message: "Empresa excluída com sucesso" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DEVICES API
// -------------------------------------------------------------
app.get("/api/devices", async (req, res) => {
  try {
    const list = await db.select().from(devices);
    res.json(list);
  } catch (err: any) {
    try {
      const dbJson = await readDb();
      res.json(dbJson.devices || []);
    } catch (e) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.post("/api/devices", async (req, res) => {
  try {
    const dev = req.body;
    if (!dev.id) dev.id = "dev_" + Date.now();
    await db.insert(devices).values({
      id: dev.id,
      nomeFantasia: dev.nomeFantasia,
      companyId: dev.companyId,
      lastActive: dev.lastActive || new Date().toISOString()
    }).onDuplicateKeyUpdate({
      set: {
        nomeFantasia: dev.nomeFantasia,
        companyId: dev.companyId,
        lastActive: dev.lastActive
      }
    });
    res.json({ success: true, device: dev });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to sanitize sectors so that empty sections are always NAO_INICIADO
function sanitizeSectors(sectorsList: any[]) {
  if (!Array.isArray(sectorsList)) return [];
  return sectorsList.map((sec: any) => ({
    ...sec,
    sections: (sec.sections || []).map((s: any) => {
      const hasValidItems = Array.isArray(s.contagens) && s.contagens.some((c: any) => 
        Array.isArray(c?.items) && c.items.some((it: any) => (Number(it.quantidade) || 0) > 0)
      );
      if (!hasValidItems) {
        return {
          ...s,
          contagens: [],
          status: "NAO_INICIADO",
          finalizado: false,
          shadowAudit: undefined
        };
      }
      return s;
    })
  }));
}

// -------------------------------------------------------------
// INVENTORIES CORE API
// -------------------------------------------------------------
app.get("/api/inventories", async (req, res) => {
  try {
    const list = await db.select().from(inventories);
    res.json(list.map(inv => ({
      ...inv,
      products: [],
      addresses: [],
      sectors: sanitizeSectors(inv.sectors || [])
    })));
  } catch (err: any) {
    try {
      const dbJson = await readDb();
      const list = (dbJson.inventories || []).map((inv: any) => ({
        ...inv,
        products: inv.products || [],
        addresses: inv.addresses || [],
        sectors: sanitizeSectors(inv.sectors || [])
      }));
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.get("/api/inventories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const invData = await db.select().from(inventories).where(eq(inventories.id, id));
    if (!invData.length) return res.status(404).json({ error: "Not found" });
    
    res.json({
      ...invData[0],
      products: [],
      addresses: [],
      sectors: sanitizeSectors(invData[0].sectors || [])
    });
  } catch (err: any) {
    try {
      const { id } = req.params;
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i: any) => i.id === id);
      if (!inv) return res.status(404).json({ error: "Not found" });
      res.json({
        ...inv,
        products: inv.products || [],
        addresses: inv.addresses || [],
        sectors: sanitizeSectors(inv.sectors || [])
      });
    } catch (e) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.post("/api/inventories", async (req, res) => {
  try {
    const inv = req.body;
    if (!inv.id) inv.id = "inv_" + Date.now();
    
    const docData = { ...inv };
    delete docData.products;
    delete docData.addresses;

    try {
      await db.insert(inventories).values({
        id: inv.id,
        nome: inv.nome || "INVENTÁRIO NOVO",
        filial: inv.filial || null,
        dataExecucao: inv.dataExecucao || null,
        dataEdicao: new Date().toISOString(),
        status: inv.status || null,
        tipoContagem: inv.tipoContagem || null,
        coletaPallets: inv.coletaPallets || null,
        permissaoColeta: inv.permissaoColeta || null,
        compara: inv.compara || false,
        comparaViaLink: inv.comparaViaLink || false,
        coordenador: inv.coordenador || null,
        gerente: inv.gerente || null,
        inicioEstoque: inv.inicioEstoque || null,
        terminoEstoque: inv.terminoEstoque || null,
        inicioLoja: inv.inicioLoja || null,
        terminoLoja: inv.terminoLoja || null,
        inicioDivergencia: inv.inicioDivergencia || null,
        terminoDivergencia: inv.terminoDivergencia || null,
        assinaturaGerente: inv.assinaturaGerente || null,
        assinaturaCoordenador: inv.assinaturaCoordenador || null,
        sectors: inv.sectors || [],
        totalProductsCount: inv.totalProductsCount || 0,
        totalAddressesCount: inv.totalAddressesCount || 0,
        totalEstoque: inv.totalEstoque || 0,
        totalPrecoCusto: inv.totalPrecoCusto || 0,
        totalDepartamentos: inv.totalDepartamentos || 0
      }).onDuplicateKeyUpdate({
        set: {
          nome: inv.nome,
          filial: inv.filial,
          dataExecucao: inv.dataExecucao,
          dataEdicao: new Date().toISOString(),
          status: inv.status,
          tipoContagem: inv.tipoContagem,
          coletaPallets: inv.coletaPallets,
          permissaoColeta: inv.permissaoColeta,
          compara: inv.compara,
          comparaViaLink: inv.comparaViaLink,
          coordenador: inv.coordenador,
          gerente: inv.gerente,
          inicioEstoque: inv.inicioEstoque,
          terminoEstoque: inv.terminoEstoque,
          inicioLoja: inv.inicioLoja,
          terminoLoja: inv.terminoLoja,
          inicioDivergencia: inv.inicioDivergencia,
          terminoDivergencia: inv.terminoDivergencia,
          assinaturaGerente: inv.assinaturaGerente,
          assinaturaCoordenador: inv.assinaturaCoordenador,
          ...(inv.sectors !== undefined ? { sectors: inv.sectors } : {})
        }
      });
    } catch (dbErr) {
      console.warn("MySQL unavailable for POST /api/inventories, falling back to readDb/writeDb:", dbErr);
      const dbJson = await readDb();
      if (!dbJson.inventories) dbJson.inventories = [];
      const idx = dbJson.inventories.findIndex((i: any) => i.id === inv.id);
      if (idx >= 0) {
        dbJson.inventories[idx] = { ...dbJson.inventories[idx], ...docData };
      } else {
        dbJson.inventories.push(docData);
      }
      await writeDb(dbJson);
    }

    res.json({ success: true, inventory: docData });
  } catch (err: any) {
    console.error(">>> ERRO AO SALVAR INVENTÁRIO:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.delete("/api/inventories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(products).where(eq(products.inventoryId, id));
    await db.delete(addresses).where(eq(addresses.inventoryId, id));
    await db.delete(inventories).where(eq(inventories.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// INVENTORIES PRODUCTS AND ADDRESSES (Direct MySQL Pagination)
// -------------------------------------------------------------
app.get("/api/inventories/:id/products", async (req, res) => {
  const inventoryId = req.params.id;
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const rawLimit = req.query.limit || req.query.pageSize;
  const limit = Math.min(10000, Math.max(1, parseInt(String(rawLimit || "5000"), 10) || 5000));
  const offset = req.query.offset !== undefined 
    ? Math.max(0, parseInt(String(req.query.offset), 10) || 0)
    : (page - 1) * limit;

  try {
    // 1. Contagem rápida do total direto no MySQL
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.inventoryId, inventoryId));

    const total = Number(countResult?.count || 0);

    // 2. Busca APENAS o lote no MySQL (evita estouro de heap no Node.js)
    const items = await db
      .select({
        ean: products.ean,
        sap: products.sap,
        descricao: products.descricao,
        sector: products.departamento,
        departamento: products.departamento,
        estoque: products.estoque,
        precoCusto: products.precoCusto,
      })
      .from(products)
      .where(eq(products.inventoryId, inventoryId))
      .limit(limit)
      .offset(offset);

    return res.json({
      total,
      page,
      limit,
      products: items.map(p => ({
        ean: p.ean || "",
        sap: p.sap || "",
        descricao: p.descricao || "",
        sector: p.sector || p.departamento || "",
        departamento: p.departamento || p.sector || "",
        estoque: p.estoque !== null && p.estoque !== undefined ? Number(p.estoque) : 0,
        precoCusto: p.precoCusto !== null && p.precoCusto !== undefined ? Number(p.precoCusto) : 0
      }))
    });
  } catch (err: any) {
    // Fallback leve para ambiente sem MySQL ativo
    try {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i: any) => i.id === inventoryId);
      if (!inv) {
        return res.status(404).json({ error: "Inventário não encontrado." });
      }
      const all = Array.isArray(inv.products) ? inv.products : [];
      const total = all.length || Number(inv.totalProductsCount) || 0;
      const paginated = all.slice(offset, offset + limit);
      return res.json({
        total,
        page,
        limit,
        products: paginated.map((p: any) => ({
          ean: p.ean || "",
          sap: p.sap || "",
          descricao: p.descricao || "",
          sector: p.sector || p.departamento || "",
          departamento: p.departamento || p.sector || "",
          estoque: p.estoque !== null && p.estoque !== undefined ? Number(p.estoque) : 0,
          precoCusto: p.precoCusto !== null && p.precoCusto !== undefined ? Number(p.precoCusto) : 0
        }))
      });
    } catch (fbErr) {
      console.error("Erro na rota de produtos:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao consultar produtos." });
    }
  }
});

app.get("/api/inventories/:id/addresses", async (req, res) => {
  const inventoryId = req.params.id;
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const rawLimit = req.query.limit || req.query.pageSize;
  const limit = Math.min(10000, Math.max(1, parseInt(String(rawLimit || "5000"), 10) || 5000));
  const offset = req.query.offset !== undefined 
    ? Math.max(0, parseInt(String(req.query.offset), 10) || 0)
    : (page - 1) * limit;

  try {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(addresses)
      .where(eq(addresses.inventoryId, inventoryId));

    const total = Number(countResult?.count || 0);

    const items = await db
      .select({
        id: addresses.id,
        codigo: addresses.codigo,
      })
      .from(addresses)
      .where(eq(addresses.inventoryId, inventoryId))
      .limit(limit)
      .offset(offset);

    return res.json({
      total,
      page,
      limit,
      addresses: items
    });
  } catch (err: any) {
    try {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i: any) => i.id === inventoryId);
      if (!inv) {
        return res.status(404).json({ error: "Inventário não encontrado." });
      }
      const all = Array.isArray(inv.addresses) ? inv.addresses : [];
      const total = all.length || Number(inv.totalAddressesCount) || 0;
      const paginated = all.slice(offset, offset + limit);
      return res.json({
        total,
        page,
        limit,
        addresses: paginated
      });
    } catch (fbErr) {
      console.error("Erro na rota de endereços:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao consultar endereços." });
    }
  }
});

app.post("/api/inventories/:id/upload-products", async (req, res) => {
  try {
    const { id } = req.params;
    const { products: prodBody } = req.body;
    
    // Clear old products
    await db.delete(products).where(eq(products.inventoryId, id));
    
    const cleaned = [];
    const seenKeys = new Set<string>();
    
    let totalEstoque = 0;
    let totalPrecoCusto = 0;
    const departamentos = new Set<string>();

    for (const p of prodBody) {
      const key = p.ean ? String(p.ean).trim() : p.sap ? String(p.sap).trim() : p.descricao ? String(p.descricao).trim() : "";
      if (!key) continue;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        
        const est = Number(p.estoque) || 0;
        const pc = Number(p.precoCusto) || 0;
        const dep = String(p.departamento || "").trim();
        
        totalEstoque += est;
        totalPrecoCusto += (est * pc);
        if (dep) departamentos.add(dep);

        cleaned.push({
          inventoryId: id,
          ean: String(p.ean || "").trim(),
          sap: String(p.sap || "").trim(),
          descricao: String(p.descricao || "").trim(),
          estoque: est,
          precoCusto: pc,
          departamento: dep
        });
      }
    }
    
    // Chunk inserts due to parameter limits in Postgres (typically ~65k parameters, meaning max ~8k rows at once for 8 columns)
    const CHUNK_SIZE = 5000;
    for (let i = 0; i < cleaned.length; i += CHUNK_SIZE) {
      const chunk = cleaned.slice(i, i + CHUNK_SIZE);
      await db.insert(products).values(chunk);
    }
    
    await db.update(inventories).set({
      totalProductsCount: cleaned.length,
      totalEstoque,
      totalPrecoCusto,
      totalDepartamentos: departamentos.size,
      dataEdicao: new Date().toISOString()
    }).where(eq(inventories.id, id));
    
    res.json({ success: true, count: cleaned.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/inventories/:id/upload-addresses", async (req, res) => {
  try {
    const { id } = req.params;
    const { addresses: addrBody } = req.body;
    
    await db.delete(addresses).where(eq(addresses.inventoryId, id));
    
    const cleaned = [];
    const seenKeys = new Set<string>();
    for (const a of addrBody) {
      const code = String(a.codigo || (a as any).address || "").trim();
      if (!code) continue;
      if (!seenKeys.has(code)) {
        seenKeys.add(code);
        cleaned.push({
          inventoryId: id,
          codigo: code
        });
      }
    }
    
    const CHUNK_SIZE = 10000;
    for (let i = 0; i < cleaned.length; i += CHUNK_SIZE) {
      const chunk = cleaned.slice(i, i + CHUNK_SIZE);
      await db.insert(addresses).values(chunk);
    }
    
    await db.update(inventories).set({
      totalAddressesCount: cleaned.length,
      dataEdicao: new Date().toISOString()
    }).where(eq(inventories.id, id));
    
    res.json({ success: true, count: cleaned.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/inventories/:id/:type(products|addresses)", async (req, res) => {
  try {
    const { id, type } = req.params;
    if (type === "products") {
      await db.delete(products).where(eq(products.inventoryId, id));
      await db.update(inventories).set({
        totalProductsCount: 0,
        totalEstoque: 0,
        totalPrecoCusto: 0,
        totalDepartamentos: 0,
        dataEdicao: new Date().toISOString()
      }).where(eq(inventories.id, id));
    } else {
      await db.delete(addresses).where(eq(addresses.inventoryId, id));
      await db.update(inventories).set({
        totalAddressesCount: 0,
        dataEdicao: new Date().toISOString()
      }).where(eq(inventories.id, id));
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// IMPORTED BASES API (BASES DE CLIENTES SALVAS)
// -------------------------------------------------------------
const BASES_DIR = path.join(process.cwd(), "data", "bases");

async function ensureBasesDir() {
  try {
    await fs.mkdir(BASES_DIR, { recursive: true });
  } catch (e) {}
}

async function getSavedBasesList(): Promise<any[]> {
  await ensureBasesDir();
  const indexPath = path.join(BASES_DIR, "index.json");
  try {
    const data = await fs.readFile(indexPath, "utf8");
    return JSON.parse(data);
  } catch (e) {
    try {
      const files = await fs.readdir(BASES_DIR);
      const list = [];
      for (const file of files) {
        if (file.endsWith(".json") && file !== "index.json") {
          try {
            const raw = await fs.readFile(path.join(BASES_DIR, file), "utf8");
            const parsed = JSON.parse(raw);
            list.push({
              id: parsed.id,
              clientName: parsed.clientName,
              fileName: parsed.fileName,
              importDate: parsed.importDate,
              totalProducts: parsed.totalProducts,
              totalEstoque: parsed.totalEstoque,
              totalPrecoCusto: parsed.totalPrecoCusto,
              totalDepartamentos: parsed.totalDepartamentos
            });
          } catch (err) {}
        }
      }
      await fs.writeFile(indexPath, JSON.stringify(list, null, 2), "utf8");
      return list;
    } catch (err) {
      return [];
    }
  }
}

async function saveBasesIndex(list: any[]) {
  await ensureBasesDir();
  const indexPath = path.join(BASES_DIR, "index.json");
  await fs.writeFile(indexPath, JSON.stringify(list, null, 2), "utf8");
}

app.get("/api/imported-bases", async (req, res) => {
  try {
    // 1. Primary: Try file storage (disk is 100% reliable for large files)
    const list = await getSavedBasesList();
    if (Array.isArray(list) && list.length > 0) {
      return res.json(list);
    }

    // 2. Fall back to MySQL
    try {
      const mysqlList = await db.select({
        id: importedBases.id,
        clientName: importedBases.clientName,
        fileName: importedBases.fileName,
        importDate: importedBases.importDate,
        totalProducts: importedBases.totalProducts,
        totalEstoque: importedBases.totalEstoque,
        totalPrecoCusto: importedBases.totalPrecoCusto,
        totalDepartamentos: importedBases.totalDepartamentos,
      }).from(importedBases);

      if (Array.isArray(mysqlList) && mysqlList.length > 0) {
        return res.json(mysqlList);
      }
    } catch (mysqlErr) {}

    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const SESSIONS_DIR = path.join(process.cwd(), "data", "import_sessions");
async function ensureSessionsDir() {
  try {
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
  } catch (e) {}
}

// -------------------------------------------------------------
// CHUNKED IMPORT SESSION ENDPOINTS (For large multi-million records)
// -------------------------------------------------------------

// 1. START CHUNKED IMPORT SESSION
app.post("/api/imported-bases/start-session", async (req, res) => {
  try {
    await ensureBasesDir();
    await ensureSessionsDir();

    const { clientName, fileName, mode, targetBaseId, activeColumns, checkDuplicates, totalExpectedItems, totalChunks } = req.body;
    if (!clientName || !String(clientName).trim()) {
      return res.status(400).json({ error: "Nome do cliente é obrigatório para iniciar importação." });
    }

    const trimmedClientName = String(clientName).trim();
    let isAppendMode = mode === "append" || Boolean(targetBaseId);
    let existingBaseId: string | null = targetBaseId || null;

    if (isAppendMode && !existingBaseId) {
      const currentList = await getSavedBasesList();
      const found = currentList.find(b => b.clientName.trim().toLowerCase() === trimmedClientName.toLowerCase());
      if (found) {
        existingBaseId = found.id;
      }
    }

    const baseId = existingBaseId || ("base_" + Date.now());
    const sessionId = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    await fs.mkdir(sessionPath, { recursive: true });

    const sessionMeta = {
      sessionId,
      baseId,
      clientName: trimmedClientName,
      fileName: fileName || "arquivo.txt",
      mode: isAppendMode ? "append" : "create",
      activeColumns,
      checkDuplicates: checkDuplicates !== false,
      totalExpectedItems: Number(totalExpectedItems) || 0,
      totalChunks: Number(totalChunks) || 1,
      receivedChunks: [],
      status: "started",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    await fs.writeFile(path.join(sessionPath, "meta.json"), JSON.stringify(sessionMeta, null, 2), "utf8");

    res.json({
      success: true,
      sessionId,
      baseId,
      mode: sessionMeta.mode
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. RECEIVE CHUNK (BATCH)
app.post("/api/imported-bases/chunk", async (req, res) => {
  try {
    const { sessionId, chunkIndex, totalChunks, products } = req.body;
    if (!sessionId || chunkIndex === undefined || !Array.isArray(products)) {
      return res.status(400).json({ error: "Dados do lote inválidos." });
    }

    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    const metaPath = path.join(sessionPath, "meta.json");

    try {
      await fs.access(metaPath);
    } catch (e) {
      return res.status(404).json({ error: "Sessão de importação expirada ou não encontrada." });
    }

    // Save chunk file
    const chunkFilePath = path.join(sessionPath, `chunk_${chunkIndex}.json`);
    await fs.writeFile(chunkFilePath, JSON.stringify(products), "utf8");

    // Update session meta
    try {
      const rawMeta = await fs.readFile(metaPath, "utf8");
      const meta = JSON.parse(rawMeta);
      if (!meta.receivedChunks.includes(chunkIndex)) {
        meta.receivedChunks.push(chunkIndex);
        meta.receivedChunks.sort((a: number, b: number) => a - b);
      }
      meta.status = "processing";
      meta.lastUpdated = new Date().toISOString();
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");
    } catch (e) {}

    res.json({
      success: true,
      sessionId,
      chunkIndex,
      receivedCount: products.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// In-memory registry to prevent concurrent consolidation races on the same session
const activeConsolidations = new Map<string, Promise<any>>();

// 3. GET SESSION STATUS (For 502 recovery and status polling)
app.get("/api/imported-bases/session-status/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    const metaPath = path.join(sessionPath, "meta.json");

    try {
      const rawMeta = await fs.readFile(metaPath, "utf8");
      const meta = JSON.parse(rawMeta);

      const isConsolidating = activeConsolidations.has(sessionId);
      const currentStatus = meta.status === "completed" ? "completed" : (isConsolidating ? "finishing" : (meta.status || "processing"));

      return res.json({
        sessionId,
        status: currentStatus,
        baseId: meta.baseId,
        totalExpectedItems: meta.totalExpectedItems || 0,
        totalChunks: meta.totalChunks || 1,
        receivedChunks: meta.receivedChunks || [],
        processedChunksCount: (meta.receivedChunks || []).length,
        result: meta.result || null,
        error: meta.error || null
      });
    } catch (readErr) {
      // If session folder meta.json is missing, check if base exists in BASES_DIR index
      const currentList = await getSavedBasesList();
      const found = currentList.find(b => b.id.includes(sessionId) || b.fileName?.includes(sessionId));
      if (found) {
        return res.json({
          sessionId,
          status: "completed",
          result: {
            success: true,
            base: found,
            mode: "append",
            totalProducts: found.totalProducts
          }
        });
      }
      return res.status(404).json({ status: "not_found", error: "Sessão não encontrada." });
    }
  } catch (err: any) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

// 4. FINISH SESSION & CONSOLIDATE BASE PROGRESSIVELY
app.post("/api/imported-bases/finish-session", async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "ID da sessão é obrigatório." });
  }

  // If a consolidation for this session is currently running, wait for it
  if (activeConsolidations.has(sessionId)) {
    try {
      const result = await activeConsolidations.get(sessionId);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Erro na consolidação da base." });
    }
  }

  const sessionPath = path.join(SESSIONS_DIR, sessionId);
  const metaPath = path.join(sessionPath, "meta.json");

  let meta: any = {};
  try {
    const rawMeta = await fs.readFile(metaPath, "utf8");
    meta = JSON.parse(rawMeta);
  } catch (e) {
    return res.status(404).json({ error: "Sessão de importação expirada ou não encontrada." });
  }

  // Idempotency check: if session already completed, return cached result immediately!
  if (meta.status === "completed" && meta.result) {
    return res.json(meta.result);
  }

  // Define consolidation promise
  const consolidationPromise = (async () => {
    // Mark status as finishing
    meta.status = "finishing";
    meta.lastUpdated = new Date().toISOString();
    try {
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");
    } catch (e) {}

    const { baseId, clientName, fileName, mode, activeColumns, checkDuplicates } = meta;

    let existingProducts: any[] = [];
    let existingFileName = "";
    let existingImportDate = "";

    // 1. If append mode, load existing base items from disk
    if (mode === "append" && baseId) {
      try {
        const filePath = path.join(BASES_DIR, `${baseId}.json`);
        const content = await fs.readFile(filePath, "utf8");
        const parsed = JSON.parse(content);
        existingProducts = parsed.products || [];
        existingFileName = parsed.fileName || "";
        existingImportDate = parsed.importDate || "";
      } catch (e) {}
    }

    const productMap = new Map<string, any>();
    let duplicateCount = 0;
    let newAddedCount = 0;

    // Load existing items into productMap
    for (const p of existingProducts) {
      const key = p.ean ? String(p.ean).trim() : p.sap ? String(p.sap).trim() : p.descricao ? String(p.descricao).trim() : "";
      if (!key) continue;
      if (!productMap.has(key)) {
        productMap.set(key, {
          ean: String(p.ean || "").trim(),
          sap: String(p.sap || "").trim(),
          descricao: String(p.descricao || "").trim(),
          estoque: Number(p.estoque) || 0,
          precoCusto: Number(p.precoCusto) || 0,
          departamento: String(p.departamento || "").trim()
        });
      }
    }
    // Release existingProducts array memory
    existingProducts = [];

    // Process each chunk file sequentially from directory, freeing RAM per chunk
    const sessionFiles = await fs.readdir(sessionPath);
    const chunkFiles = sessionFiles
      .filter(f => /^chunk_\d+\.json$/.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.replace("chunk_", "").replace(".json", ""), 10) || 0;
        const numB = parseInt(b.replace("chunk_", "").replace(".json", ""), 10) || 0;
        return numA - numB;
      });

    for (const chunkFileName of chunkFiles) {
      const chunkFilePath = path.join(sessionPath, chunkFileName);
      try {
        const chunkContent = await fs.readFile(chunkFilePath, "utf8");
        const chunkProducts: any[] = JSON.parse(chunkContent);

        for (const p of chunkProducts) {
          const eanVal = String(p.ean || "").trim();
          const sapVal = String(p.sap || "").trim();
          const descVal = String(p.descricao || "").trim();
          const est = Number(p.estoque) || 0;
          const pc = Number(p.precoCusto) || 0;
          const dep = String(p.departamento || "").trim();

          const key = checkDuplicates 
            ? (eanVal || sapVal || descVal) 
            : (eanVal + "_" + sapVal + "_" + Math.random().toString(36).slice(2, 7));

          if (!key) continue;

          if (checkDuplicates && productMap.has(key)) {
            duplicateCount++;
            const existingItem = productMap.get(key);
            if (!existingItem.descricao && descVal) existingItem.descricao = descVal;
            if (!existingItem.departamento && dep) existingItem.departamento = dep;
            if ((!existingItem.estoque || existingItem.estoque === 0) && est > 0) existingItem.estoque = est;
            if ((!existingItem.precoCusto || existingItem.precoCusto === 0) && pc > 0) existingItem.precoCusto = pc;
          } else {
            newAddedCount++;
            productMap.set(key, {
              ean: eanVal,
              sap: sapVal,
              descricao: descVal,
              estoque: est,
              precoCusto: pc,
              departamento: dep
            });
          }
        }
      } catch (errChunk) {
        console.warn(`[FinishSession] Lote ${chunkFileName} não pôde ser lido:`, errChunk);
      }
    }

    const cleaned = Array.from(productMap.values());
    productMap.clear(); // Free memory immediately

    let totalEstoque = 0;
    let totalPrecoCusto = 0;
    const departamentos = new Set<string>();

    for (const item of cleaned) {
      totalEstoque += item.estoque;
      totalPrecoCusto += (item.estoque * item.precoCusto);
      if (item.departamento) departamentos.add(item.departamento);
    }

    const importDate = new Date().toISOString();
    const incomingFile = String(fileName || "arquivo.csv").trim();
    let combinedFileName = incomingFile;
    if (existingFileName) {
      const existingParts = existingFileName.split(",").map(s => s.trim()).filter(Boolean);
      const incomingParts = incomingFile.split(",").map(s => s.trim()).filter(Boolean);
      const allParts = Array.from(new Set([...existingParts, ...incomingParts]));
      combinedFileName = allParts.join(", ");
    }

    const baseSummary = {
      id: baseId,
      clientName: clientName,
      fileName: combinedFileName,
      importDate: existingImportDate || importDate,
      lastUpdated: importDate,
      totalProducts: cleaned.length,
      totalEstoque,
      totalPrecoCusto,
      totalDepartamentos: departamentos.size,
      activeColumns: activeColumns || { ean: true, sap: true, descricao: true, estoque: true, precoCusto: true, departamento: true }
    };

    // Use streaming to avoid JSON.stringify OOM on huge files
    const outPath = path.join(BASES_DIR, `${baseId}.json`);
    await new Promise((resolve, reject) => {
      const writeStream = fsSync.createWriteStream(outPath, "utf8");
      writeStream.on("error", reject);
      writeStream.on("finish", () => resolve(true));
      
      const summaryStr = JSON.stringify(baseSummary);
      // Remove trailing } and add products array start
      writeStream.write(summaryStr.slice(0, -1) + ',"products":[');
      
      let first = true;
      let i = 0;
      
      function writeNext() {
        let ok = true;
        while (i < cleaned.length && ok) {
          if (!first) {
            ok = writeStream.write("," + JSON.stringify(cleaned[i]));
          } else {
            ok = writeStream.write(JSON.stringify(cleaned[i]));
            first = false;
          }
          i++;
        }
        if (i < cleaned.length) {
          // Had to stop early! Write some more once it drains
          writeStream.once('drain', writeNext);
        } else {
          writeStream.write("]}");
          writeStream.end();
        }
      }
      writeNext();
    });

    const currentList = await getSavedBasesList();
    const updatedList = [baseSummary, ...currentList.filter(b => b.id !== baseId)];
    await saveBasesIndex(updatedList);

    // Clean up individual chunk files to save disk space
    try {
      for (const chunkFileName of chunkFiles) {
        await fs.unlink(path.join(sessionPath, chunkFileName)).catch(() => {});
      }
    } catch (e) {}

    const result = {
      success: true,
      base: baseSummary,
      mode,
      totalProducts: cleaned.length,
      newAddedCount,
      duplicateCount
    };

    // Write COMPLETED status to meta.json
    try {
      meta.status = "completed";
      meta.result = result;
      meta.completedAt = new Date().toISOString();
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");
    } catch (e) {}

    return result;
  })();

  activeConsolidations.set(sessionId, consolidationPromise);

  try {
    const result = await consolidationPromise;
    res.json(result);
  } catch (err: any) {
    try {
      meta.status = "failed";
      meta.error = err.message;
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");
    } catch (e) {}
    res.status(500).json({ error: err.message });
  } finally {
    activeConsolidations.delete(sessionId);
  }
});

app.post("/api/imported-bases", async (req, res) => {
  try {
    await ensureBasesDir();
    const { clientName, fileName, products: rawProducts, mode, targetBaseId, activeColumns } = req.body;
    if (!clientName || !String(clientName).trim()) {
      return res.status(400).json({ error: "Nome do cliente é obrigatório para salvar a base." });
    }
    if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
      return res.status(400).json({ error: "Nenhum produto válido encontrado para salvar." });
    }

    const trimmedClientName = String(clientName).trim();
    let isAppendMode = mode === "append" || Boolean(targetBaseId);
    let existingBaseId: string | null = targetBaseId || null;
    let existingProducts: any[] = [];
    let existingFileName = "";
    let existingImportDate = "";

    // If append mode requested, try to find existing base by targetBaseId or matching clientName
    if (isAppendMode) {
      if (!existingBaseId) {
        // Search list for base with same clientName
        const currentList = await getSavedBasesList();
        const found = currentList.find(b => b.clientName.trim().toLowerCase() === trimmedClientName.toLowerCase());
        if (found) {
          existingBaseId = found.id;
          existingFileName = found.fileName || "";
          existingImportDate = found.importDate || "";
        }
      }

      if (existingBaseId) {
        // 1. Try loading from Disk FIRST (primary and robust for large JSON files)
        try {
          const filePath = path.join(BASES_DIR, `${existingBaseId}.json`);
          const content = await fs.readFile(filePath, "utf8");
          const parsed = JSON.parse(content);
          existingProducts = parsed.products || [];
          existingFileName = parsed.fileName || existingFileName;
          existingImportDate = parsed.importDate || existingImportDate;
        } catch (e) {
          // file not found or error
        }

        // 2. Fall back to MySQL if disk file was empty
        if (existingProducts.length === 0) {
          try {
            const rows = await db.select().from(importedBases).where(eq(importedBases.id, existingBaseId));
            if (rows && rows.length > 0) {
              const row = rows[0];
              existingProducts = Array.isArray(row.products) ? row.products : (typeof row.products === "string" ? JSON.parse(row.products) : []);
              existingFileName = row.fileName || existingFileName;
              existingImportDate = row.importDate || existingImportDate;
            }
          } catch (e) {}
        }
      }
    }

    // Combine and deduplicate products
    const productMap = new Map<string, any>();
    let duplicateCount = 0;
    let newAddedCount = 0;

    // 1. Populate map with existing products
    for (const p of existingProducts) {
      const key = p.ean ? String(p.ean).trim() : p.sap ? String(p.sap).trim() : p.descricao ? String(p.descricao).trim() : "";
      if (!key) continue;
      if (!productMap.has(key)) {
        productMap.set(key, {
          ean: String(p.ean || "").trim(),
          sap: String(p.sap || "").trim(),
          descricao: String(p.descricao || "").trim(),
          estoque: Number(p.estoque) || 0,
          precoCusto: Number(p.precoCusto) || 0,
          departamento: String(p.departamento || "").trim()
        });
      }
    }

    // 2. Merge incoming products
    for (const p of rawProducts) {
      const key = p.ean ? String(p.ean).trim() : p.sap ? String(p.sap).trim() : p.descricao ? String(p.descricao).trim() : "";
      if (!key) continue;

      const est = Number(p.estoque) || 0;
      const pc = Number(p.precoCusto) || 0;
      const dep = String(p.departamento || "").trim();

      if (productMap.has(key)) {
        duplicateCount++;
        // If existing had empty fields, enrich with new product info
        const existingItem = productMap.get(key);
        if (!existingItem.descricao && p.descricao) existingItem.descricao = String(p.descricao).trim();
        if (!existingItem.departamento && dep) existingItem.departamento = dep;
        if ((!existingItem.estoque || existingItem.estoque === 0) && est > 0) existingItem.estoque = est;
        if ((!existingItem.precoCusto || existingItem.precoCusto === 0) && pc > 0) existingItem.precoCusto = pc;
      } else {
        newAddedCount++;
        productMap.set(key, {
          ean: String(p.ean || "").trim(),
          sap: String(p.sap || "").trim(),
          descricao: String(p.descricao || "").trim(),
          estoque: est,
          precoCusto: pc,
          departamento: dep
        });
      }
    }

    const cleaned = Array.from(productMap.values());
    let totalEstoque = 0;
    let totalPrecoCusto = 0;
    const departamentos = new Set<string>();

    for (const item of cleaned) {
      totalEstoque += item.estoque;
      totalPrecoCusto += (item.estoque * item.precoCusto);
      if (item.departamento) departamentos.add(item.departamento);
    }

    const baseId = existingBaseId || ("base_" + Date.now());
    const importDate = new Date().toISOString();
    
    // Combine file names nicely across separate file imports
    const incomingFile = String(fileName || "arquivo.csv").trim();
    let combinedFileName = incomingFile;
    if (existingFileName) {
      const existingParts = existingFileName.split(",").map(s => s.trim()).filter(Boolean);
      const incomingParts = incomingFile.split(",").map(s => s.trim()).filter(Boolean);
      const allParts = Array.from(new Set([...existingParts, ...incomingParts]));
      combinedFileName = allParts.join(", ");
    }

    const baseSummary = {
      id: baseId,
      clientName: trimmedClientName,
      fileName: combinedFileName,
      importDate: existingImportDate || importDate,
      lastUpdated: importDate,
      totalProducts: cleaned.length,
      totalEstoque,
      totalPrecoCusto,
      totalDepartamentos: departamentos.size,
      activeColumns: activeColumns || { ean: true, sap: true, descricao: true, estoque: true, precoCusto: true, departamento: true }
    };

    const fullBaseData = {
      ...baseSummary,
      products: cleaned
    };

    // 1. PRIMARY: Save to Disk (100% reliable for large files)
    try {
      await fs.writeFile(path.join(BASES_DIR, `${baseId}.json`), JSON.stringify(fullBaseData), "utf8");
      const currentList = await getSavedBasesList();
      const updatedList = [baseSummary, ...currentList.filter(b => b.id !== baseId)];
      await saveBasesIndex(updatedList);
    } catch (fsErr) {
      console.warn("[Disk] Erro ao salvar cópia em arquivo:", fsErr);
    }

    // 2. SECONDARY: Try MySQL insert/update (optional backup)
    try {
      const existingDbRows = await db.select().from(importedBases).where(eq(importedBases.id, baseId));
      if (existingDbRows && existingDbRows.length > 0) {
        await db.update(importedBases).set({
          clientName: baseSummary.clientName,
          fileName: baseSummary.fileName,
          importDate: baseSummary.importDate,
          totalProducts: baseSummary.totalProducts,
          totalEstoque: baseSummary.totalEstoque,
          totalPrecoCusto: baseSummary.totalPrecoCusto,
          totalDepartamentos: baseSummary.totalDepartamentos,
          products: cleaned
        }).where(eq(importedBases.id, baseId));
      } else {
        await db.insert(importedBases).values({
          id: baseId,
          clientName: baseSummary.clientName,
          fileName: baseSummary.fileName,
          importDate: baseSummary.importDate,
          totalProducts: baseSummary.totalProducts,
          totalEstoque: baseSummary.totalEstoque,
          totalPrecoCusto: baseSummary.totalPrecoCusto,
          totalDepartamentos: baseSummary.totalDepartamentos,
          products: cleaned
        });
      }
    } catch (mysqlErr) {
      // ignore MySQL errors for massive payloads
    }

    res.json({
      success: true,
      base: baseSummary,
      mode: isAppendMode && existingBaseId ? "append" : "create",
      totalProducts: cleaned.length,
      newAddedCount,
      duplicateCount,
      previousCount: existingProducts.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/imported-bases/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    // 1. PRIMARY: Try file storage (disk is 100% reliable for large files)
    try {
      const filePath = path.join(BASES_DIR, `${id}.json`);
      const raw = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(raw);

      if (limit && Array.isArray(data.products)) {
        return res.json({
          ...data,
          products: data.products.slice(0, limit),
          hasMore: data.products.length > limit,
          fullCount: data.products.length
        });
      }
      return res.json(data);
    } catch (fileErr) {}

    // 2. Fall back to MySQL
    try {
      const rows = await db.select().from(importedBases).where(eq(importedBases.id, id));
      if (rows && rows.length > 0) {
        const row = rows[0];
        const allProds = Array.isArray(row.products) ? row.products : (typeof row.products === "string" ? JSON.parse(row.products) : []);
        if (limit && allProds.length > limit) {
          return res.json({
            ...row,
            products: allProds.slice(0, limit),
            hasMore: true,
            fullCount: allProds.length
          });
        }
        return res.json({
          ...row,
          products: allProds
        });
      }
    } catch (mysqlErr) {}

    res.status(404).json({ error: "Base do cliente não encontrada." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/imported-bases/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Delete from MySQL
    try {
      await db.delete(importedBases).where(eq(importedBases.id, id));
    } catch (mysqlErr) {
      // ignore
    }

    // 2. Delete file
    const filePath = path.join(BASES_DIR, `${id}.json`);
    try {
      await fs.unlink(filePath);
    } catch (e) {}

    const currentList = await getSavedBasesList();
    const updatedList = currentList.filter(b => b.id !== id);
    await saveBasesIndex(updatedList);

    res.json({ success: true, message: "Base excluída com sucesso." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/inventories/:id/apply-base/:baseId", async (req, res) => {
  try {
    const { id, baseId } = req.params;
    let baseData: any = null;

    // 1. Try MySQL for base data
    try {
      const rows = await db.select().from(importedBases).where(eq(importedBases.id, baseId));
      if (rows && rows.length > 0) {
        const row = rows[0];
        baseData = {
          ...row,
          products: Array.isArray(row.products) ? row.products : (typeof row.products === "string" ? JSON.parse(row.products) : [])
        };
      }
    } catch (e) {}

    // 2. Fall back to file for base data
    if (!baseData) {
      const filePath = path.join(BASES_DIR, `${baseId}.json`);
      const raw = await fs.readFile(filePath, "utf8");
      baseData = JSON.parse(raw);
    }

    const baseProducts = baseData.products || [];

    // 3. Apply to MySQL in optimized chunks and update inventory metadata
    let appliedCount = baseProducts.length;
    let appliedEstoque = Number(baseData.totalEstoque) || 0;
    let appliedPrecoCusto = Number(baseData.totalPrecoCusto) || 0;
    let appliedDeptos = Number(baseData.totalDepartamentos) || 0;

    if (appliedEstoque === 0 || appliedPrecoCusto === 0) {
      for (const p of baseProducts) {
        const est = Number(p.estoque) || 0;
        appliedEstoque += est;
        appliedPrecoCusto += (est * (Number(p.precoCusto) || 0));
      }
    }

    try {
      await db.delete(products).where(eq(products.inventoryId, id));

      const chunkInsert = baseProducts.map((p: any) => ({
        inventoryId: id,
        ean: String(p.ean || "").slice(0, 255),
        sap: String(p.sap || "").slice(0, 255),
        descricao: String(p.descricao || "").slice(0, 255),
        estoque: Number(p.estoque) || 0,
        precoCusto: Number(p.precoCusto) || 0,
        departamento: String(p.departamento || "").slice(0, 255)
      }));

      const CHUNK_SIZE = 1000;
      for (let i = 0; i < chunkInsert.length; i += CHUNK_SIZE) {
        const chunk = chunkInsert.slice(i, i + CHUNK_SIZE);
        await db.insert(products).values(chunk);
      }

      await db.update(inventories).set({
        totalProductsCount: appliedCount,
        totalEstoque: appliedEstoque,
        totalPrecoCusto: appliedPrecoCusto,
        totalDepartamentos: appliedDeptos,
        clientBaseName: baseData.clientName,
        dataEdicao: new Date().toISOString()
      }).where(eq(inventories.id, id));
    } catch (sqlErr) {
      console.warn("MySQL insert failed or timed out for products, updating inventories table directly:", sqlErr);
      try {
        await db.update(inventories).set({
          totalProductsCount: appliedCount,
          totalEstoque: appliedEstoque,
          totalPrecoCusto: appliedPrecoCusto,
          totalDepartamentos: appliedDeptos,
          clientBaseName: baseData.clientName,
          dataEdicao: new Date().toISOString()
        }).where(eq(inventories.id, id));
      } catch (err2) {
        console.error("Error updating inventory metadata:", err2);
      }
    }

    // 4. Also update db.json fallback
    try {
      const dbJson = await readDb();
      if (Array.isArray(dbJson.inventories)) {
        const invIndex = dbJson.inventories.findIndex((inv: any) => inv.id === id);
        if (invIndex >= 0) {
          dbJson.inventories[invIndex].totalProductsCount = appliedCount;
          dbJson.inventories[invIndex].totalEstoque = appliedEstoque;
          dbJson.inventories[invIndex].totalPrecoCusto = appliedPrecoCusto;
          dbJson.inventories[invIndex].totalDepartamentos = appliedDeptos;
          dbJson.inventories[invIndex].clientBaseName = baseData.clientName;
          dbJson.inventories[invIndex].dataEdicao = new Date().toISOString();
          await writeDb(dbJson);
        }
      }
    } catch (jsonErr) {
      console.error("Error writing fallback db.json:", jsonErr);
    }

    res.json({
      success: true,
      count: appliedCount,
      clientName: baseData.clientName,
      fileName: baseData.fileName,
      totalEstoque: appliedEstoque,
      totalPrecoCusto: appliedPrecoCusto
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// INVENTORIES SECTORS & SECTIONS
// -------------------------------------------------------------
app.post("/api/inventories/:id/manage-section", async (req, res) => {
  try {
    const { id } = req.params;
    const { sectorId, sectionCode, sectionCodes, action, items, operatorId, operatorName } = req.body;
    
    let sectorsList: any[] = [];
    try {
      const invList = await db.select({ sectors: inventories.sectors }).from(inventories).where(eq(inventories.id, id));
      if (invList.length) {
        sectorsList = invList[0].sectors || [];
      }
    } catch (dbErr) {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i: any) => i.id === id);
      if (inv) sectorsList = inv.sectors || [];
    }
    if (!sectorsList.length) {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i: any) => i.id === id);
      if (inv) sectorsList = inv.sectors || [];
    }
    
    const sector = sectorsList.find((s: any) => s.id === sectorId);
    if (!sector) return res.status(404).json({ error: "Sector not found" });

    if (action === "delete_multiple" || (action === "delete" && Array.isArray(sectionCodes))) {
      const targets = new Set((sectionCodes || []).map((c: any) => String(c).toUpperCase().trim()));
      sector.sections = (sector.sections || []).filter((s: any) => !targets.has(String(s.code).toUpperCase().trim()));
    } else if (action === "add_multiple" || (action === "add" && Array.isArray(sectionCodes))) {
      const existingCodes = new Set((sector.sections || []).map((s: any) => String(s.code).toUpperCase().trim()));
      const codesToAdd = (sectionCodes || []).map((c: any) => String(c).trim()).filter(Boolean);
      if(!sector.sections) sector.sections = [];
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
      let section = (sector.sections || []).find((s: any) => s.code === sectionCode);
      if (!section && action !== "add") return res.status(404).json({ error: "Section not found" });

      if (action === "clear" || action === "clear_all_counts") {
        if (section) {
          section.contagens = [];
          section.status = "NAO_INICIADO";
          section.finalizado = false;
          if (section.shadowAudit) section.shadowAudit = undefined;
        }
      } else if (action === "delete") {
        sector.sections = (sector.sections || []).filter((s: any) => s.code !== sectionCode);
      } else if (action === "reopen") {
        if (section) section.finalizado = false;
      } else if (action === "conferido_ok") {
        if (section) section.status = "CONFERIDO_OK";
      } else if (action === "force_count_1") {
        if (section && section.contagens.length >= 1) {
          section.contagens = [section.contagens[0]];
          section.status = "CONFERIDO_OK";
          section.finalizado = true;
        }
      } else if (action === "force_count_2") {
        if (section && section.contagens.length >= 2) {
          section.contagens = [section.contagens[1]];
          section.status = "CONFERIDO_OK";
          section.finalizado = true;
        }
      } else if (action === "release_third_count") {
        if (section) {
          section.status = "CONTADO";
          section.finalizado = false;
        }
      } else if (action === "clear_second_count") {
        if (section && section.contagens.length > 1) {
          section.contagens = [section.contagens[0]];
          section.status = "CONTADO";
          section.finalizado = false;
        }
      } else if (action === "save_items") {
        if (section) {
          const rawItems = Array.isArray(items) ? items : [];
          const validItems = rawItems
            .map((it: any) => ({ ...it, quantidade: Number(it.quantidade) || 0 }))
            .filter((it: any) => it.quantidade > 0);

          if (validItems.length === 0) {
            section.contagens = [];
            section.status = "NAO_INICIADO";
            section.finalizado = false;
            if (section.shadowAudit) section.shadowAudit = undefined;
          } else {
            const manualContagem = {
              operatorId: operatorId || (section.contagens[0]?.operatorId) || "coordenador",
              operatorName: operatorName || (section.contagens[0]?.operatorName) || "COORDENADOR",
              startTime: section.contagens[0]?.startTime || new Date().toISOString(),
              endTime: new Date().toISOString(),
              transmitTime: section.contagens[0]?.transmitTime || new Date().toISOString(),
              items: validItems
            };
            section.contagens = [manualContagem];
            section.status = "CONTADO";
            section.finalizado = true;
          }
        }
      } else if (action === "add") {
        if (!section) {
          if(!sector.sections) sector.sections = [];
          sector.sections.push({ code: sectionCode, status: "NAO_INICIADO", contagens: [], finalizado: false });
        }
      }
    }
    
    try {
      await db.update(inventories).set({ sectors: sectorsList }).where(eq(inventories.id, id));
    } catch (dbErr) {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i: any) => i.id === id);
      if (inv) {
        inv.sectors = sectorsList;
        await writeDb(dbJson);
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/inventories/:id/sectors", async (req, res) => {
  try {
    const { id } = req.params;
    const { action, sectorId, nome, nomeStart, numeroStart, numeroEnd, rangeStart, rangeEnd } = req.body;
    let invList: any[] = [];
    try {
      invList = await db.select({ sectors: inventories.sectors }).from(inventories).where(eq(inventories.id, id));
    } catch (dbErr) {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i: any) => i.id === id);
      if (inv) invList = [inv];
    }
    if (!invList.length) return res.status(404).json({ error: "Not found" });
    
    let sectorsList: any[] = invList[0].sectors || [];

    if (action === "delete_sector") {
      sectorsList = sectorsList.filter((s: any) => s.id !== sectorId);
    } else if (action === "save_sector" || action === "rename_sector") {
      if (sectorId) {
        const existing = sectorsList.find((s: any) => s.id === sectorId);
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
            sectorsList.push({
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
          sectorsList.push({
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
    
    try {
      await db.update(inventories).set({ sectors: sectorsList }).where(eq(inventories.id, id));
    } catch (dbErr) {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i: any) => i.id === id);
      if (inv) {
        inv.sectors = sectorsList;
        await writeDb(dbJson);
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// COLLECTION API (Normal Collector Transmissions & Manual JSON Uploads)
// -------------------------------------------------------------
app.post("/api/collect", async (req, res) => {
  const { inventoryId } = req.body;
  if (!inventoryId) return res.status(400).json({ error: "inventoryId is required" });
  
  const mutex = getInventoryMutex(inventoryId);
  await mutex.lock();
  try {
    const { sectorId, sectionCode, operatorId, operatorName, collectorNumber, items, startTime, endTime, overrideFinalized } = req.body;
    
    let sectorsList: any[] = [];
    let compara = false;
    let foundInDb = false;

    try {
      const invList = await db.select({ sectors: inventories.sectors, compara: inventories.compara }).from(inventories).where(eq(inventories.id, inventoryId));
      if (invList.length) {
        sectorsList = invList[0].sectors || [];
        compara = Boolean(invList[0].compara);
        foundInDb = true;
      }
    } catch (dbErr) {
      console.warn("MySQL unavailable for /api/collect, falling back to readDb:", dbErr);
    }

    if (!foundInDb) {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i: any) => i.id === inventoryId);
      if (!inv) return res.status(404).json({ error: "Inventário não encontrado." });
      sectorsList = inv.sectors || [];
      compara = Boolean(inv.compara);
    }

    const sector = sectorsList.find((s: any) => s.id === sectorId);
    if (!sector) return res.status(404).json({ error: "Setor não encontrado." });

    let section = (sector.sections || []).find((s: any) => s.code === sectionCode);
    if (!section) {
      if (!sector.sections) sector.sections = [];
      section = { code: sectionCode, status: "NAO_INICIADO", contagens: [], finalizado: false };
      sector.sections.push(section);
    } else {
      const isMaxCountsReached = compara 
        ? (section.contagens && section.contagens.length >= 2 && section.finalizado) 
        : (section.finalizado && section.contagens && section.contagens.length > 0);
        
      if (isMaxCountsReached && !overrideFinalized) {
        return res.status(400).json({ error: "Sessão já finalizada." });
      }
    }

    const formattedItems = (Array.isArray(items) ? items : []).map((it: any) => ({
      ean: String(it.ean || it.barcode || it.codigoBarras || it.codBarras || it.sap || "").trim(),
      sap: String(it.sap || it.codigo || "").trim(),
      descricao: String(it.descricao || it.description || it.nome || "PRODUTO").trim(),
      quantidade: Math.max(0, Number(it.quantidade || it.qtd || it.quant || it.quantity || 1)),
      timestamp: it.timestamp || new Date().toISOString(),
      operatorId: it.operatorId || operatorId || "COLETOR",
      operatorName: it.operatorName || operatorName || "OPERADOR"
    })).filter((it: any) => it.quantidade > 0 || it.ean);

    const novaContagem = {
      operatorId: operatorId || "COLETOR",
      operatorName: operatorName || "OPERADOR",
      collectorNumber: collectorNumber || "99",
      startTime: startTime || new Date().toISOString(),
      endTime: endTime || new Date().toISOString(),
      transmitTime: new Date().toISOString(),
      items: formattedItems
    };

    if (compara) {
      if (!Array.isArray(section.contagens)) section.contagens = [];
      section.contagens.push(novaContagem);
      
      // Limpa shadowAudit obsoleto quando nova contagem real de coletor é recebida
      if (section.shadowAudit) {
        delete section.shadowAudit;
      }

      if (section.contagens.length >= 2) {
        const cLatest = novaContagem;
        const mapLatest: Record<string, number> = {};
        (cLatest.items || []).forEach((it: any) => {
          const raw = String(it.ean || it.barcode || it.codigoBarras || it.codBarras || it.sap || "").trim();
          const key = raw.replace(/^0+/, "") || raw || "ITEM";
          mapLatest[key] = (mapLatest[key] || 0) + Math.max(0, Number(it.quantidade) || 0);
        });
        const totalLatest = Object.values(mapLatest).reduce((a, b) => a + b, 0);
        const keysLatest = Object.keys(mapLatest);

        let matchFound = false;

        // Compara com todas as contagens anteriores
        for (let i = 0; i < section.contagens.length - 1; i++) {
          const cPrev = section.contagens[i];
          const mapPrev: Record<string, number> = {};
          (cPrev.items || []).forEach((it: any) => {
            const raw = String(it.ean || it.barcode || it.codigoBarras || it.codBarras || it.sap || "").trim();
            const key = raw.replace(/^0+/, "") || raw || "ITEM";
            mapPrev[key] = (mapPrev[key] || 0) + Math.max(0, Number(it.quantidade) || 0);
          });
          const totalPrev = Object.values(mapPrev).reduce((a, b) => a + b, 0);
          
          let isMatch = (totalPrev === totalLatest && totalLatest > 0);
          if (isMatch) {
            const keysPrev = Object.keys(mapPrev);
            if (keysPrev.length !== keysLatest.length) {
              isMatch = false;
            } else {
              for (const key of keysPrev) {
                if (mapPrev[key] !== mapLatest[key]) {
                  isMatch = false;
                  break;
                }
              }
            }
          }

          if (isMatch) {
            matchFound = true;
            break; // Se achou um match, não precisa olhar os outros
          }
        }
        
        section.status = matchFound ? "CONFERIDO_OK" : "DIVERGENTE";
      } else {
        section.status = "CONTADO";
      }
    } else {
      section.contagens = [novaContagem];
      section.status = "CONTADO";
    }
    section.finalizado = true;

    try {
      await db.update(inventories).set({ sectors: sectorsList }).where(eq(inventories.id, inventoryId));
    } catch (dbErr) {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i: any) => i.id === inventoryId);
      if (inv) {
        inv.sectors = sectorsList;
        await writeDb(dbJson);
      }
    }

    recentTransmissions.unshift({
      timestamp: new Date().toISOString(),
      inventoryId,
      sectorName: sector.nome,
      sectionCode,
      operatorName: novaContagem.operatorName,
      itemCount: formattedItems.reduce((acc: number, item: any) => acc + item.quantidade, 0)
    });
    if (recentTransmissions.length > 50) recentTransmissions.pop();

    return res.json({ success: true, count: formattedItems.length, message: "Transmissão registrada com sucesso." });
  } catch (err: any) {
    console.error("Erro no POST /api/collect:", err);
    return res.status(500).json({ error: err.message || "Erro interno ao processar transmissão." });
  } finally {
    mutex.unlock();
  }
});

// -------------------------------------------------------------
// SHADOW AUDIT API
// -------------------------------------------------------------
app.post("/api/inventories/:id/shadow-audit", async (req, res) => {
  const { id } = req.params;
  const mutex = getInventoryMutex(id);
  await mutex.lock();
  try {
    const { sectorId, sectionCode, auditorName, auditQuantity, expectedQuantity } = req.body;
    
    let sectorsList: any[] = [];
    let compara = false;
    let usingDb = true;

    try {
      const invList = await db.select({ sectors: inventories.sectors, compara: inventories.compara }).from(inventories).where(eq(inventories.id, id));
      if (!invList.length) {
        usingDb = false;
      } else {
        sectorsList = invList[0].sectors || [];
        compara = Boolean(invList[0].compara);
      }
    } catch (dbErr) {
      usingDb = false;
    }

    if (!usingDb) {
      const { readDb } = require('./db_helper');
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i: any) => i.id === id);
      if (!inv) return res.status(404).json({ error: "Inventário não encontrado" });
      sectorsList = inv.sectors || [];
      compara = Boolean(inv.compara);
    }
    
    const sector = sectorsList.find((s: any) => s.id === sectorId);
    if (!sector) return res.status(404).json({ error: "Setor não encontrado" });
    let section = (sector.sections || []).find((s: any) => s.code === sectionCode);
    if (!section) return res.status(404).json({ error: "Seção não encontrada" });

    let totalCollected = 0;
    if (section.contagens && section.contagens.length > 0) {
      if (compara) {
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
      section.finalizado = true;
    } else {
      section.status = "DIVERGENTE";
      // Mantém a seção aberta para novas recontagens ou correções
      section.finalizado = false;
    }

    if (usingDb) {
      try {
        await db.update(inventories).set({ sectors: sectorsList }).where(eq(inventories.id, id));
      } catch (upErr) {
        const { readDb, writeDb } = require('./db_helper');
        const dbJson = await readDb();
        const invIndex = (dbJson.inventories || []).findIndex((i: any) => i.id === id);
        if (invIndex !== -1) {
          dbJson.inventories[invIndex].sectors = sectorsList;
          await writeDb(dbJson);
        }
      }
    } else {
      const { readDb, writeDb } = require('./db_helper');
      const dbJson = await readDb();
      const invIndex = (dbJson.inventories || []).findIndex((i: any) => i.id === id);
      if (invIndex !== -1) {
        dbJson.inventories[invIndex].sectors = sectorsList;
        await writeDb(dbJson);
      }
    }

    return res.json({ 
      success: true, 
      isMatch, 
      status: section.status, 
      auditQuantity: auditQty, 
      collectedQuantity: finalExpected,
      sectorId: sector.id,
      sectorName: sector.nome,
      sectionCode: section.code
    });
  } catch (err: any) {
    console.error("Erro no shadow-audit:", err);
    return res.status(500).json({ error: err.message || "Erro ao registrar recontagem." });
  } finally {
    mutex.unlock();
  }
});

// JSON fallback for unknown /api routes to prevent HTML 404 pages

// --- BACKUP & RESTORE ---
app.get("/api/inventories/:id/backup", async (req, res) => {
  const inventoryId = req.params.id;
  try {
    const invs = await db.select().from(inventories).where(eq(inventories.id, inventoryId));
    if (invs.length === 0) {
      return res.status(404).json({ error: "Inventário não encontrado." });
    }
    const inv = invs[0];

    const prods = await db.select().from(products).where(eq(products.inventoryId, inventoryId));
    const addrs = await db.select().from(addresses).where(eq(addresses.inventoryId, inventoryId));

    res.json({
      inventory: inv,
      products: prods,
      addresses: addrs
    });
  } catch (err) {
    try {
      const { readDb } = require('./db_helper');
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find(i => i.id === inventoryId);
      if (!inv) {
        return res.status(404).json({ error: "Inventário não encontrado." });
      }
      res.json({
        inventory: inv,
        products: inv.products || [],
        addresses: inv.addresses || []
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
});

app.post("/api/inventories/restore", async (req, res) => {
  const { inventory, products: prods, addresses: addrs } = req.body;
  if (!inventory) return res.status(400).json({ error: "Dados inválidos." });

  const newId = "inv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  
  const invData = {
    id: newId,
    nome: (inventory.nome || 'Backup') + ' (Restaurado)',
    filial: inventory.filial,
    dataExecucao: inventory.dataExecucao,
    dataEdicao: new Date().toISOString(),
    status: inventory.status,
    tipoContagem: inventory.tipoContagem,
    coletaPallets: inventory.coletaPallets,
    permissaoColeta: inventory.permissaoColeta,
    compara: inventory.compara ? true : false,
    comparaViaLink: inventory.comparaViaLink ? true : false,
    coordenador: inventory.coordenador,
    gerente: inventory.gerente,
    inicioEstoque: inventory.inicioEstoque,
    terminoEstoque: inventory.terminoEstoque,
    inicioLoja: inventory.inicioLoja,
    terminoLoja: inventory.terminoLoja,
    inicioDivergencia: inventory.inicioDivergencia,
    terminoDivergencia: inventory.terminoDivergencia,
    assinaturaGerente: inventory.assinaturaGerente,
    assinaturaCoordenador: inventory.assinaturaCoordenador,
    sectors: inventory.sectors || [],
    totalProductsCount: inventory.totalProductsCount || 0,
    totalAddressesCount: inventory.totalAddressesCount || 0,
    totalEstoque: inventory.totalEstoque || 0,
    totalPrecoCusto: inventory.totalPrecoCusto || 0,
    totalDepartamentos: inventory.totalDepartamentos || 0,
    clientBaseName: inventory.clientBaseName
  };

  try {
    await db.insert(inventories).values(invData);

    if (prods && prods.length > 0) {
      const prodsToInsert = prods.map(p => ({
        inventoryId: newId,
        ean: p.ean,
        sap: p.sap,
        descricao: p.descricao,
        estoque: p.estoque,
        precoCusto: p.precoCusto,
        departamento: p.departamento
      }));
      for (let i = 0; i < prodsToInsert.length; i += 1000) {
        await db.insert(products).values(prodsToInsert.slice(i, i + 1000));
      }
    }

    if (addrs && addrs.length > 0) {
      const addrsToInsert = addrs.map(a => ({
        inventoryId: newId,
        codigo: a.codigo
      }));
      for (let i = 0; i < addrsToInsert.length; i += 1000) {
        await db.insert(addresses).values(addrsToInsert.slice(i, i + 1000));
      }
    }

    res.json({ success: true, newId });
  } catch (err) {
    try {
      const { readDb, writeDb } = require('./db_helper');
      const dbJson = await readDb();
      (invData as any).products = prods || [];
      (invData as any).addresses = addrs || [];
      if (!dbJson.inventories) dbJson.inventories = [];
      dbJson.inventories.push(invData);
      await writeDb(dbJson);
      res.json({ success: true, newId });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
});

app.all("/api/*", (req, res) => {
  res.status(404).json({
    error: `Endpoint da API não encontrado: ${req.method} ${req.originalUrl}. Verifique se o servidor backend foi compilado (npm run build) e o PM2 reiniciado (pm2 restart all).`
  });
});

// Vite middleware for development & serve dist in production
const distPath = fsSync.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
  ? path.join(process.cwd(), 'dist')
  : path.join(process.cwd(), 'dist_pronto');
const hasDistIndex = fsSync.existsSync(path.join(distPath, 'index.html'));
const isProduction = process.env.NODE_ENV === "production" || (hasDistIndex && process.env.NODE_ENV !== "development");

async function startServer() {
  try {
    await initDatabase();
  } catch (dbErr) {
    console.warn("Aviso: Falha ao inicializar o banco MySQL (Drizzle), o servidor iniciará usando fallback de JSON local:", dbErr);
  }

  // Forçar download de arquivos de atualização para o navegador não abrir como texto
  app.get(['/UPDATE*', '/download-update'], (req, res, next) => {
    const filename = req.path.replace(/^\//, '') || 'UPDATE_V3_OFFLINE.tar.gz';
    if (!filename.endsWith('.tar.gz') && !filename.endsWith('.zip')) {
      return next();
    }
    const filePath = path.join(process.cwd(), filename);
    if (fsSync.existsSync(filePath)) {
      return res.download(filePath, filename);
    }
    const publicPath = path.join(process.cwd(), 'public', filename);
    if (fsSync.existsSync(publicPath)) {
      return res.download(publicPath, filename);
    }
    const distPathFile = path.join(process.cwd(), 'dist', filename);
    if (fsSync.existsSync(distPathFile)) {
      return res.download(distPathFile, filename);
    }
    return next();
  });

  if (!isProduction) {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (vErr) {
      console.warn("Vite middleware error (falling back to static serving if available):", vErr);
    }
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'})`);
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n❌ ERRO: A porta ${PORT} já está sendo usada por outro processo.`);
    } else {
      console.error("Erro no servidor:", err);
    }
  });
}

startServer();
