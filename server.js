var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// db_helper.ts
var db_helper_exports = {};
__export(db_helper_exports, {
  readDb: () => readDb,
  writeDb: () => writeDb
});
async function readDb() {
  try {
    const data = await import_promises.default.readFile(dbPath, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return { companies: [], operators: [], devices: [], inventories: [] };
  }
}
async function writeDb(data) {
  await import_promises.default.writeFile(dbPath, JSON.stringify(data, null, 2), "utf8");
}
var import_promises, import_path, dbPath;
var init_db_helper = __esm({
  "db_helper.ts"() {
    import_promises = __toESM(require("fs/promises"), 1);
    import_path = __toESM(require("path"), 1);
    dbPath = import_path.default.join(process.cwd(), "db.json");
  }
});

// server.ts
var import_config2 = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_promises2 = __toESM(require("fs/promises"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");

// src/db/index.ts
var import_config = require("dotenv/config");
var import_mysql2 = require("drizzle-orm/mysql2");
var import_promise = __toESM(require("mysql2/promise"), 1);

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  addresses: () => addresses,
  addressesRelations: () => addressesRelations,
  companies: () => companies,
  devices: () => devices,
  importedBases: () => importedBases,
  inventories: () => inventories,
  operators: () => operators,
  products: () => products,
  productsRelations: () => productsRelations,
  users: () => users
});
var import_drizzle_orm = require("drizzle-orm");
var import_mysql_core = require("drizzle-orm/mysql-core");
var users = (0, import_mysql_core.mysqlTable)("users", {
  id: (0, import_mysql_core.serial)("id").primaryKey(),
  uid: (0, import_mysql_core.varchar)("uid", { length: 255 }).notNull().unique(),
  // Firebase Auth UID
  email: (0, import_mysql_core.varchar)("email", { length: 255 }).notNull(),
  createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
});
var companies = (0, import_mysql_core.mysqlTable)("companies", {
  id: (0, import_mysql_core.varchar)("id", { length: 255 }).primaryKey(),
  cnpj: (0, import_mysql_core.varchar)("cnpj", { length: 255 }).notNull(),
  razaoSocial: (0, import_mysql_core.varchar)("razao_social", { length: 255 }).notNull(),
  nomeFantasia: (0, import_mysql_core.varchar)("nome_fantasia", { length: 255 }).notNull(),
  logotipo: (0, import_mysql_core.varchar)("logotipo", { length: 255 }),
  parcerias: (0, import_mysql_core.json)("parcerias").$type()
});
var operators = (0, import_mysql_core.mysqlTable)("operators", {
  id: (0, import_mysql_core.varchar)("id", { length: 255 }).primaryKey(),
  cpf: (0, import_mysql_core.varchar)("cpf", { length: 255 }).notNull(),
  nomeCompleto: (0, import_mysql_core.varchar)("nome_completo", { length: 255 }).notNull(),
  dataNascimento: (0, import_mysql_core.varchar)("data_nascimento", { length: 255 }).notNull(),
  senhaPreenchedores: (0, import_mysql_core.varchar)("senha_preenchedores", { length: 255 }).notNull(),
  companyId: (0, import_mysql_core.varchar)("company_id", { length: 255 }).notNull(),
  hierarquia: (0, import_mysql_core.varchar)("hierarquia", { length: 255 })
});
var devices = (0, import_mysql_core.mysqlTable)("devices", {
  id: (0, import_mysql_core.varchar)("id", { length: 255 }).primaryKey(),
  nomeFantasia: (0, import_mysql_core.varchar)("nome_fantasia", { length: 255 }).notNull(),
  companyId: (0, import_mysql_core.varchar)("company_id", { length: 255 }).notNull(),
  lastActive: (0, import_mysql_core.varchar)("last_active", { length: 255 }).notNull()
});
var inventories = (0, import_mysql_core.mysqlTable)("inventories", {
  id: (0, import_mysql_core.varchar)("id", { length: 255 }).primaryKey(),
  nome: (0, import_mysql_core.varchar)("nome", { length: 255 }).notNull(),
  filial: (0, import_mysql_core.varchar)("filial", { length: 255 }),
  dataExecucao: (0, import_mysql_core.varchar)("data_execucao", { length: 255 }),
  dataEdicao: (0, import_mysql_core.varchar)("data_edicao", { length: 255 }),
  status: (0, import_mysql_core.varchar)("status", { length: 255 }),
  tipoContagem: (0, import_mysql_core.varchar)("tipo_contagem", { length: 255 }),
  coletaPallets: (0, import_mysql_core.varchar)("coleta_pallets", { length: 255 }),
  permissaoColeta: (0, import_mysql_core.varchar)("permissao_coleta", { length: 255 }),
  compara: (0, import_mysql_core.boolean)("compara").default(false),
  comparaViaLink: (0, import_mysql_core.boolean)("compara_via_link").default(false),
  coordenador: (0, import_mysql_core.varchar)("coordenador", { length: 255 }),
  gerente: (0, import_mysql_core.varchar)("gerente", { length: 255 }),
  inicioEstoque: (0, import_mysql_core.varchar)("inicio_estoque", { length: 255 }),
  terminoEstoque: (0, import_mysql_core.varchar)("termino_estoque", { length: 255 }),
  inicioLoja: (0, import_mysql_core.varchar)("inicio_loja", { length: 255 }),
  terminoLoja: (0, import_mysql_core.varchar)("termino_loja", { length: 255 }),
  inicioDivergencia: (0, import_mysql_core.varchar)("inicio_divergencia", { length: 255 }),
  terminoDivergencia: (0, import_mysql_core.varchar)("termino_divergencia", { length: 255 }),
  assinaturaGerente: (0, import_mysql_core.varchar)("assinatura_gerente", { length: 255 }),
  assinaturaCoordenador: (0, import_mysql_core.varchar)("assinatura_coordenador", { length: 255 }),
  sectors: (0, import_mysql_core.json)("sectors").$type(),
  // Stores Sector[] containing Section[] and counts
  totalProductsCount: (0, import_mysql_core.int)("total_products_count").default(0),
  totalAddressesCount: (0, import_mysql_core.int)("total_addresses_count").default(0),
  totalEstoque: (0, import_mysql_core.double)("total_estoque").default(0),
  totalPrecoCusto: (0, import_mysql_core.double)("total_preco_custo").default(0),
  totalDepartamentos: (0, import_mysql_core.int)("total_departamentos").default(0),
  clientBaseName: (0, import_mysql_core.varchar)("client_base_name", { length: 255 })
});
var importedBases = (0, import_mysql_core.mysqlTable)("imported_bases", {
  id: (0, import_mysql_core.varchar)("id", { length: 255 }).primaryKey(),
  clientName: (0, import_mysql_core.varchar)("client_name", { length: 255 }).notNull(),
  fileName: (0, import_mysql_core.varchar)("file_name", { length: 255 }).notNull(),
  importDate: (0, import_mysql_core.varchar)("import_date", { length: 255 }).notNull(),
  totalProducts: (0, import_mysql_core.int)("total_products").default(0),
  totalEstoque: (0, import_mysql_core.double)("total_estoque").default(0),
  totalPrecoCusto: (0, import_mysql_core.double)("total_preco_custo").default(0),
  totalDepartamentos: (0, import_mysql_core.int)("total_departamentos").default(0),
  products: (0, import_mysql_core.json)("products").$type()
});
var products = (0, import_mysql_core.mysqlTable)("products", {
  id: (0, import_mysql_core.serial)("id").primaryKey(),
  inventoryId: (0, import_mysql_core.varchar)("inventory_id", { length: 255 }).notNull(),
  ean: (0, import_mysql_core.varchar)("ean", { length: 255 }),
  sap: (0, import_mysql_core.varchar)("sap", { length: 255 }),
  descricao: (0, import_mysql_core.varchar)("descricao", { length: 255 }),
  estoque: (0, import_mysql_core.double)("estoque"),
  precoCusto: (0, import_mysql_core.double)("preco_custo"),
  departamento: (0, import_mysql_core.varchar)("departamento", { length: 255 })
}, (table) => ({
  inventoryIdIdx: (0, import_mysql_core.index)("idx_products_inventory_id").on(table.inventoryId),
  eanIdx: (0, import_mysql_core.index)("idx_products_ean").on(table.ean),
  sapIdx: (0, import_mysql_core.index)("idx_products_sap").on(table.sap)
}));
var addresses = (0, import_mysql_core.mysqlTable)("addresses", {
  id: (0, import_mysql_core.serial)("id").primaryKey(),
  inventoryId: (0, import_mysql_core.varchar)("inventory_id", { length: 255 }).notNull(),
  codigo: (0, import_mysql_core.varchar)("codigo", { length: 255 })
}, (table) => ({
  inventoryIdIdx: (0, import_mysql_core.index)("idx_addresses_inventory_id").on(table.inventoryId)
}));
var productsRelations = (0, import_drizzle_orm.relations)(products, ({ one }) => ({
  inventory: one(inventories, {
    fields: [products.inventoryId],
    references: [inventories.id]
  })
}));
var addressesRelations = (0, import_drizzle_orm.relations)(addresses, ({ one }) => ({
  inventory: one(inventories, {
    fields: [addresses.inventoryId],
    references: [inventories.id]
  })
}));

// src/db/index.ts
var createPool = () => {
  if (!global._mysqlPool) {
    console.log(`[MySQL] Conectando a host: ${process.env.SQL_HOST || "localhost (n\xE3o definido!)"}, banco: ${process.env.SQL_DB_NAME || "(n\xE3o definido!)"}, usu\xE1rio: ${process.env.SQL_USER || "(n\xE3o definido!)"}`);
    global._mysqlPool = import_promise.default.createPool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      connectionLimit: 10
    });
  }
  return global._mysqlPool;
};
var pool = createPool();
var db = (0, import_mysql2.drizzle)(pool, { mode: "default", schema: schema_exports });
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          uid VARCHAR(255) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS companies (
          id VARCHAR(255) PRIMARY KEY,
          cnpj VARCHAR(255) NOT NULL,
          razao_social VARCHAR(255) NOT NULL,
          nome_fantasia VARCHAR(255) NOT NULL,
          logotipo VARCHAR(255),
          parcerias JSON
        );
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS operators (
          id VARCHAR(255) PRIMARY KEY,
          cpf VARCHAR(255) NOT NULL,
          nome_completo VARCHAR(255) NOT NULL,
          data_nascimento VARCHAR(255) NOT NULL,
          senha_preenchedores VARCHAR(255) NOT NULL,
          company_id VARCHAR(255) NOT NULL,
          hierarquia VARCHAR(255)
        );
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS devices (
          id VARCHAR(255) PRIMARY KEY,
          nome_fantasia VARCHAR(255) NOT NULL,
          company_id VARCHAR(255) NOT NULL,
          last_active VARCHAR(255) NOT NULL
        );
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS inventories (
          id VARCHAR(255) PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          filial VARCHAR(255),
          data_execucao VARCHAR(255),
          data_edicao VARCHAR(255),
          status VARCHAR(255),
          tipo_contagem VARCHAR(255),
          coleta_pallets VARCHAR(255),
          permissao_coleta VARCHAR(255),
          compara BOOLEAN DEFAULT FALSE,
          compara_via_link BOOLEAN DEFAULT FALSE,
          coordenador VARCHAR(255),
          gerente VARCHAR(255),
          inicio_estoque VARCHAR(255),
          termino_estoque VARCHAR(255),
          inicio_loja VARCHAR(255),
          termino_loja VARCHAR(255),
          inicio_divergencia VARCHAR(255),
          termino_divergencia VARCHAR(255),
          assinatura_gerente VARCHAR(255),
          assinatura_coordenador VARCHAR(255),
          sectors JSON,
          total_products_count INT DEFAULT 0,
          total_addresses_count INT DEFAULT 0,
          total_estoque DOUBLE DEFAULT 0,
          total_preco_custo DOUBLE DEFAULT 0,
          total_departamentos INT DEFAULT 0,
          client_base_name VARCHAR(255)
        );
      `);
      try {
        await connection.query(`ALTER TABLE inventories ADD COLUMN client_base_name VARCHAR(255)`);
      } catch (e) {
      }
      await connection.query(`
        CREATE TABLE IF NOT EXISTS imported_bases (
          id VARCHAR(255) PRIMARY KEY,
          client_name VARCHAR(255) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          import_date VARCHAR(255) NOT NULL,
          total_products INT DEFAULT 0,
          total_estoque DOUBLE DEFAULT 0,
          total_preco_custo DOUBLE DEFAULT 0,
          total_departamentos INT DEFAULT 0,
          products LONGTEXT
        );
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          inventory_id VARCHAR(255) NOT NULL,
          ean VARCHAR(255),
          sap VARCHAR(255),
          descricao VARCHAR(255),
          estoque DOUBLE,
          preco_custo DOUBLE,
          departamento VARCHAR(255)
        );
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS addresses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          inventory_id VARCHAR(255) NOT NULL,
          codigo VARCHAR(255)
        );
      `);
      const safeAddIndex = async (tableName, indexName, columnsSql) => {
        try {
          await connection.query(`CREATE INDEX ${indexName} ON ${tableName} (${columnsSql})`);
        } catch (e) {
        }
      };
      await safeAddIndex("products", "idx_products_inventory_id", "inventory_id");
      await safeAddIndex("products", "idx_products_ean", "ean(100)");
      await safeAddIndex("products", "idx_products_sap", "sap(100)");
      await safeAddIndex("imported_bases", "idx_imported_bases_client_name", "client_name(100)");
      await safeAddIndex("addresses", "idx_addresses_inventory_id", "inventory_id");
      console.log("Database tables and indexes initialized successfully (MySQL).");
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Failed to initialize database tables:", err);
  }
}

// server.ts
var import_drizzle_orm2 = require("drizzle-orm");
init_db_helper();
var Mutex = class {
  constructor() {
    this.queue = [];
    this.locked = false;
  }
  lock() {
    return new Promise((resolve) => {
      if (this.locked) {
        this.queue.push(resolve);
      } else {
        this.locked = true;
        resolve();
      }
    });
  }
  unlock() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.locked = false;
    }
  }
};
var inventoryMutexes = /* @__PURE__ */ new Map();
function getInventoryMutex(id) {
  if (!inventoryMutexes.has(id)) {
    inventoryMutexes.set(id, new Mutex());
  }
  return inventoryMutexes.get(id);
}
var app = (0, import_express.default)();
var PORT = 3e3;
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(import_express.default.json({ limit: "100mb" }));
app.get("/api/download-build", (req, res) => {
  const filePath = import_path2.default.join(process.cwd(), "dist_atualizado.tar.gz");
  if (import_fs.default.existsSync(filePath)) {
    return res.download(filePath, "dist_atualizado.tar.gz");
  }
  return res.status(404).send("Pacote n\xE3o encontrado");
});
app.use(import_express.default.urlencoded({ extended: true, limit: "100mb" }));
app.use(import_express.default.text({ limit: "100mb" }));
var recentTransmissions = [];
app.get("/api/debug/last-transmissions", (req, res) => res.json(recentTransmissions));
app.get(["/api/ping", "/api/health"], (req, res) => {
  res.json({ success: true, status: "OK", online: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
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
      write: false
    });
    const outputFile = result.outputFiles.find((f) => f.path.endsWith(".js") || f.path.endsWith(".cjs") || true);
    let text2 = "";
    if (outputFile) {
      text2 = new TextDecoder().decode(outputFile.contents);
    }
    res.setHeader("Content-Type", "application/javascript");
    res.send(text2 || "// build error");
  } catch (err) {
    res.status(500).send(`// Error building: ${err.message}`);
  }
});
app.get("/api/companies", async (req, res) => {
  try {
    const list = await db.select().from(companies);
    res.json(list);
  } catch (err) {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/operators", async (req, res) => {
  try {
    const list = await db.select().from(operators);
    res.json(list);
  } catch (err) {
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
      senhaPreenchedores,
      companyId: op.companyId || "",
      hierarquia: op.hierarquia || "Inventariante"
    }).onDuplicateKeyUpdate({
      set: {
        cpf: op.cpf || "",
        nomeCompleto: op.nomeCompleto || "",
        dataNascimento: op.dataNascimento || "",
        senhaPreenchedores,
        companyId: op.companyId || "",
        hierarquia: op.hierarquia || "Inventariante"
      }
    });
    res.json({ success: true, operator: { ...op, senhaPreenchedores } });
  } catch (err) {
    console.error("Erro ao salvar operador:", err);
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/operators/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(operators).where((0, import_drizzle_orm2.eq)(operators.id, id));
    res.json({ success: true, message: "Operador exclu\xEDdo com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/companies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(companies).where((0, import_drizzle_orm2.eq)(companies.id, id));
    res.json({ success: true, message: "Empresa exclu\xEDda com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/devices", async (req, res) => {
  try {
    const list = await db.select().from(devices);
    res.json(list);
  } catch (err) {
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
      lastActive: dev.lastActive || (/* @__PURE__ */ new Date()).toISOString()
    }).onDuplicateKeyUpdate({
      set: {
        nomeFantasia: dev.nomeFantasia,
        companyId: dev.companyId,
        lastActive: dev.lastActive
      }
    });
    res.json({ success: true, device: dev });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
function sanitizeSectors(sectorsList) {
  if (!Array.isArray(sectorsList)) return [];
  return sectorsList.map((sec) => ({
    ...sec,
    sections: (sec.sections || []).map((s) => {
      const hasValidItems = Array.isArray(s.contagens) && s.contagens.some(
        (c) => Array.isArray(c?.items) && c.items.some((it) => (Number(it.quantidade) || 0) > 0)
      );
      if (!hasValidItems) {
        return {
          ...s,
          contagens: [],
          status: "NAO_INICIADO",
          finalizado: false,
          shadowAudit: void 0
        };
      }
      return s;
    })
  }));
}
app.get("/api/inventories", async (req, res) => {
  try {
    const list = await db.select().from(inventories);
    res.json(list.map((inv) => ({
      ...inv,
      products: [],
      addresses: [],
      sectors: sanitizeSectors(inv.sectors || [])
    })));
  } catch (err) {
    try {
      const dbJson = await readDb();
      const list = (dbJson.inventories || []).map((inv) => ({
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
    const invData = await db.select().from(inventories).where((0, import_drizzle_orm2.eq)(inventories.id, id));
    if (!invData.length) return res.status(404).json({ error: "Not found" });
    res.json({
      ...invData[0],
      products: [],
      addresses: [],
      sectors: sanitizeSectors(invData[0].sectors || [])
    });
  } catch (err) {
    try {
      const { id } = req.params;
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i) => i.id === id);
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
        nome: inv.nome || "INVENT\xC1RIO NOVO",
        filial: inv.filial || null,
        dataExecucao: inv.dataExecucao || null,
        dataEdicao: (/* @__PURE__ */ new Date()).toISOString(),
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
          dataEdicao: (/* @__PURE__ */ new Date()).toISOString(),
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
          ...inv.sectors !== void 0 ? { sectors: inv.sectors } : {}
        }
      });
    } catch (dbErr) {
      console.warn("MySQL unavailable for POST /api/inventories, falling back to readDb/writeDb:", dbErr);
      const dbJson = await readDb();
      if (!dbJson.inventories) dbJson.inventories = [];
      const idx = dbJson.inventories.findIndex((i) => i.id === inv.id);
      if (idx >= 0) {
        dbJson.inventories[idx] = { ...dbJson.inventories[idx], ...docData };
      } else {
        dbJson.inventories.push(docData);
      }
      await writeDb(dbJson);
    }
    res.json({ success: true, inventory: docData });
  } catch (err) {
    console.error(">>> ERRO AO SALVAR INVENT\xC1RIO:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});
app.delete("/api/inventories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(products).where((0, import_drizzle_orm2.eq)(products.inventoryId, id));
    await db.delete(addresses).where((0, import_drizzle_orm2.eq)(addresses.inventoryId, id));
    await db.delete(inventories).where((0, import_drizzle_orm2.eq)(inventories.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/inventories/:id/products", async (req, res) => {
  const inventoryId = req.params.id;
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const rawLimit = req.query.limit || req.query.pageSize;
  const limit = Math.min(1e4, Math.max(1, parseInt(String(rawLimit || "5000"), 10) || 5e3));
  const offset = req.query.offset !== void 0 ? Math.max(0, parseInt(String(req.query.offset), 10) || 0) : (page - 1) * limit;
  try {
    const [countResult] = await db.select({ count: import_drizzle_orm2.sql`count(*)` }).from(products).where((0, import_drizzle_orm2.eq)(products.inventoryId, inventoryId));
    const total = Number(countResult?.count || 0);
    const items = await db.select({
      ean: products.ean,
      sap: products.sap,
      descricao: products.descricao,
      sector: products.departamento,
      departamento: products.departamento,
      estoque: products.estoque,
      precoCusto: products.precoCusto
    }).from(products).where((0, import_drizzle_orm2.eq)(products.inventoryId, inventoryId)).limit(limit).offset(offset);
    return res.json({
      total,
      page,
      limit,
      products: items.map((p) => ({
        ean: p.ean || "",
        sap: p.sap || "",
        descricao: p.descricao || "",
        sector: p.sector || p.departamento || "",
        departamento: p.departamento || p.sector || "",
        estoque: p.estoque !== null && p.estoque !== void 0 ? Number(p.estoque) : 0,
        precoCusto: p.precoCusto !== null && p.precoCusto !== void 0 ? Number(p.precoCusto) : 0
      }))
    });
  } catch (err) {
    try {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i) => i.id === inventoryId);
      if (!inv) {
        return res.status(404).json({ error: "Invent\xE1rio n\xE3o encontrado." });
      }
      const all = Array.isArray(inv.products) ? inv.products : [];
      const total = all.length || Number(inv.totalProductsCount) || 0;
      const paginated = all.slice(offset, offset + limit);
      return res.json({
        total,
        page,
        limit,
        products: paginated.map((p) => ({
          ean: p.ean || "",
          sap: p.sap || "",
          descricao: p.descricao || "",
          sector: p.sector || p.departamento || "",
          departamento: p.departamento || p.sector || "",
          estoque: p.estoque !== null && p.estoque !== void 0 ? Number(p.estoque) : 0,
          precoCusto: p.precoCusto !== null && p.precoCusto !== void 0 ? Number(p.precoCusto) : 0
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
  const limit = Math.min(1e4, Math.max(1, parseInt(String(rawLimit || "5000"), 10) || 5e3));
  const offset = req.query.offset !== void 0 ? Math.max(0, parseInt(String(req.query.offset), 10) || 0) : (page - 1) * limit;
  try {
    const [countResult] = await db.select({ count: import_drizzle_orm2.sql`count(*)` }).from(addresses).where((0, import_drizzle_orm2.eq)(addresses.inventoryId, inventoryId));
    const total = Number(countResult?.count || 0);
    const items = await db.select({
      id: addresses.id,
      codigo: addresses.codigo
    }).from(addresses).where((0, import_drizzle_orm2.eq)(addresses.inventoryId, inventoryId)).limit(limit).offset(offset);
    return res.json({
      total,
      page,
      limit,
      addresses: items
    });
  } catch (err) {
    try {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i) => i.id === inventoryId);
      if (!inv) {
        return res.status(404).json({ error: "Invent\xE1rio n\xE3o encontrado." });
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
      console.error("Erro na rota de endere\xE7os:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao consultar endere\xE7os." });
    }
  }
});
app.post("/api/inventories/:id/upload-products", async (req, res) => {
  try {
    const { id } = req.params;
    const { products: prodBody } = req.body;
    await db.delete(products).where((0, import_drizzle_orm2.eq)(products.inventoryId, id));
    const cleaned = [];
    const seenKeys = /* @__PURE__ */ new Set();
    let totalEstoque = 0;
    let totalPrecoCusto = 0;
    const departamentos = /* @__PURE__ */ new Set();
    for (const p of prodBody) {
      const key = p.ean ? String(p.ean).trim() : p.sap ? String(p.sap).trim() : p.descricao ? String(p.descricao).trim() : "";
      if (!key) continue;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const est = Number(p.estoque) || 0;
        const pc = Number(p.precoCusto) || 0;
        const dep = String(p.departamento || "").trim();
        totalEstoque += est;
        totalPrecoCusto += est * pc;
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
    const CHUNK_SIZE = 5e3;
    for (let i = 0; i < cleaned.length; i += CHUNK_SIZE) {
      const chunk = cleaned.slice(i, i + CHUNK_SIZE);
      await db.insert(products).values(chunk);
    }
    await db.update(inventories).set({
      totalProductsCount: cleaned.length,
      totalEstoque,
      totalPrecoCusto,
      totalDepartamentos: departamentos.size,
      dataEdicao: (/* @__PURE__ */ new Date()).toISOString()
    }).where((0, import_drizzle_orm2.eq)(inventories.id, id));
    res.json({ success: true, count: cleaned.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/inventories/:id/upload-addresses", async (req, res) => {
  try {
    const { id } = req.params;
    const { addresses: addrBody } = req.body;
    await db.delete(addresses).where((0, import_drizzle_orm2.eq)(addresses.inventoryId, id));
    const cleaned = [];
    const seenKeys = /* @__PURE__ */ new Set();
    for (const a of addrBody) {
      const code = String(a.codigo || a.address || "").trim();
      if (!code) continue;
      if (!seenKeys.has(code)) {
        seenKeys.add(code);
        cleaned.push({
          inventoryId: id,
          codigo: code
        });
      }
    }
    const CHUNK_SIZE = 1e4;
    for (let i = 0; i < cleaned.length; i += CHUNK_SIZE) {
      const chunk = cleaned.slice(i, i + CHUNK_SIZE);
      await db.insert(addresses).values(chunk);
    }
    await db.update(inventories).set({
      totalAddressesCount: cleaned.length,
      dataEdicao: (/* @__PURE__ */ new Date()).toISOString()
    }).where((0, import_drizzle_orm2.eq)(inventories.id, id));
    res.json({ success: true, count: cleaned.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/inventories/:id/:type(products|addresses)", async (req, res) => {
  try {
    const { id, type } = req.params;
    if (type === "products") {
      await db.delete(products).where((0, import_drizzle_orm2.eq)(products.inventoryId, id));
      await db.update(inventories).set({
        totalProductsCount: 0,
        totalEstoque: 0,
        totalPrecoCusto: 0,
        totalDepartamentos: 0,
        dataEdicao: (/* @__PURE__ */ new Date()).toISOString()
      }).where((0, import_drizzle_orm2.eq)(inventories.id, id));
    } else {
      await db.delete(addresses).where((0, import_drizzle_orm2.eq)(addresses.inventoryId, id));
      await db.update(inventories).set({
        totalAddressesCount: 0,
        dataEdicao: (/* @__PURE__ */ new Date()).toISOString()
      }).where((0, import_drizzle_orm2.eq)(inventories.id, id));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var BASES_DIR = import_path2.default.join(process.cwd(), "data", "bases");
async function ensureBasesDir() {
  try {
    await import_promises2.default.mkdir(BASES_DIR, { recursive: true });
  } catch (e) {
  }
}
async function getSavedBasesList() {
  await ensureBasesDir();
  const indexPath = import_path2.default.join(BASES_DIR, "index.json");
  try {
    const data = await import_promises2.default.readFile(indexPath, "utf8");
    return JSON.parse(data);
  } catch (e) {
    try {
      const files = await import_promises2.default.readdir(BASES_DIR);
      const list = [];
      for (const file of files) {
        if (file.endsWith(".json") && file !== "index.json") {
          try {
            const raw = await import_promises2.default.readFile(import_path2.default.join(BASES_DIR, file), "utf8");
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
          } catch (err) {
          }
        }
      }
      await import_promises2.default.writeFile(indexPath, JSON.stringify(list, null, 2), "utf8");
      return list;
    } catch (err) {
      return [];
    }
  }
}
async function saveBasesIndex(list) {
  await ensureBasesDir();
  const indexPath = import_path2.default.join(BASES_DIR, "index.json");
  await import_promises2.default.writeFile(indexPath, JSON.stringify(list, null, 2), "utf8");
}
app.get("/api/imported-bases", async (req, res) => {
  try {
    const list = await getSavedBasesList();
    if (Array.isArray(list) && list.length > 0) {
      return res.json(list);
    }
    try {
      const mysqlList = await db.select({
        id: importedBases.id,
        clientName: importedBases.clientName,
        fileName: importedBases.fileName,
        importDate: importedBases.importDate,
        totalProducts: importedBases.totalProducts,
        totalEstoque: importedBases.totalEstoque,
        totalPrecoCusto: importedBases.totalPrecoCusto,
        totalDepartamentos: importedBases.totalDepartamentos
      }).from(importedBases);
      if (Array.isArray(mysqlList) && mysqlList.length > 0) {
        return res.json(mysqlList);
      }
    } catch (mysqlErr) {
    }
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var SESSIONS_DIR = import_path2.default.join(process.cwd(), "data", "import_sessions");
async function ensureSessionsDir() {
  try {
    await import_promises2.default.mkdir(SESSIONS_DIR, { recursive: true });
  } catch (e) {
  }
}
app.post("/api/imported-bases/start-session", async (req, res) => {
  try {
    await ensureBasesDir();
    await ensureSessionsDir();
    const { clientName, fileName, mode, targetBaseId, activeColumns, checkDuplicates, totalExpectedItems, totalChunks } = req.body;
    if (!clientName || !String(clientName).trim()) {
      return res.status(400).json({ error: "Nome do cliente \xE9 obrigat\xF3rio para iniciar importa\xE7\xE3o." });
    }
    const trimmedClientName = String(clientName).trim();
    let isAppendMode = mode === "append" || Boolean(targetBaseId);
    let existingBaseId = targetBaseId || null;
    if (isAppendMode && !existingBaseId) {
      const currentList = await getSavedBasesList();
      const found = currentList.find((b) => b.clientName.trim().toLowerCase() === trimmedClientName.toLowerCase());
      if (found) {
        existingBaseId = found.id;
      }
    }
    const baseId = existingBaseId || "base_" + Date.now();
    const sessionId = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const sessionPath = import_path2.default.join(SESSIONS_DIR, sessionId);
    await import_promises2.default.mkdir(sessionPath, { recursive: true });
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
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    await import_promises2.default.writeFile(import_path2.default.join(sessionPath, "meta.json"), JSON.stringify(sessionMeta, null, 2), "utf8");
    res.json({
      success: true,
      sessionId,
      baseId,
      mode: sessionMeta.mode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/imported-bases/chunk", async (req, res) => {
  try {
    const { sessionId, chunkIndex, totalChunks, products: products2 } = req.body;
    if (!sessionId || chunkIndex === void 0 || !Array.isArray(products2)) {
      return res.status(400).json({ error: "Dados do lote inv\xE1lidos." });
    }
    const sessionPath = import_path2.default.join(SESSIONS_DIR, sessionId);
    const metaPath = import_path2.default.join(sessionPath, "meta.json");
    try {
      await import_promises2.default.access(metaPath);
    } catch (e) {
      return res.status(404).json({ error: "Sess\xE3o de importa\xE7\xE3o expirada ou n\xE3o encontrada." });
    }
    const chunkFilePath = import_path2.default.join(sessionPath, `chunk_${chunkIndex}.json`);
    await import_promises2.default.writeFile(chunkFilePath, JSON.stringify(products2), "utf8");
    try {
      const rawMeta = await import_promises2.default.readFile(metaPath, "utf8");
      const meta = JSON.parse(rawMeta);
      if (!meta.receivedChunks.includes(chunkIndex)) {
        meta.receivedChunks.push(chunkIndex);
        meta.receivedChunks.sort((a, b) => a - b);
      }
      meta.status = "processing";
      meta.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
      await import_promises2.default.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");
    } catch (e) {
    }
    res.json({
      success: true,
      sessionId,
      chunkIndex,
      receivedCount: products2.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var activeConsolidations = /* @__PURE__ */ new Map();
app.get("/api/imported-bases/session-status/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionPath = import_path2.default.join(SESSIONS_DIR, sessionId);
    const metaPath = import_path2.default.join(sessionPath, "meta.json");
    try {
      const rawMeta = await import_promises2.default.readFile(metaPath, "utf8");
      const meta = JSON.parse(rawMeta);
      const isConsolidating = activeConsolidations.has(sessionId);
      const currentStatus = meta.status === "completed" ? "completed" : isConsolidating ? "finishing" : meta.status || "processing";
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
      const currentList = await getSavedBasesList();
      const found = currentList.find((b) => b.id.includes(sessionId) || b.fileName?.includes(sessionId));
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
      return res.status(404).json({ status: "not_found", error: "Sess\xE3o n\xE3o encontrada." });
    }
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});
app.post("/api/imported-bases/finish-session", async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "ID da sess\xE3o \xE9 obrigat\xF3rio." });
  }
  if (activeConsolidations.has(sessionId)) {
    try {
      const result = await activeConsolidations.get(sessionId);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message || "Erro na consolida\xE7\xE3o da base." });
    }
  }
  const sessionPath = import_path2.default.join(SESSIONS_DIR, sessionId);
  const metaPath = import_path2.default.join(sessionPath, "meta.json");
  let meta = {};
  try {
    const rawMeta = await import_promises2.default.readFile(metaPath, "utf8");
    meta = JSON.parse(rawMeta);
  } catch (e) {
    return res.status(404).json({ error: "Sess\xE3o de importa\xE7\xE3o expirada ou n\xE3o encontrada." });
  }
  if (meta.status === "completed" && meta.result) {
    return res.json(meta.result);
  }
  const consolidationPromise = (async () => {
    meta.status = "finishing";
    meta.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await import_promises2.default.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");
    } catch (e) {
    }
    const { baseId, clientName, fileName, mode, activeColumns, checkDuplicates } = meta;
    let existingProducts = [];
    let existingFileName = "";
    let existingImportDate = "";
    if (mode === "append" && baseId) {
      try {
        const filePath = import_path2.default.join(BASES_DIR, `${baseId}.json`);
        const content = await import_promises2.default.readFile(filePath, "utf8");
        const parsed = JSON.parse(content);
        existingProducts = parsed.products || [];
        existingFileName = parsed.fileName || "";
        existingImportDate = parsed.importDate || "";
      } catch (e) {
      }
    }
    const productMap = /* @__PURE__ */ new Map();
    let duplicateCount = 0;
    let newAddedCount = 0;
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
    existingProducts = [];
    const sessionFiles = await import_promises2.default.readdir(sessionPath);
    const chunkFiles = sessionFiles.filter((f) => /^chunk_\d+\.json$/.test(f)).sort((a, b) => {
      const numA = parseInt(a.replace("chunk_", "").replace(".json", ""), 10) || 0;
      const numB = parseInt(b.replace("chunk_", "").replace(".json", ""), 10) || 0;
      return numA - numB;
    });
    for (const chunkFileName of chunkFiles) {
      const chunkFilePath = import_path2.default.join(sessionPath, chunkFileName);
      try {
        const chunkContent = await import_promises2.default.readFile(chunkFilePath, "utf8");
        const chunkProducts = JSON.parse(chunkContent);
        for (const p of chunkProducts) {
          const eanVal = String(p.ean || "").trim();
          const sapVal = String(p.sap || "").trim();
          const descVal = String(p.descricao || "").trim();
          const est = Number(p.estoque) || 0;
          const pc = Number(p.precoCusto) || 0;
          const dep = String(p.departamento || "").trim();
          const key = checkDuplicates ? eanVal || sapVal || descVal : eanVal + "_" + sapVal + "_" + Math.random().toString(36).slice(2, 7);
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
        console.warn(`[FinishSession] Lote ${chunkFileName} n\xE3o p\xF4de ser lido:`, errChunk);
      }
    }
    const cleaned = Array.from(productMap.values());
    productMap.clear();
    let totalEstoque = 0;
    let totalPrecoCusto = 0;
    const departamentos = /* @__PURE__ */ new Set();
    for (const item of cleaned) {
      totalEstoque += item.estoque;
      totalPrecoCusto += item.estoque * item.precoCusto;
      if (item.departamento) departamentos.add(item.departamento);
    }
    const importDate = (/* @__PURE__ */ new Date()).toISOString();
    const incomingFile = String(fileName || "arquivo.csv").trim();
    let combinedFileName = incomingFile;
    if (existingFileName) {
      const existingParts = existingFileName.split(",").map((s) => s.trim()).filter(Boolean);
      const incomingParts = incomingFile.split(",").map((s) => s.trim()).filter(Boolean);
      const allParts = Array.from(/* @__PURE__ */ new Set([...existingParts, ...incomingParts]));
      combinedFileName = allParts.join(", ");
    }
    const baseSummary = {
      id: baseId,
      clientName,
      fileName: combinedFileName,
      importDate: existingImportDate || importDate,
      lastUpdated: importDate,
      totalProducts: cleaned.length,
      totalEstoque,
      totalPrecoCusto,
      totalDepartamentos: departamentos.size,
      activeColumns: activeColumns || { ean: true, sap: true, descricao: true, estoque: true, precoCusto: true, departamento: true }
    };
    const outPath = import_path2.default.join(BASES_DIR, `${baseId}.json`);
    await new Promise((resolve, reject) => {
      const writeStream = import_fs.default.createWriteStream(outPath, "utf8");
      writeStream.on("error", reject);
      writeStream.on("finish", () => resolve(true));
      const summaryStr = JSON.stringify(baseSummary);
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
          writeStream.once("drain", writeNext);
        } else {
          writeStream.write("]}");
          writeStream.end();
        }
      }
      writeNext();
    });
    const currentList = await getSavedBasesList();
    const updatedList = [baseSummary, ...currentList.filter((b) => b.id !== baseId)];
    await saveBasesIndex(updatedList);
    try {
      for (const chunkFileName of chunkFiles) {
        await import_promises2.default.unlink(import_path2.default.join(sessionPath, chunkFileName)).catch(() => {
        });
      }
    } catch (e) {
    }
    const result = {
      success: true,
      base: baseSummary,
      mode,
      totalProducts: cleaned.length,
      newAddedCount,
      duplicateCount
    };
    try {
      meta.status = "completed";
      meta.result = result;
      meta.completedAt = (/* @__PURE__ */ new Date()).toISOString();
      await import_promises2.default.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");
    } catch (e) {
    }
    return result;
  })();
  activeConsolidations.set(sessionId, consolidationPromise);
  try {
    const result = await consolidationPromise;
    res.json(result);
  } catch (err) {
    try {
      meta.status = "failed";
      meta.error = err.message;
      await import_promises2.default.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");
    } catch (e) {
    }
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
      return res.status(400).json({ error: "Nome do cliente \xE9 obrigat\xF3rio para salvar a base." });
    }
    if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
      return res.status(400).json({ error: "Nenhum produto v\xE1lido encontrado para salvar." });
    }
    const trimmedClientName = String(clientName).trim();
    let isAppendMode = mode === "append" || Boolean(targetBaseId);
    let existingBaseId = targetBaseId || null;
    let existingProducts = [];
    let existingFileName = "";
    let existingImportDate = "";
    if (isAppendMode) {
      if (!existingBaseId) {
        const currentList = await getSavedBasesList();
        const found = currentList.find((b) => b.clientName.trim().toLowerCase() === trimmedClientName.toLowerCase());
        if (found) {
          existingBaseId = found.id;
          existingFileName = found.fileName || "";
          existingImportDate = found.importDate || "";
        }
      }
      if (existingBaseId) {
        try {
          const filePath = import_path2.default.join(BASES_DIR, `${existingBaseId}.json`);
          const content = await import_promises2.default.readFile(filePath, "utf8");
          const parsed = JSON.parse(content);
          existingProducts = parsed.products || [];
          existingFileName = parsed.fileName || existingFileName;
          existingImportDate = parsed.importDate || existingImportDate;
        } catch (e) {
        }
        if (existingProducts.length === 0) {
          try {
            const rows = await db.select().from(importedBases).where((0, import_drizzle_orm2.eq)(importedBases.id, existingBaseId));
            if (rows && rows.length > 0) {
              const row = rows[0];
              existingProducts = Array.isArray(row.products) ? row.products : typeof row.products === "string" ? JSON.parse(row.products) : [];
              existingFileName = row.fileName || existingFileName;
              existingImportDate = row.importDate || existingImportDate;
            }
          } catch (e) {
          }
        }
      }
    }
    const productMap = /* @__PURE__ */ new Map();
    let duplicateCount = 0;
    let newAddedCount = 0;
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
    for (const p of rawProducts) {
      const key = p.ean ? String(p.ean).trim() : p.sap ? String(p.sap).trim() : p.descricao ? String(p.descricao).trim() : "";
      if (!key) continue;
      const est = Number(p.estoque) || 0;
      const pc = Number(p.precoCusto) || 0;
      const dep = String(p.departamento || "").trim();
      if (productMap.has(key)) {
        duplicateCount++;
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
    const departamentos = /* @__PURE__ */ new Set();
    for (const item of cleaned) {
      totalEstoque += item.estoque;
      totalPrecoCusto += item.estoque * item.precoCusto;
      if (item.departamento) departamentos.add(item.departamento);
    }
    const baseId = existingBaseId || "base_" + Date.now();
    const importDate = (/* @__PURE__ */ new Date()).toISOString();
    const incomingFile = String(fileName || "arquivo.csv").trim();
    let combinedFileName = incomingFile;
    if (existingFileName) {
      const existingParts = existingFileName.split(",").map((s) => s.trim()).filter(Boolean);
      const incomingParts = incomingFile.split(",").map((s) => s.trim()).filter(Boolean);
      const allParts = Array.from(/* @__PURE__ */ new Set([...existingParts, ...incomingParts]));
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
    try {
      await import_promises2.default.writeFile(import_path2.default.join(BASES_DIR, `${baseId}.json`), JSON.stringify(fullBaseData), "utf8");
      const currentList = await getSavedBasesList();
      const updatedList = [baseSummary, ...currentList.filter((b) => b.id !== baseId)];
      await saveBasesIndex(updatedList);
    } catch (fsErr) {
      console.warn("[Disk] Erro ao salvar c\xF3pia em arquivo:", fsErr);
    }
    try {
      const existingDbRows = await db.select().from(importedBases).where((0, import_drizzle_orm2.eq)(importedBases.id, baseId));
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
        }).where((0, import_drizzle_orm2.eq)(importedBases.id, baseId));
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/imported-bases/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : void 0;
    try {
      const filePath = import_path2.default.join(BASES_DIR, `${id}.json`);
      const raw = await import_promises2.default.readFile(filePath, "utf8");
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
    } catch (fileErr) {
    }
    try {
      const rows = await db.select().from(importedBases).where((0, import_drizzle_orm2.eq)(importedBases.id, id));
      if (rows && rows.length > 0) {
        const row = rows[0];
        const allProds = Array.isArray(row.products) ? row.products : typeof row.products === "string" ? JSON.parse(row.products) : [];
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
    } catch (mysqlErr) {
    }
    res.status(404).json({ error: "Base do cliente n\xE3o encontrada." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/imported-bases/:id", async (req, res) => {
  try {
    const { id } = req.params;
    try {
      await db.delete(importedBases).where((0, import_drizzle_orm2.eq)(importedBases.id, id));
    } catch (mysqlErr) {
    }
    const filePath = import_path2.default.join(BASES_DIR, `${id}.json`);
    try {
      await import_promises2.default.unlink(filePath);
    } catch (e) {
    }
    const currentList = await getSavedBasesList();
    const updatedList = currentList.filter((b) => b.id !== id);
    await saveBasesIndex(updatedList);
    res.json({ success: true, message: "Base exclu\xEDda com sucesso." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/inventories/:id/apply-base/:baseId", async (req, res) => {
  try {
    const { id, baseId } = req.params;
    let baseData = null;
    try {
      const rows = await db.select().from(importedBases).where((0, import_drizzle_orm2.eq)(importedBases.id, baseId));
      if (rows && rows.length > 0) {
        const row = rows[0];
        baseData = {
          ...row,
          products: Array.isArray(row.products) ? row.products : typeof row.products === "string" ? JSON.parse(row.products) : []
        };
      }
    } catch (e) {
    }
    if (!baseData) {
      const filePath = import_path2.default.join(BASES_DIR, `${baseId}.json`);
      const raw = await import_promises2.default.readFile(filePath, "utf8");
      baseData = JSON.parse(raw);
    }
    const baseProducts = baseData.products || [];
    let appliedCount = baseProducts.length;
    let appliedEstoque = Number(baseData.totalEstoque) || 0;
    let appliedPrecoCusto = Number(baseData.totalPrecoCusto) || 0;
    let appliedDeptos = Number(baseData.totalDepartamentos) || 0;
    if (appliedEstoque === 0 || appliedPrecoCusto === 0) {
      for (const p of baseProducts) {
        const est = Number(p.estoque) || 0;
        appliedEstoque += est;
        appliedPrecoCusto += est * (Number(p.precoCusto) || 0);
      }
    }
    try {
      await db.delete(products).where((0, import_drizzle_orm2.eq)(products.inventoryId, id));
      const chunkInsert = baseProducts.map((p) => ({
        inventoryId: id,
        ean: String(p.ean || "").slice(0, 255),
        sap: String(p.sap || "").slice(0, 255),
        descricao: String(p.descricao || "").slice(0, 255),
        estoque: Number(p.estoque) || 0,
        precoCusto: Number(p.precoCusto) || 0,
        departamento: String(p.departamento || "").slice(0, 255)
      }));
      const CHUNK_SIZE = 1e3;
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
        dataEdicao: (/* @__PURE__ */ new Date()).toISOString()
      }).where((0, import_drizzle_orm2.eq)(inventories.id, id));
    } catch (sqlErr) {
      console.warn("MySQL insert failed or timed out for products, updating inventories table directly:", sqlErr);
      try {
        await db.update(inventories).set({
          totalProductsCount: appliedCount,
          totalEstoque: appliedEstoque,
          totalPrecoCusto: appliedPrecoCusto,
          totalDepartamentos: appliedDeptos,
          clientBaseName: baseData.clientName,
          dataEdicao: (/* @__PURE__ */ new Date()).toISOString()
        }).where((0, import_drizzle_orm2.eq)(inventories.id, id));
      } catch (err2) {
        console.error("Error updating inventory metadata:", err2);
      }
    }
    try {
      const dbJson = await readDb();
      if (Array.isArray(dbJson.inventories)) {
        const invIndex = dbJson.inventories.findIndex((inv) => inv.id === id);
        if (invIndex >= 0) {
          dbJson.inventories[invIndex].totalProductsCount = appliedCount;
          dbJson.inventories[invIndex].totalEstoque = appliedEstoque;
          dbJson.inventories[invIndex].totalPrecoCusto = appliedPrecoCusto;
          dbJson.inventories[invIndex].totalDepartamentos = appliedDeptos;
          dbJson.inventories[invIndex].clientBaseName = baseData.clientName;
          dbJson.inventories[invIndex].dataEdicao = (/* @__PURE__ */ new Date()).toISOString();
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/inventories/:id/manage-section", async (req, res) => {
  try {
    const { id } = req.params;
    const { sectorId, sectionCode, sectionCodes, action, items, operatorId, operatorName } = req.body;
    let sectorsList = [];
    try {
      const invList = await db.select({ sectors: inventories.sectors }).from(inventories).where((0, import_drizzle_orm2.eq)(inventories.id, id));
      if (invList.length) {
        sectorsList = invList[0].sectors || [];
      }
    } catch (dbErr) {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i) => i.id === id);
      if (inv) sectorsList = inv.sectors || [];
    }
    if (!sectorsList.length) {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i) => i.id === id);
      if (inv) sectorsList = inv.sectors || [];
    }
    const sector = sectorsList.find((s) => s.id === sectorId);
    if (!sector) return res.status(404).json({ error: "Sector not found" });
    if (action === "delete_multiple" || action === "delete" && Array.isArray(sectionCodes)) {
      const targets = new Set((sectionCodes || []).map((c) => String(c).toUpperCase().trim()));
      sector.sections = (sector.sections || []).filter((s) => !targets.has(String(s.code).toUpperCase().trim()));
    } else if (action === "add_multiple" || action === "add" && Array.isArray(sectionCodes)) {
      const existingCodes = new Set((sector.sections || []).map((s) => String(s.code).toUpperCase().trim()));
      const codesToAdd = (sectionCodes || []).map((c) => String(c).trim()).filter(Boolean);
      if (!sector.sections) sector.sections = [];
      codesToAdd.forEach((code) => {
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
      sector.sections.sort((a, b) => {
        const numA = parseInt(a.code, 10);
        const numB = parseInt(b.code, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return String(a.code).localeCompare(String(b.code));
      });
    } else {
      let section = (sector.sections || []).find((s) => s.code === sectionCode);
      if (!section && action !== "add") return res.status(404).json({ error: "Section not found" });
      if (action === "clear" || action === "clear_all_counts") {
        if (section) {
          section.contagens = [];
          section.status = "NAO_INICIADO";
          section.finalizado = false;
          if (section.shadowAudit) section.shadowAudit = void 0;
        }
      } else if (action === "delete") {
        sector.sections = (sector.sections || []).filter((s) => s.code !== sectionCode);
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
          const validItems = rawItems.map((it) => ({ ...it, quantidade: Number(it.quantidade) || 0 })).filter((it) => it.quantidade > 0);
          if (validItems.length === 0) {
            section.contagens = [];
            section.status = "NAO_INICIADO";
            section.finalizado = false;
            if (section.shadowAudit) section.shadowAudit = void 0;
          } else {
            const manualContagem = {
              operatorId: operatorId || section.contagens[0]?.operatorId || "coordenador",
              operatorName: operatorName || section.contagens[0]?.operatorName || "COORDENADOR",
              startTime: section.contagens[0]?.startTime || (/* @__PURE__ */ new Date()).toISOString(),
              endTime: (/* @__PURE__ */ new Date()).toISOString(),
              transmitTime: section.contagens[0]?.transmitTime || (/* @__PURE__ */ new Date()).toISOString(),
              items: validItems
            };
            section.contagens = [manualContagem];
            section.status = "CONTADO";
            section.finalizado = true;
          }
        }
      } else if (action === "add") {
        if (!section) {
          if (!sector.sections) sector.sections = [];
          sector.sections.push({ code: sectionCode, status: "NAO_INICIADO", contagens: [], finalizado: false });
        }
      }
    }
    try {
      await db.update(inventories).set({ sectors: sectorsList }).where((0, import_drizzle_orm2.eq)(inventories.id, id));
    } catch (dbErr) {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i) => i.id === id);
      if (inv) {
        inv.sectors = sectorsList;
        await writeDb(dbJson);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/inventories/:id/sectors", async (req, res) => {
  try {
    const { id } = req.params;
    const { action, sectorId, nome, nomeStart, numeroStart, numeroEnd, rangeStart, rangeEnd } = req.body;
    let invList = [];
    try {
      invList = await db.select({ sectors: inventories.sectors }).from(inventories).where((0, import_drizzle_orm2.eq)(inventories.id, id));
    } catch (dbErr) {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i) => i.id === id);
      if (inv) invList = [inv];
    }
    if (!invList.length) return res.status(404).json({ error: "Not found" });
    let sectorsList = invList[0].sectors || [];
    if (action === "delete_sector") {
      sectorsList = sectorsList.filter((s) => s.id !== sectorId);
    } else if (action === "save_sector" || action === "rename_sector") {
      if (sectorId) {
        const existing = sectorsList.find((s) => s.id === sectorId);
        if (existing) {
          const newName = (nome || nomeStart || "").trim().toUpperCase();
          if (newName) existing.nome = newName;
          if (numeroStart !== void 0 && numeroStart !== "") existing.numero = numeroStart;
        }
      } else {
        const nStart = numeroStart ? parseInt(numeroStart) : null;
        const nEnd = numeroEnd ? parseInt(numeroEnd) : nStart;
        const sStartNum = parseInt(rangeStart) || 0;
        const sEndNum = parseInt(rangeEnd) || 0;
        if (nStart !== null && nEnd !== null) {
          for (let n = nStart; n <= nEnd; n++) {
            const generatedSections = [];
            for (let idx = sStartNum; idx <= sEndNum; idx++) {
              generatedSections.push({ code: String(idx).padStart(4, "0"), status: "NAO_INICIADO", contagens: [], finalizado: false });
            }
            const currentName = nStart === nEnd ? nomeStart : `${nomeStart} ${n}`;
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
          const generatedSections = [];
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
      await db.update(inventories).set({ sectors: sectorsList }).where((0, import_drizzle_orm2.eq)(inventories.id, id));
    } catch (dbErr) {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i) => i.id === id);
      if (inv) {
        inv.sectors = sectorsList;
        await writeDb(dbJson);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/collect", async (req, res) => {
  const { inventoryId } = req.body;
  if (!inventoryId) return res.status(400).json({ error: "inventoryId is required" });
  const mutex = getInventoryMutex(inventoryId);
  await mutex.lock();
  try {
    const { sectorId, sectionCode, operatorId, operatorName, collectorNumber, items, startTime, endTime, overrideFinalized } = req.body;
    let sectorsList = [];
    let compara = false;
    let foundInDb = false;
    try {
      const invList = await db.select({ sectors: inventories.sectors, compara: inventories.compara }).from(inventories).where((0, import_drizzle_orm2.eq)(inventories.id, inventoryId));
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
      const inv = (dbJson.inventories || []).find((i) => i.id === inventoryId);
      if (!inv) return res.status(404).json({ error: "Invent\xE1rio n\xE3o encontrado." });
      sectorsList = inv.sectors || [];
      compara = Boolean(inv.compara);
    }
    const sector = sectorsList.find((s) => s.id === sectorId);
    if (!sector) return res.status(404).json({ error: "Setor n\xE3o encontrado." });
    let section = (sector.sections || []).find((s) => s.code === sectionCode);
    if (!section) {
      if (!sector.sections) sector.sections = [];
      section = { code: sectionCode, status: "NAO_INICIADO", contagens: [], finalizado: false };
      sector.sections.push(section);
    } else {
      const isMaxCountsReached = compara ? section.contagens && section.contagens.length >= 2 && section.finalizado : section.finalizado && section.contagens && section.contagens.length > 0;
      if (isMaxCountsReached && !overrideFinalized) {
        return res.status(400).json({ error: "Sess\xE3o j\xE1 finalizada." });
      }
    }
    const formattedItems = (Array.isArray(items) ? items : []).map((it) => ({
      ean: String(it.ean || it.barcode || it.codigoBarras || it.codBarras || it.sap || "").trim(),
      sap: String(it.sap || it.codigo || "").trim(),
      descricao: String(it.descricao || it.description || it.nome || "PRODUTO").trim(),
      quantidade: Math.max(0, Number(it.quantidade || it.qtd || it.quant || it.quantity || 1)),
      timestamp: it.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
      operatorId: it.operatorId || operatorId || "COLETOR",
      operatorName: it.operatorName || operatorName || "OPERADOR"
    })).filter((it) => it.quantidade > 0 || it.ean);
    const novaContagem = {
      operatorId: operatorId || "COLETOR",
      operatorName: operatorName || "OPERADOR",
      collectorNumber: collectorNumber || "99",
      startTime: startTime || (/* @__PURE__ */ new Date()).toISOString(),
      endTime: endTime || (/* @__PURE__ */ new Date()).toISOString(),
      transmitTime: (/* @__PURE__ */ new Date()).toISOString(),
      items: formattedItems
    };
    if (compara) {
      if (!Array.isArray(section.contagens)) section.contagens = [];
      section.contagens.push(novaContagem);
      if (section.shadowAudit) {
        delete section.shadowAudit;
      }
      if (section.contagens.length >= 2) {
        const cLatest = novaContagem;
        const mapLatest = {};
        (cLatest.items || []).forEach((it) => {
          const raw = String(it.ean || it.barcode || it.codigoBarras || it.codBarras || it.sap || "").trim();
          const key = raw.replace(/^0+/, "") || raw || "ITEM";
          mapLatest[key] = (mapLatest[key] || 0) + Math.max(0, Number(it.quantidade) || 0);
        });
        const totalLatest = Object.values(mapLatest).reduce((a, b) => a + b, 0);
        const keysLatest = Object.keys(mapLatest);
        let matchFound = false;
        for (let i = 0; i < section.contagens.length - 1; i++) {
          const cPrev = section.contagens[i];
          const mapPrev = {};
          (cPrev.items || []).forEach((it) => {
            const raw = String(it.ean || it.barcode || it.codigoBarras || it.codBarras || it.sap || "").trim();
            const key = raw.replace(/^0+/, "") || raw || "ITEM";
            mapPrev[key] = (mapPrev[key] || 0) + Math.max(0, Number(it.quantidade) || 0);
          });
          const totalPrev = Object.values(mapPrev).reduce((a, b) => a + b, 0);
          let isMatch = totalPrev === totalLatest && totalLatest > 0;
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
            break;
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
      await db.update(inventories).set({ sectors: sectorsList }).where((0, import_drizzle_orm2.eq)(inventories.id, inventoryId));
    } catch (dbErr) {
      const dbJson = await readDb();
      const inv = (dbJson.inventories || []).find((i) => i.id === inventoryId);
      if (inv) {
        inv.sectors = sectorsList;
        await writeDb(dbJson);
      }
    }
    recentTransmissions.unshift({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      inventoryId,
      sectorName: sector.nome,
      sectionCode,
      operatorName: novaContagem.operatorName,
      itemCount: formattedItems.reduce((acc, item) => acc + item.quantidade, 0)
    });
    if (recentTransmissions.length > 50) recentTransmissions.pop();
    return res.json({ success: true, count: formattedItems.length, message: "Transmiss\xE3o registrada com sucesso." });
  } catch (err) {
    console.error("Erro no POST /api/collect:", err);
    return res.status(500).json({ error: err.message || "Erro interno ao processar transmiss\xE3o." });
  } finally {
    mutex.unlock();
  }
});
app.post("/api/inventories/:id/shadow-audit", async (req, res) => {
  const { id } = req.params;
  const mutex = getInventoryMutex(id);
  await mutex.lock();
  try {
    const { sectorId, sectionCode, auditorName, auditQuantity, expectedQuantity } = req.body;
    let sectorsList = [];
    let compara = false;
    let usingDb = true;
    try {
      const invList = await db.select({ sectors: inventories.sectors, compara: inventories.compara }).from(inventories).where((0, import_drizzle_orm2.eq)(inventories.id, id));
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
      const { readDb: readDb2 } = (init_db_helper(), __toCommonJS(db_helper_exports));
      const dbJson = await readDb2();
      const inv = (dbJson.inventories || []).find((i) => i.id === id);
      if (!inv) return res.status(404).json({ error: "Invent\xE1rio n\xE3o encontrado" });
      sectorsList = inv.sectors || [];
      compara = Boolean(inv.compara);
    }
    const sector = sectorsList.find((s) => s.id === sectorId);
    if (!sector) return res.status(404).json({ error: "Setor n\xE3o encontrado" });
    let section = (sector.sections || []).find((s) => s.code === sectionCode);
    if (!section) return res.status(404).json({ error: "Se\xE7\xE3o n\xE3o encontrada" });
    let totalCollected = 0;
    if (section.contagens && section.contagens.length > 0) {
      if (compara) {
        const lastCount = section.contagens[section.contagens.length - 1];
        totalCollected = (lastCount?.items || []).reduce((sum, it) => sum + (Number(it.quantidade) || 0), 0);
      } else {
        totalCollected = section.contagens.reduce(
          (sum, c) => sum + (c.items || []).reduce((itSum, it) => itSum + (Number(it.quantidade) || 0), 0),
          0
        );
      }
    }
    const finalExpected = expectedQuantity !== void 0 && expectedQuantity !== null ? Number(expectedQuantity) : totalCollected;
    const auditQty = Number(auditQuantity) || 0;
    const isMatch = auditQty === finalExpected;
    section.shadowAudit = {
      auditorName: auditorName || "Auditor Cliente",
      auditQuantity: auditQty,
      collectedQuantity: finalExpected,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      divergente: !isMatch
    };
    if (isMatch) {
      section.status = "CONFERIDO_OK";
      section.finalizado = true;
    } else {
      section.status = "DIVERGENTE";
      section.finalizado = false;
    }
    if (usingDb) {
      try {
        await db.update(inventories).set({ sectors: sectorsList }).where((0, import_drizzle_orm2.eq)(inventories.id, id));
      } catch (upErr) {
        const { readDb: readDb2, writeDb: writeDb2 } = (init_db_helper(), __toCommonJS(db_helper_exports));
        const dbJson = await readDb2();
        const invIndex = (dbJson.inventories || []).findIndex((i) => i.id === id);
        if (invIndex !== -1) {
          dbJson.inventories[invIndex].sectors = sectorsList;
          await writeDb2(dbJson);
        }
      }
    } else {
      const { readDb: readDb2, writeDb: writeDb2 } = (init_db_helper(), __toCommonJS(db_helper_exports));
      const dbJson = await readDb2();
      const invIndex = (dbJson.inventories || []).findIndex((i) => i.id === id);
      if (invIndex !== -1) {
        dbJson.inventories[invIndex].sectors = sectorsList;
        await writeDb2(dbJson);
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
  } catch (err) {
    console.error("Erro no shadow-audit:", err);
    return res.status(500).json({ error: err.message || "Erro ao registrar recontagem." });
  } finally {
    mutex.unlock();
  }
});
app.get("/api/inventories/:id/backup", async (req, res) => {
  const inventoryId = req.params.id;
  try {
    const invs = await db.select().from(inventories).where((0, import_drizzle_orm2.eq)(inventories.id, inventoryId));
    if (invs.length === 0) {
      return res.status(404).json({ error: "Invent\xE1rio n\xE3o encontrado." });
    }
    const inv = invs[0];
    const prods = await db.select().from(products).where((0, import_drizzle_orm2.eq)(products.inventoryId, inventoryId));
    const addrs = await db.select().from(addresses).where((0, import_drizzle_orm2.eq)(addresses.inventoryId, inventoryId));
    res.json({
      inventory: inv,
      products: prods,
      addresses: addrs
    });
  } catch (err) {
    try {
      const { readDb: readDb2 } = (init_db_helper(), __toCommonJS(db_helper_exports));
      const dbJson = await readDb2();
      const inv = (dbJson.inventories || []).find((i) => i.id === inventoryId);
      if (!inv) {
        return res.status(404).json({ error: "Invent\xE1rio n\xE3o encontrado." });
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
  if (!inventory) return res.status(400).json({ error: "Dados inv\xE1lidos." });
  const newId = "inv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  const invData = {
    id: newId,
    nome: (inventory.nome || "Backup") + " (Restaurado)",
    filial: inventory.filial,
    dataExecucao: inventory.dataExecucao,
    dataEdicao: (/* @__PURE__ */ new Date()).toISOString(),
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
      const prodsToInsert = prods.map((p) => ({
        inventoryId: newId,
        ean: p.ean,
        sap: p.sap,
        descricao: p.descricao,
        estoque: p.estoque,
        precoCusto: p.precoCusto,
        departamento: p.departamento
      }));
      for (let i = 0; i < prodsToInsert.length; i += 1e3) {
        await db.insert(products).values(prodsToInsert.slice(i, i + 1e3));
      }
    }
    if (addrs && addrs.length > 0) {
      const addrsToInsert = addrs.map((a) => ({
        inventoryId: newId,
        codigo: a.codigo
      }));
      for (let i = 0; i < addrsToInsert.length; i += 1e3) {
        await db.insert(addresses).values(addrsToInsert.slice(i, i + 1e3));
      }
    }
    res.json({ success: true, newId });
  } catch (err) {
    try {
      const { readDb: readDb2, writeDb: writeDb2 } = (init_db_helper(), __toCommonJS(db_helper_exports));
      const dbJson = await readDb2();
      invData.products = prods || [];
      invData.addresses = addrs || [];
      if (!dbJson.inventories) dbJson.inventories = [];
      dbJson.inventories.push(invData);
      await writeDb2(dbJson);
      res.json({ success: true, newId });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
});
app.all("/api/*", (req, res) => {
  res.status(404).json({
    error: `Endpoint da API n\xE3o encontrado: ${req.method} ${req.originalUrl}. Verifique se o servidor backend foi compilado (npm run build) e o PM2 reiniciado (pm2 restart all).`
  });
});
var distPath = import_fs.default.existsSync(import_path2.default.join(process.cwd(), "dist", "index.html")) ? import_path2.default.join(process.cwd(), "dist") : import_path2.default.join(process.cwd(), "dist_pronto");
var hasDistIndex = import_fs.default.existsSync(import_path2.default.join(distPath, "index.html"));
var isProduction = process.env.NODE_ENV === "production" || hasDistIndex && process.env.NODE_ENV !== "development";
async function startServer() {
  try {
    await initDatabase();
  } catch (dbErr) {
    console.warn("Aviso: Falha ao inicializar o banco MySQL (Drizzle), o servidor iniciar\xE1 usando fallback de JSON local:", dbErr);
  }
  if (!isProduction) {
    try {
      const vite = await (0, import_vite.createServer)({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (vErr) {
      console.warn("Vite middleware error (falling back to static serving if available):", vErr);
    }
  } else {
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (${isProduction ? "PRODUCTION" : "DEVELOPMENT"})`);
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`
\u274C ERRO: A porta ${PORT} j\xE1 est\xE1 sendo usada por outro processo.`);
    } else {
      console.error("Erro no servidor:", err);
    }
  });
}
startServer();
