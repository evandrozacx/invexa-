import { relations } from 'drizzle-orm';
import { int, mysqlTable, serial, varchar, timestamp, boolean, json, double } from 'drizzle-orm/mysql-core';

// Users table (For Firebase Auth integration)
export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 255 }).notNull().unique(), // Firebase Auth UID
  email: varchar('email', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const companies = mysqlTable('companies', {
  id: varchar('id', { length: 255 }).primaryKey(),
  cnpj: varchar('cnpj', { length: 255 }).notNull(),
  razaoSocial: varchar('razao_social', { length: 255 }).notNull(),
  nomeFantasia: varchar('nome_fantasia', { length: 255 }).notNull(),
  logotipo: varchar('logotipo', { length: 255 }),
  parcerias: json('parcerias').$type<string[]>(),
});

export const operators = mysqlTable('operators', {
  id: varchar('id', { length: 255 }).primaryKey(),
  cpf: varchar('cpf', { length: 255 }).notNull(),
  nomeCompleto: varchar('nome_completo', { length: 255 }).notNull(),
  dataNascimento: varchar('data_nascimento', { length: 255 }).notNull(),
  senhaPreenchedores: varchar('senha_preenchedores', { length: 255 }).notNull(),
  companyId: varchar('company_id', { length: 255 }).notNull(),
  hierarquia: varchar('hierarquia', { length: 255 }),
});

export const devices = mysqlTable('devices', {
  id: varchar('id', { length: 255 }).primaryKey(),
  nomeFantasia: varchar('nome_fantasia', { length: 255 }).notNull(),
  companyId: varchar('company_id', { length: 255 }).notNull(),
  lastActive: varchar('last_active', { length: 255 }).notNull(),
});

// Since the frontend treats sectors, sections, and counts as a nested JSON structure 
// that it syncs entirely, we'll store sectors as JSONB to preserve API compatibility 
// quickly, avoiding thousands of individual inserts for sections and counts when an inventory is uploaded.
// For products and addresses, which are large, we use separate tables to avoid row size limits.
export const inventories = mysqlTable('inventories', {
  id: varchar('id', { length: 255 }).primaryKey(),
  nome: varchar('nome', { length: 255 }).notNull(),
  filial: varchar('filial', { length: 255 }),
  dataExecucao: varchar('data_execucao', { length: 255 }),
  dataEdicao: varchar('data_edicao', { length: 255 }),
  status: varchar('status', { length: 255 }),
  
  tipoContagem: varchar('tipo_contagem', { length: 255 }),
  coletaPallets: varchar('coleta_pallets', { length: 255 }),
  permissaoColeta: varchar('permissao_coleta', { length: 255 }),
  compara: boolean('compara').default(false),
  comparaViaLink: boolean('compara_via_link').default(false),
  
  coordenador: varchar('coordenador', { length: 255 }),
  gerente: varchar('gerente', { length: 255 }),
  inicioEstoque: varchar('inicio_estoque', { length: 255 }),
  terminoEstoque: varchar('termino_estoque', { length: 255 }),
  inicioLoja: varchar('inicio_loja', { length: 255 }),
  terminoLoja: varchar('termino_loja', { length: 255 }),
  inicioDivergencia: varchar('inicio_divergencia', { length: 255 }),
  terminoDivergencia: varchar('termino_divergencia', { length: 255 }),
  
  assinaturaGerente: varchar('assinatura_gerente', { length: 255 }),
  assinaturaCoordenador: varchar('assinatura_coordenador', { length: 255 }),

  sectors: json('sectors').$type<any[]>(), // Stores Sector[] containing Section[] and counts
  
  totalProductsCount: int('total_products_count').default(0),
  totalAddressesCount: int('total_addresses_count').default(0),
  totalEstoque: double('total_estoque').default(0),
  totalPrecoCusto: double('total_preco_custo').default(0),
  totalDepartamentos: int('total_departamentos').default(0),
});

export const products = mysqlTable('products', {
  id: serial('id').primaryKey(),
  inventoryId: varchar('inventory_id', { length: 255 }).notNull(),
  ean: varchar('ean', { length: 255 }),
  sap: varchar('sap', { length: 255 }),
  descricao: varchar('descricao', { length: 255 }),
  estoque: double('estoque'),
  precoCusto: double('preco_custo'),
  departamento: varchar('departamento', { length: 255 }),
});

export const addresses = mysqlTable('addresses', {
  id: serial('id').primaryKey(),
  inventoryId: varchar('inventory_id', { length: 255 }).notNull(),
  codigo: varchar('codigo', { length: 255 }),
});

export const productsRelations = relations(products, ({ one }) => ({
  inventory: one(inventories, {
    fields: [products.inventoryId],
    references: [inventories.id],
  }),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  inventory: one(inventories, {
    fields: [addresses.inventoryId],
    references: [inventories.id],
  }),
}));
