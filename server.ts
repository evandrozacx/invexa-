import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import { db, initDatabase } from "./src/db";
import { companies, operators, devices, inventories, products, addresses } from "./src/db/schema";
import { eq } from "drizzle-orm";

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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/operators", async (req, res) => {
  try {
    const op = req.body;
    if (!op.id) op.id = "op_" + Date.now();
    await db.insert(operators).values({
      id: op.id,
      cpf: op.cpf,
      nomeCompleto: op.nomeCompleto,
      dataNascimento: op.dataNascimento,
      senhaPreenchedores: op.senhaPreenchedores,
      companyId: op.companyId,
      hierarquia: op.hierarquia || null
    }).onDuplicateKeyUpdate({
      set: {
        cpf: op.cpf,
        nomeCompleto: op.nomeCompleto,
        dataNascimento: op.dataNascimento,
        senhaPreenchedores: op.senhaPreenchedores,
        companyId: op.companyId,
        hierarquia: op.hierarquia
      }
    });
    res.json({ success: true, operator: op });
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
    res.status(500).json({ error: err.message });
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
      sectors: inv.sectors || []
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
      sectors: invData[0].sectors || []
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/inventories", async (req, res) => {
  try {
    const inv = req.body;
    if (!inv.id) inv.id = "inv_" + Date.now();
    
    const docData = { ...inv };
    delete docData.products;
    delete docData.addresses;

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
        sectors: inv.sectors || []
      }
    });

    res.json({ success: true, inventory: docData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
// INVENTORIES PRODUCTS AND ADDRESSES
// -------------------------------------------------------------
app.get("/api/inventories/:id/products", async (req, res) => {
  try {
    const { id } = req.params;
    const invData = await db.select({ totalProductsCount: inventories.totalProductsCount }).from(inventories).where(eq(inventories.id, id));
    if (!invData.length) return res.status(404).json({ error: "Not found" });
    
    const prodList = await db.select().from(products).where(eq(products.inventoryId, id));
    res.json({ success: true, count: invData[0].totalProductsCount, products: prodList });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/inventories/:id/addresses", async (req, res) => {
  try {
    const { id } = req.params;
    const invData = await db.select({ totalAddressesCount: inventories.totalAddressesCount }).from(inventories).where(eq(inventories.id, id));
    if (!invData.length) return res.status(404).json({ error: "Not found" });
    
    const addrList = await db.select().from(addresses).where(eq(addresses.inventoryId, id));
    res.json({ success: true, count: invData[0].totalAddressesCount, addresses: addrList });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
        const dep = String(p.departamento || "GERAL").trim();
        
        totalEstoque += est;
        totalPrecoCusto += (est * pc);
        departamentos.add(dep);

        cleaned.push({
          inventoryId: id,
          ean: String(p.ean || ""),
          sap: String(p.sap || ""),
          descricao: String(p.descricao || "PRODUTO SEM DESCRIÇÃO"),
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
// INVENTORIES SECTORS & SECTIONS
// -------------------------------------------------------------
app.post("/api/inventories/:id/manage-section", async (req, res) => {
  try {
    const { id } = req.params;
    const { sectorId, sectionCode, sectionCodes, action, items, operatorId, operatorName } = req.body;
    
    const invList = await db.select({ sectors: inventories.sectors }).from(inventories).where(eq(inventories.id, id));
    if (!invList.length) return res.status(404).json({ error: "Not found" });
    
    let sectorsList: any[] = invList[0].sectors || [];
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
          if(!sector.sections) sector.sections = [];
          sector.sections.push({ code: sectionCode, status: "NAO_INICIADO", contagens: [], finalizado: false });
        }
      }
    }
    
    await db.update(inventories).set({ sectors: sectorsList }).where(eq(inventories.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/inventories/:id/sectors", async (req, res) => {
  try {
    const { id } = req.params;
    const { action, sectorId, nome, nomeStart, numeroStart, numeroEnd, rangeStart, rangeEnd } = req.body;
    const invList = await db.select({ sectors: inventories.sectors }).from(inventories).where(eq(inventories.id, id));
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
    
    await db.update(inventories).set({ sectors: sectorsList }).where(eq(inventories.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// COLLECTION API
// -------------------------------------------------------------
app.post("/api/collect", async (req, res) => {
  try {
    const { inventoryId, sectorId, sectionCode, operatorId, operatorName, collectorNumber, items, startTime, endTime } = req.body;
    
    const invList = await db.select({ sectors: inventories.sectors, compara: inventories.compara }).from(inventories).where(eq(inventories.id, inventoryId));
    if (!invList.length) return res.status(404).json({ error: "Inventory not found" });
    
    const sectorsList: any[] = invList[0].sectors || [];
    const compara = invList[0].compara;
    const sector = sectorsList.find((s: any) => s.id === sectorId);
    if (!sector) return res.status(404).json({ error: "Sector not found" });
    
    let section = (sector.sections || []).find((s: any) => s.code === sectionCode);
    if (!section) {
      if(!sector.sections) sector.sections = [];
      section = { code: sectionCode, status: "NAO_INICIADO", contagens: [], finalizado: false };
      sector.sections.push(section);
    } else {
      if (section.finalizado) {
        return res.status(400).json({ error: "Sessão já finalizada." });
      }
    }

    const novaContagem = {
      operatorId, operatorName, collectorNumber: collectorNumber || "99",
      startTime, endTime, transmitTime: new Date().toISOString(), items
    };

    if (compara) {
      section.contagens.push(novaContagem);
      section.status = section.contagens.length >= 2 ? "DIVERGENTE" : "CONTADO";
    } else {
      section.contagens = [novaContagem];
      section.status = "CONTADO";
    }
    section.finalizado = true;
    
    await db.update(inventories).set({ sectors: sectorsList }).where(eq(inventories.id, inventoryId));
    
    recentTransmissions.unshift({
      timestamp: new Date().toISOString(),
      inventoryId, sectorName: sector.nome, sectionCode, operatorName, itemCount: items.length
    });
    if (recentTransmissions.length > 50) recentTransmissions.pop();
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// SHADOW AUDIT API
// -------------------------------------------------------------
app.post("/api/inventories/:id/shadow-audit", async (req, res) => {
  try {
    const { id } = req.params;
    const { sectorId, sectionCode, auditorName, auditQuantity, expectedQuantity } = req.body;
    
    const invList = await db.select({ sectors: inventories.sectors, compara: inventories.compara }).from(inventories).where(eq(inventories.id, id));
    if (!invList.length) return res.status(404).json({ error: "Not found" });
    
    let sectorsList: any[] = invList[0].sectors || [];
    const compara = invList[0].compara;
    const sector = sectorsList.find((s: any) => s.id === sectorId);
    if (!sector) return res.status(404).json({ error: "Sector not found" });
    let section = (sector.sections || []).find((s: any) => s.code === sectionCode);
    if (!section) return res.status(404).json({ error: "Section not found" });

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
    } else {
      section.status = "DIVERGENTE";
    }
    section.finalizado = true;

    await db.update(inventories).set({ sectors: sectorsList }).where(eq(inventories.id, id));

    res.json({ 
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
    res.status(500).json({ error: err.message });
  }
});

// Vite middleware for development & serve dist in production
if (process.env.NODE_ENV !== "production") {
  createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  }).then(async vite => {
    await initDatabase();
    app.use(vite.middlewares);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Development Server running on port ${PORT} connected to MySQL (Drizzle)`);
    });
  });
} else {
  initDatabase().then(() => {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Production Server running on port ${PORT} connected to MySQL (Drizzle)`);
    });
  });
}
