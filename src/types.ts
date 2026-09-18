export interface Company {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  logotipo?: string; // base64 or URL
  parcerias: string[]; // List of other company IDs partnered with
}

export interface Operator {
  id: string;
  cpf: string;
  nomeCompleto: string;
  dataNascimento: string;
  senhaPreenchedores: string; // 6 last digits of CPF by default
  companyId: string;
  hierarquia?: "Admin" | "Supervisão" | "Coordenação" | "Inventariante";
}

export interface Device {
  id: string; // UUID or generated key
  nomeFantasia: string; // e.g. INVECO-001
  companyId: string;
  lastActive: string;
}

export interface Product {
  ean: string;
  sap: string;
  descricao: string;
  estoque: number;
  precoCusto: number;
  departamento: string;
}

export interface SavedProductBase {
  id: string;
  clientName: string;
  fileName: string;
  importDate: string;
  totalProducts: number;
  totalEstoque: number;
  totalPrecoCusto: number;
  totalDepartamentos: number;
  products?: Product[];
  activeColumns?: {
    ean: boolean;
    sap: boolean;
    descricao: boolean;
    estoque: boolean;
    precoCusto: boolean;
    departamento: boolean;
  };
}

export interface Address {
  codigo: string;
}

export interface ProductImportConfig {
  separator: "," | ";" | "tab" | "space";
  hasHeader: boolean;
  mappings: {
    eanCol: number;
    sapCol: number;
    descCol: number;
    estoqueCol: number;
    precoCol: number;
    deptCol: number;
  };
}

export interface PalletCount {
  pallets: number;
  layers?: number;
  boxes?: number;
  qty: number;
}

export interface ColetaItem {
  ean: string;
  sap?: string;
  descricao?: string;
  quantidade: number;
  lote?: string;
  validade?: string;
  infoExtra?: string[]; // Up to 4 strings of max 30 chars
  pallet?: PalletCount;
  palete?: string;
  timestamp: string;
  operatorId: string;
  operatorName: string;
}

export interface SeçãoContagem {
  operatorId: string;
  operatorName: string;
  collectorNumber?: string;
  startTime: string;
  endTime: string;
  transmitTime: string;
  items: ColetaItem[];
}

export interface ShadowAudit {
  auditorName: string;
  auditQuantity: number;
  collectedQuantity: number;
  timestamp: string;
  divergente: boolean;
}

export interface Section {
  code: string; // e.g., "2371"
  status: 'NAO_INICIADO' | 'EM_ANDAMENTO' | 'CONTADO' | 'DIVERGENTE' | 'CONFERIDO_OK';
  // Standard count or list of counts for Compara (index 0 for team 1, index 1 for team 2, etc.)
  contagens: SeçãoContagem[];
  finalizado: boolean;
  observacoes?: string;
  shadowAudit?: ShadowAudit;
}

export interface Sector {
  id: string;
  nome: string; // UPPERCASE
  numero?: string;
  tipo?: 'ESTOQUE' | 'LOJA' | 'AVARIA'; // Ruptura and Avaria reports rely on this
  rangeStart: string; // e.g. "2371"
  rangeEnd: string; // e.g. "2412"
  sections: Section[];
}

export interface Inventory {
  id: string;
  nome: string; // UPPERCASE (e.g. TAMOIO FILIAL 134)
  filial: string;
  dataExecucao: string;
  dataEdicao: string;
  status: 'PLANEJADO' | 'CRIADO' | 'EM_ANDAMENTO' | 'FINALIZADO';
  
  // Configurations
  tipoContagem: 'NORMAL_FECHADA_SEM_MULT' | 'NORMAL_FECHADA_COM_MULT' | 'NORMAL_ABERTA' | 'ENDERECO' | 'LOTE_VALIDADE' | 'INFO_EXTRA';
  coletaPallets: 'NAO' | 'SIMPLIFICADO' | 'DETALHADO';
  permissaoColeta: 'QUALQUER_CODIGO' | 'SOMENTE_CARREGADOS' | 'CARREGADOS_CONFIRMA';
  compara: boolean; // Dupla contagem active
  comparaViaLink?: boolean; // Auditoria Sombra / Compara via Link independente pelos clientes
  
  // Operational Settings (Coordenador inputs before generating final summary)
  coordenador?: string;
  gerente?: string;
  inicioEstoque?: string;
  terminoEstoque?: string;
  inicioLoja?: string;
  terminoLoja?: string;
  inicioDivergencia?: string;
  terminoDivergencia?: string;
  
  // Signatures
  assinaturaGerente?: string; // base64
  assinaturaCoordenador?: string; // base64

  // Data references
  sectors: Sector[];
  products: Product[];
  addresses: Address[];

  // Real-time metadata summaries
  clientBaseName?: string;
  totalProductsCount?: number;
  totalAddressesCount?: number;
  totalEstoque?: number;
  totalPrecoCusto?: number;
  totalDepartamentos?: number;
}
