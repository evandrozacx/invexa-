const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const backupRoutes = `
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
      invData.products = prods || [];
      invData.addresses = addrs || [];
      if (!dbJson.inventories) dbJson.inventories = [];
      dbJson.inventories.push(invData);
      await writeDb(dbJson);
      res.json({ success: true, newId });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
});

app.all("/api/*", (req, res) => {`;

code = code.replace('app.all("/api/*", (req, res) => {', backupRoutes);
fs.writeFileSync('server.ts', code);
