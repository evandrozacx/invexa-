import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.ts';

declare global {
  var _mysqlPool: mysql.Pool | undefined;
}

export const createPool = () => {
  if (!global._mysqlPool) {
    console.log(`[MySQL] Conectando a host: ${process.env.SQL_HOST || "localhost (não definido!)"}, banco: ${process.env.SQL_DB_NAME || "(não definido!)"}, usuário: ${process.env.SQL_USER || "(não definido!)"}`);
    global._mysqlPool = mysql.createPool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      connectionLimit: 10,
    });
  }
  return global._mysqlPool;
};

const pool = createPool();

export const db = drizzle(pool, { mode: 'default', schema });

export async function initDatabase() {
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

      // Safe migration for existing inventories table
      try {
        await connection.query(`ALTER TABLE inventories ADD COLUMN client_base_name VARCHAR(255)`);
      } catch (e) {
        // column already exists
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

      // Safe index creation helper for fast queries and inserts on large databases
      const safeAddIndex = async (tableName: string, indexName: string, columnsSql: string) => {
        try {
          await connection.query(`CREATE INDEX ${indexName} ON ${tableName} (${columnsSql})`);
        } catch (e) {
          // Index already exists or table structure error
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

