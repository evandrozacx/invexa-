CREATE TABLE `addresses` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`inventory_id` varchar(255) NOT NULL,
	`codigo` varchar(255),
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` varchar(255) NOT NULL,
	`cnpj` varchar(255) NOT NULL,
	`razao_social` varchar(255) NOT NULL,
	`nome_fantasia` varchar(255) NOT NULL,
	`logotipo` varchar(255),
	`parcerias` json,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` varchar(255) NOT NULL,
	`nome_fantasia` varchar(255) NOT NULL,
	`company_id` varchar(255) NOT NULL,
	`last_active` varchar(255) NOT NULL,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventories` (
	`id` varchar(255) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`filial` varchar(255),
	`data_execucao` varchar(255),
	`data_edicao` varchar(255),
	`status` varchar(255),
	`tipo_contagem` varchar(255),
	`coleta_pallets` varchar(255),
	`permissao_coleta` varchar(255),
	`compara` boolean DEFAULT false,
	`compara_via_link` boolean DEFAULT false,
	`coordenador` varchar(255),
	`gerente` varchar(255),
	`inicio_estoque` varchar(255),
	`termino_estoque` varchar(255),
	`inicio_loja` varchar(255),
	`termino_loja` varchar(255),
	`inicio_divergencia` varchar(255),
	`termino_divergencia` varchar(255),
	`assinatura_gerente` varchar(255),
	`assinatura_coordenador` varchar(255),
	`sectors` json,
	`total_products_count` int DEFAULT 0,
	`total_addresses_count` int DEFAULT 0,
	`total_estoque` double DEFAULT 0,
	`total_preco_custo` double DEFAULT 0,
	`total_departamentos` int DEFAULT 0,
	CONSTRAINT `inventories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operators` (
	`id` varchar(255) NOT NULL,
	`cpf` varchar(255) NOT NULL,
	`nome_completo` varchar(255) NOT NULL,
	`data_nascimento` varchar(255) NOT NULL,
	`senha_preenchedores` varchar(255) NOT NULL,
	`company_id` varchar(255) NOT NULL,
	`hierarquia` varchar(255),
	CONSTRAINT `operators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`inventory_id` varchar(255) NOT NULL,
	`ean` varchar(255),
	`sap` varchar(255),
	`descricao` varchar(255),
	`estoque` double,
	`preco_custo` double,
	`departamento` varchar(255),
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`uid` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_uid_unique` UNIQUE(`uid`)
);
