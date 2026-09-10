import React, { useState, useRef, useEffect } from "react";
import { Inventory, Product, Address } from "../types";
import { 
  Upload, FileText, CheckCircle, HelpCircle, Table, ArrowRight, 
  Trash2, Sliders, Barcode, MapPin, Sparkles, RefreshCw, Check, 
  FileSpreadsheet, FileCode, AlertTriangle, Layers, FolderOpen
} from "lucide-react";

interface Props {
  inventory: Inventory;
  inventories?: Inventory[];
  setActiveInventoryId?: (id: string) => void;
  onSync: () => void;
}

export default function ProductAddressImport({ 
  inventory, 
  inventories, 
  setActiveInventoryId, 
  onSync 
}: Props) {
  const [activeTab, setActiveTab] = useState<"products" | "addresses">("products");
  const [productFormat, setProductFormat] = useState<"csv" | "txt">("csv");

  // Raw paste area & file
  const [rawData, setRawData] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // CSV Configuration
  const [separator, setSeparator] = useState<";" | "," | "tab" | "space" | "|">(";");
  const [hasHeader, setHasHeader] = useState(true);
  const [eanCol, setEanCol] = useState(0);
  const [sapCol, setSapCol] = useState(1);
  const [descCol, setDescCol] = useState(2);
  const [estoqueCol, setEstoqueCol] = useState(3);
  const [precoCol, setPrecoCol] = useState(4);
  const [deptCol, setDeptCol] = useState(5);

  // TXT Configuration
  const [txtMode, setTxtMode] = useState<"positional" | "delimited">("positional");
  const [txtSeparator, setTxtSeparator] = useState<";" | "," | "tab" | "space" | "|">("|");
  const [txtHasHeader, setTxtHasHeader] = useState(false);
  const [posEanStart, setPosEanStart] = useState("1");
  const [posEanEnd, setPosEanEnd] = useState("13");
  const [posSapStart, setPosSapStart] = useState("14");
  const [posSapEnd, setPosSapEnd] = useState("20");
  const [posDescStart, setPosDescStart] = useState("21");
  const [posDescEnd, setPosDescEnd] = useState("60");
  const [posEstoqueStart, setPosEstoqueStart] = useState("61");
  const [posEstoqueEnd, setPosEstoqueEnd] = useState("68");
  const [posPrecoStart, setPosPrecoStart] = useState("69");
  const [posPrecoEnd, setPosPrecoEnd] = useState("76");
  const [posDeptStart, setPosDeptStart] = useState("77");
  const [posDeptEnd, setPosDeptEnd] = useState("85");
  const [posPrecoDecimals, setPosPrecoDecimals] = useState(2);

  // Preview & Status
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);
  const [previewAddresses, setPreviewAddresses] = useState<Address[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<"products" | "addresses" | null>(null);

  const [activeProductsList, setActiveProductsList] = useState<Product[]>([]);
  const [activeAddressesList, setActiveAddressesList] = useState<Address[]>([]);
  const [isLoadingActive, setIsLoadingActive] = useState(false);

  const productFileInputRef = useRef<HTMLInputElement>(null);
  const addressFileInputRef = useRef<HTMLInputElement>(null);

  const fetchActiveData = React.useCallback(async () => {
    if (!inventory?.id) return;
    setIsLoadingActive(true);
    try {
      const [prodRes, addrRes] = await Promise.all([
        fetch(`/api/inventories/${inventory.id}/products`),
        fetch(`/api/inventories/${inventory.id}/addresses`)
      ]);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setActiveProductsList(prodData.products || []);
      }
      if (addrRes.ok) {
        const addrData = await addrRes.json();
        setActiveAddressesList(addrData.addresses || []);
      }
    } catch (e) {
      console.error("Error fetching active inventory data:", e);
    } finally {
      setIsLoadingActive(false);
    }
  }, [inventory?.id]);

  useEffect(() => {
    fetchActiveData();
  }, [fetchActiveData]);

  // Combined source of truth: local list fetched from server or inventory object
  const activeProducts = activeProductsList.length > 0 
    ? activeProductsList 
    : (inventory.products && inventory.products.length > 0 ? inventory.products : []);

  const activeAddresses = activeAddressesList.length > 0 
    ? activeAddressesList 
    : (inventory.addresses && inventory.addresses.length > 0 ? inventory.addresses : []);

  const totalProductsCount = activeProducts.length > 0 
    ? activeProducts.length 
    : (inventory.totalProductsCount || 0);

  const totalAddressesCount = activeAddresses.length > 0 
    ? activeAddresses.length 
    : (inventory.totalAddressesCount || 0);

  const hasActiveProducts = totalProductsCount > 0;
  const hasActiveAddresses = totalAddressesCount > 0;

  const totalDepts = activeProducts.length > 0 
    ? new Set(activeProducts.map(p => p.departamento).filter(Boolean)).size 
    : (inventory.totalDepartamentos || 0);

  const totalEstoque = activeProducts.length > 0
    ? activeProducts.reduce((acc, p) => acc + (Number(p.estoque) || 0), 0)
    : (inventory.totalEstoque || 0);

  const totalPrecoCusto = activeProducts.length > 0
    ? activeProducts.reduce((acc, p) => acc + ((Number(p.precoCusto) || 0) * (Number(p.estoque) || 0)), 0)
    : (inventory.totalPrecoCusto || 0);

  async function handleDeleteActiveFile(type: "products" | "addresses") {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/inventories/${inventory.id}/${type}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setMessage({
          type: "success",
          text: type === "products"
            ? `Arquivo de produtos do inventário "${inventory.nome}" excluído com sucesso! Agora você pode selecionar e gravar um novo arquivo.`
            : `Arquivo de endereços do inventário "${inventory.nome}" excluído com sucesso!`
        });
        setConfirmDeleteModal(null);
        setPreviewProducts([]);
        setPreviewAddresses([]);
        setRawData("");
        setFileName(null);
        if (type === "products") setActiveProductsList([]);
        if (type === "addresses") setActiveAddressesList([]);
        await fetchActiveData();
        onSync();
      } else {
        setMessage({ type: "error", text: "Erro ao excluir arquivo ativo no servidor." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Falha de conexão com o servidor ao excluir." });
    } finally {
      setIsDeleting(false);
    }
  }

  function processFileContent(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawData(content || "");
      setMessage({
        type: "info",
        text: `Arquivo "${file.name}" carregado com sucesso (${(file.size / 1024).toFixed(1)} KB). Clique em "Processar e Validar Dados".`
      });
    };
    reader.onerror = () => {
      setMessage({ type: "error", text: "Erro ao ler arquivo selecionado." });
    };
    reader.readAsText(file, "ISO-8859-1");
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processFileContent(file);
    }
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFileContent(file);
    }
  }

  // Presets
  function loadPresetPDFExample() {
    const sample = `7896181909705;001960;G DIPIRONA SODICA 500MG GTS 10;0000008;00000306;MEDIC OTC GENERICOS
7891317004347;001965;G PREDNISOLONA 11MG GTS 20ML;0000015;00000450;MEDIC OTC GENERICOS
7891317010362;001966;G FUROATO MOMETASONA 50MCG SPR;0000010;00001280;MEDIC OTC GENERICOS
7894916145336;001967;G GLICLAZIDA 30MG 60CPR LEGR;0000022;00000890;MEDIC OTC GENERICOS
7894916149181;001968;G GLICLAZIDA 60MG 30CPR LEGR;0000005;00001420;MEDIC OTC GENERICOS
7896181909705;001960;G DIPIRONA SODICA 500MG GTS 10;0000008;00000306;MEDIC OTC GENERICOS`;
    
    setProductFormat("csv");
    setRawData(sample);
    setSeparator(";");
    setHasHeader(false);
    setEanCol(0);
    setSapCol(1);
    setDescCol(2);
    setEstoqueCol(3);
    setPrecoCol(4);
    setDeptCol(5);
    setMessage({ type: "info", text: "Exemplo CSV do PDF carregado nos parâmetros." });
  }

  function loadPresetTXTPositional() {
    const sample = `7896181909705001960G DIPIRONA SODICA 500MG GTS 10          0000000800000306MEDIC GEN
7891317004347001965G PREDNISOLONA 11MG GTS 20ML            0000001500000450MEDIC GEN
7891317010362001966G FUROATO MOMETASONA 50MCG SPR          0000001000001280MEDIC GEN
7894916145336001967G GLICLAZIDA 30MG 60CPR LEGR            0000002200000890MEDIC GEN
7894916149181001968G GLICLAZIDA 60MG 30CPR LEGR            0000000500001420MEDIC GEN`;

    setProductFormat("txt");
    setTxtMode("positional");
    setRawData(sample);
    setPosEanStart("1");
    setPosEanEnd("13");
    setPosSapStart("14");
    setPosSapEnd("20");
    setPosDescStart("21");
    setPosDescEnd("60");
    setPosEstoqueStart("61");
    setPosEstoqueEnd("68");
    setPosPrecoStart("69");
    setPosPrecoEnd("76");
    setPosDeptStart("77");
    setPosDeptEnd("85");
    setPosPrecoDecimals(2);
    setMessage({ type: "info", text: "Exemplo TXT Posicional carregado nos parâmetros." });
  }

  function loadPresetAddressExample() {
    const sample = `2371\n2372\n2373\n2374\n2375\n2376\n2377\n2378\n2379\n2380\n2381\n2382\n2383\n2384\n2385`;
    setRawData(sample);
    setHasHeader(false);
    setMessage({ type: "info", text: "Exemplo de endereços carregado." });
  }

  function handleProcessData() {
    setMessage(null);
    if (!rawData.trim()) {
      setMessage({ type: "error", text: "Insira dados ou carregue um arquivo para processar." });
      return;
    }

    const lines = rawData.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    if (activeTab === "products") {
      const parsedProducts: Product[] = [];

      if (productFormat === "csv") {
        let sepChar = ";";
        if (separator === ",") sepChar = ",";
        if (separator === "tab") sepChar = "\t";
        if (separator === "space") sepChar = " ";
        if (separator === "|") sepChar = "|";

        const startIdx = hasHeader ? 1 : 0;

        for (let idx = startIdx; idx < lines.length; idx++) {
          const line = lines[idx];
          let cols = separator === "space"
            ? line.split(/\s+/).map(c => c.trim())
            : line.split(sepChar).map(c => c.trim());

          if (cols.length === 1) {
            const code = cols[0];
            if (code) {
              parsedProducts.push({
                ean: code,
                sap: code,
                descricao: `PRODUTO ${code}`,
                estoque: 0,
                precoCusto: 0,
                departamento: "GERAL"
              });
            }
          } else {
            const ean = cols[eanCol] || "";
            const sap = cols[sapCol] || "";
            const desc = cols[descCol] || "";
            const estRaw = cols[estoqueCol] || "0";
            const precRaw = cols[precoCol] || "0";
            const dept = cols[deptCol] || "GERAL";

            const estoqueVal = parseInt(estRaw.replace(/\D/g, "")) || 0;
            let precoVal = parseFloat(precRaw.replace("R$", "").replace(",", ".")) || 0;
            if (/^\d{6,10}$/.test(precRaw)) {
              precoVal = parseInt(precRaw) / 100;
            }

            parsedProducts.push({
              ean: ean || sap,
              sap: sap || ean,
              descricao: desc || `PRODUTO ${ean || sap}`,
              estoque: estoqueVal,
              precoCusto: precoVal,
              departamento: dept.toUpperCase()
            });
          }
        }
      } else {
        // TXT Mode
        if (txtMode === "delimited") {
          let sepChar = "|";
          if (txtSeparator === ";") sepChar = ";";
          if (txtSeparator === ",") sepChar = ",";
          if (txtSeparator === "tab") sepChar = "\t";
          if (txtSeparator === "space") sepChar = " ";

          const startIdx = txtHasHeader ? 1 : 0;
          for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i];
            const cols = txtSeparator === "space"
              ? line.split(/\s+/).map(c => c.trim())
              : line.split(sepChar).map(c => c.trim());

            if (cols.length === 1) {
              const code = cols[0];
              if (code) {
                parsedProducts.push({
                  ean: code,
                  sap: code,
                  descricao: `PRODUTO ${code}`,
                  estoque: 0,
                  precoCusto: 0,
                  departamento: "GERAL"
                });
              }
            } else {
              const ean = cols[0] || "";
              const sap = cols[1] || "";
              const desc = cols[2] || "";
              const estRaw = cols[3] || "0";
              const precRaw = (cols[4] || "0").replace("R$", "").replace(",", ".");
              const dept = cols[5] || "GERAL";

              parsedProducts.push({
                ean: ean || sap,
                sap: sap || ean,
                descricao: desc || `PRODUTO ${ean || sap}`,
                estoque: parseInt(estRaw.replace(/\D/g, "")) || 0,
                precoCusto: parseFloat(precRaw) || 0,
                departamento: dept.toUpperCase()
              });
            }
          }
        } else {
          // Positional
          const eanStart = Math.max(0, parseInt(posEanStart) - 1 || 0);
          const eanEnd = parseInt(posEanEnd) || 13;
          const sapStart = Math.max(0, parseInt(posSapStart) - 1 || 0);
          const sapEnd = parseInt(posSapEnd) || 20;
          const descStart = Math.max(0, parseInt(posDescStart) - 1 || 0);
          const descEnd = parseInt(posDescEnd) || 60;
          const estStart = Math.max(0, parseInt(posEstoqueStart) - 1 || 0);
          const estEnd = parseInt(posEstoqueEnd) || 68;
          const precStart = Math.max(0, parseInt(posPrecoStart) - 1 || 0);
          const precEnd = parseInt(posPrecoEnd) || 76;
          const deptStart = Math.max(0, parseInt(posDeptStart) - 1 || 0);
          const deptEnd = parseInt(posDeptEnd) || 85;

          for (const line of lines) {
            const ean = line.slice(eanStart, eanEnd).trim();
            const sap = line.slice(sapStart, sapEnd).trim();
            const desc = line.slice(descStart, descEnd).trim();
            const estRaw = line.slice(estStart, estEnd).trim();
            const precRaw = line.slice(precStart, precEnd).trim();
            const dept = line.slice(deptStart, deptEnd).trim();

            const estoque = parseInt(estRaw.replace(/\D/g, "")) || 0;
            let precoCusto = 0;
            if (precRaw) {
              const numOnly = precRaw.replace(/\D/g, "");
              if (numOnly) {
                precoCusto = parseInt(numOnly) / Math.pow(10, posPrecoDecimals);
              }
            }

            if (ean || sap || desc) {
              parsedProducts.push({
                ean: ean || sap,
                sap: sap || ean,
                descricao: desc || `PRODUTO ${ean || sap}`,
                estoque,
                precoCusto,
                departamento: (dept || "GERAL").toUpperCase()
              });
            }
          }
        }
      }

      // Filter duplicates
      const cleaned: Product[] = [];
      const seen = new Set<string>();
      let dups = 0;

      parsedProducts.forEach(p => {
        const key = p.ean ? p.ean.trim() : p.sap ? p.sap.trim() : p.descricao;
        if (!key) return;
        if (seen.has(key)) {
          dups++;
        } else {
          seen.add(key);
          cleaned.push(p);
        }
      });

      setDuplicateCount(dups);
      setPreviewProducts(cleaned);
      setMessage({
        type: "success",
        text: `Processamento Concluído: ${cleaned.length} itens únicos. (${dups} duplicados removidos automaticamente).`
      });
    } else {
      // Parse Addresses
      const parsedAddresses: Address[] = [];
      const startIdx = hasHeader ? 1 : 0;

      for (let idx = startIdx; idx < lines.length; idx++) {
        const line = lines[idx];
        const code = line.split(/[;\t,\s]/)[0]?.trim().toUpperCase();
        if (code) {
          parsedAddresses.push({ codigo: code });
        }
      }

      const cleaned: Address[] = [];
      const seen = new Set<string>();
      parsedAddresses.forEach(a => {
        if (!seen.has(a.codigo)) {
          seen.add(a.codigo);
          cleaned.push(a);
        }
      });

      setPreviewAddresses(cleaned);
      setMessage({
        type: "success",
        text: `Arquivo de Endereços Processado: ${cleaned.length} seções identificadas.`
      });
    }
  }

  async function handleSaveImport() {
    setIsSaving(true);
    const url = activeTab === "products" 
      ? `/api/inventories/${inventory.id}/upload-products`
      : `/api/inventories/${inventory.id}/upload-addresses`;

    const body = activeTab === "products"
      ? { products: previewProducts }
      : { addresses: previewAddresses };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const resData = await res.json().catch(() => ({}));
        const countSaved = resData.count || (activeTab === "products" ? previewProducts.length : previewAddresses.length);
        setMessage({
          type: "success",
          text: `Sucesso! Base com ${countSaved.toLocaleString("pt-BR")} registros gravada EXCLUSIVAMENTE para o inventário "${inventory.nome}".`
        });
        setPreviewProducts([]);
        setPreviewAddresses([]);
        setRawData("");
        setFileName(null);
        await fetchActiveData();
        onSync();
      } else {
        setMessage({ type: "error", text: "Erro ao gravar importação no servidor." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Falha na conexão com o servidor." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      
      {/* TARGET INVENTORY SELECTOR BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <Barcode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                Inventário Alvo
              </span>
              <span className="text-[10px] text-slate-400">Base exclusiva deste inventário</span>
            </div>
            <h3 className="text-sm font-extrabold uppercase font-mono mt-0.5">
              {inventory.nome} • <span className="text-sky-300">{inventory.filial}</span>
            </h3>
          </div>
        </div>

        {inventories && inventories.length > 1 && setActiveInventoryId && (
          <div className="w-full sm:w-auto flex items-center gap-2">
            <label className="text-xs text-slate-300 font-bold whitespace-nowrap">Trocar Inventário:</label>
            <select
              value={inventory.id}
              onChange={e => setActiveInventoryId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg p-2 outline-none cursor-pointer w-full sm:w-60 truncate"
            >
              {inventories.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.nome} ({inv.filial})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 uppercase font-mono tracking-tight">
            Mapeamento & Importação de Arquivos
          </h2>
          <p className="text-xs text-slate-500">
            Importe catálogo de produtos (CSV/TXT) ou lista de endereços para contagem
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => { setActiveTab("products"); setRawData(""); setMessage(null); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "products" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Barcode className="w-3.5 h-3.5 text-sky-600" />
            <span>Ficheiro de Produtos ({totalProductsCount.toLocaleString("pt-BR")})</span>
          </button>
          <button
            onClick={() => { setActiveTab("addresses"); setRawData(""); setMessage(null); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "addresses" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ficheiro de Endereços ({totalAddressesCount.toLocaleString("pt-BR")})</span>
          </button>
        </div>
      </div>

      {/* PRODUCTS TAB */}
      {activeTab === "products" ? (
        <div className="space-y-5">
          
          {/* ACTIVE PRODUCT CATALOG STATUS CARD */}
          {hasActiveProducts ? (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border-2 border-emerald-500/50 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
                      <Barcode className="w-6 h-6" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        Arquivo de Produtos Ativo
                      </span>
                      <span className="text-[11px] text-slate-300 font-medium">Base Principal de Consultas do Coletor</span>
                    </div>
                    <h4 className="text-lg font-black text-white mt-1 font-mono tracking-tight flex items-center gap-2">
                      <span>{totalProductsCount.toLocaleString("pt-BR")} Códigos Importados e Ativos</span>
                    </h4>
                  </div>
                </div>

                {/* BOTÃO DE LIXEIRA PARA EXCLUIR ARQUIVO ATIVO */}
                <button
                  onClick={() => setConfirmDeleteModal("products")}
                  className="bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-600 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer group shadow-xs shrink-0"
                  title="Excluir o arquivo de produtos atual para poder importar um novo"
                >
                  <Trash2 className="w-4 h-4 text-rose-400 group-hover:text-white group-hover:scale-110 transition-transform" />
                  <span>Excluir Arquivo Ativo (Lixeira)</span>
                </button>
              </div>

              {/* METRICS ROW */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Códigos Únicos</span>
                  <span className="text-base font-bold text-white font-mono mt-0.5 block">
                    {totalProductsCount.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Departamentos</span>
                  <span className="text-base font-bold text-sky-400 font-mono mt-0.5 block">
                    {totalDepts}
                  </span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Saldo Estoque (Peças)</span>
                  <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
                    {totalEstoque.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Valor Total de Custo</span>
                  <span className="text-base font-bold text-amber-400 font-mono mt-0.5 block">
                    {totalPrecoCusto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
              </div>

              {/* STATUS FOOTER */}
              <div className="mt-3.5 bg-emerald-950/60 border border-emerald-800/40 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs text-emerald-200/90 gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <b>Arquivo Principal Ativo:</b> As consultas dos coletores e simuladores estão sendo direcionadas para estes {totalProductsCount.toLocaleString("pt-BR")} códigos. Enquanto você não clicar na <b>Lixeira</b>, este arquivo permanecerá fixo e ativo.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4.5 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                    <span>Nenhum Arquivo de Produtos Ativo</span>
                    <span className="text-[10px] bg-amber-200 text-amber-800 font-normal px-2 py-0.5 rounded-full font-mono">0 códigos</span>
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Carregue um arquivo CSV ou TXT abaixo e clique em <b>"Confirmar e Gravar no Inventário"</b> para cadastrar o catálogo principal deste inventário.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* FORMAT TOGGLE (CSV vs TXT) */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setProductFormat("csv")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  productFormat === "csv" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Formato CSV (.csv / .tsv)</span>
              </button>
              <button
                onClick={() => setProductFormat("txt")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  productFormat === "txt" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileCode className="w-4 h-4" />
                <span>Formato TXT (.txt / posicional)</span>
              </button>
            </div>

            <button
              onClick={productFormat === "csv" ? loadPresetPDFExample : loadPresetTXTPositional}
              className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-bold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Simular Dados do PDF Exemplo</span>
            </button>
          </div>

          {/* FILE UPLOAD & DIRECT PASTE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label 
              htmlFor="general-product-file-input"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed p-5 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group select-none ${
                isDragging 
                  ? "border-sky-500 bg-sky-100/50 scale-[1.01]" 
                  : "border-slate-300 hover:border-sky-500 bg-slate-50/70 hover:bg-sky-50/40"
              }`}
            >
              <input
                id="general-product-file-input"
                ref={productFileInputRef}
                type="file"
                accept={productFormat === "csv" ? ".csv,.tsv,.txt,.dat" : ".txt,.prn,.dat,.rem,.csv"}
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 line-clamp-1">
                {fileName ? fileName : `Clique ou arraste o arquivo ${productFormat.toUpperCase()} aqui`}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                Formatos: {productFormat === "csv" ? ".CSV, .TSV, .TXT" : ".TXT, .PRN, .DAT"}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  productFileInputRef.current?.click();
                }}
                className="mt-3 bg-sky-600 hover:bg-sky-700 text-white font-bold py-1.5 px-3.5 rounded-xl text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Procurar Arquivo no Computador</span>
              </button>
            </label>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>Ou cole as linhas do arquivo diretamente:</span>
                {rawData && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {rawData.split(/\r?\n/).filter(Boolean).length} linhas
                  </span>
                )}
              </div>
              <textarea
                rows={4}
                value={rawData}
                onChange={e => setRawData(e.target.value)}
                placeholder={productFormat === "csv" 
                  ? "7896181909705;001960;DIPIRONA 500MG;8;3.06;MEDICAMENTOS..." 
                  : "7896181909705001960DIPIRONA 500MG GTS 10          0000000800000306MEDIC..."
                }
                className="w-full bg-slate-950 text-slate-100 font-mono text-xs p-3 rounded-xl border border-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* PARAMETERS BLOCK */}
          {productFormat === "csv" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Delimitador Separador</label>
                <select
                  value={separator}
                  onChange={(e: any) => setSeparator(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold outline-none cursor-pointer"
                >
                  <option value=";">Ponto e vírgula (;)</option>
                  <option value=",">Vírgula (,)</option>
                  <option value="tab">Tabulação (Tab / \t)</option>
                  <option value="|">Pipe (|)</option>
                  <option value="space">Espaço simples (Space)</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-slate-700 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasHeader}
                    onChange={(e) => setHasHeader(e.target.checked)}
                    className="rounded border-slate-300 accent-emerald-600 w-4 h-4"
                  />
                  <span>Ignorar primeira linha (Cabeçalho)</span>
                </label>
              </div>

              <div className="sm:col-span-2 bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Índices de Colunas (0 = Primeira Coluna)
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[10px]">
                  <div>
                    <label className="block font-bold text-slate-600 mb-0.5">EAN</label>
                    <input type="number" min={0} value={eanCol} onChange={e => setEanCol(parseInt(e.target.value) || 0)} className="w-full border border-slate-300 rounded p-1 font-mono text-center font-bold" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-0.5">SAP</label>
                    <input type="number" min={0} value={sapCol} onChange={e => setSapCol(parseInt(e.target.value) || 0)} className="w-full border border-slate-300 rounded p-1 font-mono text-center font-bold" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-0.5">Desc</label>
                    <input type="number" min={0} value={descCol} onChange={e => setDescCol(parseInt(e.target.value) || 0)} className="w-full border border-slate-300 rounded p-1 font-mono text-center font-bold" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-0.5">Estoque</label>
                    <input type="number" min={0} value={estoqueCol} onChange={e => setEstoqueCol(parseInt(e.target.value) || 0)} className="w-full border border-slate-300 rounded p-1 font-mono text-center font-bold" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-0.5">Preço</label>
                    <input type="number" min={0} value={precoCol} onChange={e => setPrecoCol(parseInt(e.target.value) || 0)} className="w-full border border-slate-300 rounded p-1 font-mono text-center font-bold" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-0.5">Depto</label>
                    <input type="number" min={0} value={deptCol} onChange={e => setDeptCol(parseInt(e.target.value) || 0)} className="w-full border border-slate-300 rounded p-1 font-mono text-center font-bold" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setTxtMode("positional")}
                  className={`px-3 py-1 rounded text-xs font-bold ${txtMode === "positional" ? "bg-indigo-600 text-white" : "bg-white border text-slate-700"}`}
                >
                  Posicional (Largura Fixa)
                </button>
                <button
                  onClick={() => setTxtMode("delimited")}
                  className={`px-3 py-1 rounded text-xs font-bold ${txtMode === "delimited" ? "bg-indigo-600 text-white" : "bg-white border text-slate-700"}`}
                >
                  Delimitado (Separador)
                </button>
              </div>

              {txtMode === "positional" ? (
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[10px]">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">EAN (Ini-Fim)</span>
                    <div className="flex gap-1">
                      <input type="number" value={posEanStart} onChange={e => setPosEanStart(e.target.value)} className="w-full border rounded p-0.5 text-center font-bold" />
                      <input type="number" value={posEanEnd} onChange={e => setPosEanEnd(e.target.value)} className="w-full border rounded p-0.5 text-center font-bold" />
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">SAP (Ini-Fim)</span>
                    <div className="flex gap-1">
                      <input type="number" value={posSapStart} onChange={e => setPosSapStart(e.target.value)} className="w-full border rounded p-0.5 text-center font-bold" />
                      <input type="number" value={posSapEnd} onChange={e => setPosSapEnd(e.target.value)} className="w-full border rounded p-0.5 text-center font-bold" />
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Descrição</span>
                    <div className="flex gap-1">
                      <input type="number" value={posDescStart} onChange={e => setPosDescStart(e.target.value)} className="w-full border rounded p-0.5 text-center font-bold" />
                      <input type="number" value={posDescEnd} onChange={e => setPosDescEnd(e.target.value)} className="w-full border rounded p-0.5 text-center font-bold" />
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Estoque</span>
                    <div className="flex gap-1">
                      <input type="number" value={posEstoqueStart} onChange={e => setPosEstoqueStart(e.target.value)} className="w-full border rounded p-0.5 text-center font-bold" />
                      <input type="number" value={posEstoqueEnd} onChange={e => setPosEstoqueEnd(e.target.value)} className="w-full border rounded p-0.5 text-center font-bold" />
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Preço Custo</span>
                    <div className="flex gap-1">
                      <input type="number" value={posPrecoStart} onChange={e => setPosPrecoStart(e.target.value)} className="w-full border rounded p-0.5 text-center font-bold" />
                      <input type="number" value={posPrecoEnd} onChange={e => setPosPrecoEnd(e.target.value)} className="w-full border rounded p-0.5 text-center font-bold" />
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Depto</span>
                    <div className="flex gap-1">
                      <input type="number" value={posDeptStart} onChange={e => setPosDeptStart(e.target.value)} className="w-full border rounded p-0.5 text-center font-bold" />
                      <input type="number" value={posDeptEnd} onChange={e => setPosDeptEnd(e.target.value)} className="w-full border rounded p-0.5 text-center font-bold" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Delimitador</label>
                    <select
                      value={txtSeparator}
                      onChange={(e: any) => setTxtSeparator(e.target.value)}
                      className="bg-white border border-slate-300 rounded p-1.5 font-bold"
                    >
                      <option value="|">Pipe (|)</option>
                      <option value=";">Ponto e vírgula (;)</option>
                      <option value=",">Vírgula (,)</option>
                      <option value="tab">Tab</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 font-bold pt-4">
                    <input
                      type="checkbox"
                      checked={txtHasHeader}
                      onChange={e => setTxtHasHeader(e.target.checked)}
                      className="rounded accent-indigo-600"
                    />
                    <span>Ignorar 1ª linha</span>
                  </label>
                </div>
              )}
            </div>
          )}

        </div>
      ) : (
        /* ADDRESSES TAB */
        <div className="space-y-4">
          
          {/* ACTIVE ADDRESSES STATUS CARD */}
          {hasActiveAddresses ? (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 border-2 border-cyan-500/50 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-inner">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500"></span>
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-cyan-400" />
                        Arquivo de Endereços Ativo
                      </span>
                      <span className="text-[11px] text-slate-300 font-medium">Lista de Validação de Seções</span>
                    </div>
                    <h4 className="text-lg font-black text-white mt-1 font-mono tracking-tight flex items-center gap-2">
                      <span>{totalAddressesCount.toLocaleString("pt-BR")} Endereços / Seções Cadastrados</span>
                    </h4>
                  </div>
                </div>

                {/* BOTÃO DE LIXEIRA PARA ENDEREÇOS */}
                <button
                  onClick={() => setConfirmDeleteModal("addresses")}
                  className="bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-600 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer group shadow-xs shrink-0"
                  title="Excluir o arquivo de endereços atual para poder importar um novo"
                >
                  <Trash2 className="w-4 h-4 text-rose-400 group-hover:text-white group-hover:scale-110 transition-transform" />
                  <span>Excluir Endereços (Lixeira)</span>
                </button>
              </div>

              <div className="mt-3.5 bg-cyan-950/60 border border-cyan-800/40 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs text-cyan-200/90 gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    <b>Arquivo Principal Ativo:</b> Durante a contagem com tipo "Inventário com Endereço", os coletores verificam esta base com {totalAddressesCount.toLocaleString("pt-BR")} endereços. Enquanto não for excluído no botão de lixeira, ele permanece ativo.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-cyan-50/80 border border-cyan-200 rounded-2xl p-4.5 text-cyan-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-cyan-100 border border-cyan-300 flex items-center justify-center text-cyan-700 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-cyan-950 uppercase tracking-wide flex items-center gap-1.5">
                    <span>Nenhum Arquivo de Endereços Ativo</span>
                    <span className="text-[10px] bg-cyan-200 text-cyan-800 font-normal px-2 py-0.5 rounded-full font-mono">0 endereços</span>
                  </h4>
                  <p className="text-[11px] text-cyan-800 mt-0.5">
                    Carregue um arquivo .TXT ou .CSV com um código por linha e clique em <b>"Confirmar e Gravar no Inventário"</b>.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-cyan-50/50 border border-cyan-100 text-cyan-800 p-3.5 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold flex items-center gap-1.5 text-sm text-cyan-900">
                <MapPin className="w-4 h-4 text-cyan-600" /> Importação de Arquivos de Endereços / Seções
              </span>
              <button
                onClick={loadPresetAddressExample}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded-lg text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Carregar Lista Exemplo</span>
              </button>
            </div>
            <p className="text-cyan-800">
              Defina os endereços válidos onde os operadores devem contar os produtos no inventário <b>{inventory.nome}</b>.
            </p>
          </div>

          {/* FILE UPLOAD & DIRECT PASTE FOR ADDRESSES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label 
              htmlFor="address-file-input"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed p-5 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group select-none ${
                isDragging 
                  ? "border-cyan-500 bg-cyan-100/50 scale-[1.01]" 
                  : "border-slate-300 hover:border-cyan-500 bg-slate-50/70 hover:bg-cyan-50/40"
              }`}
            >
              <input
                id="address-file-input"
                ref={addressFileInputRef}
                type="file"
                accept=".txt,.csv,.tsv,.dat"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-11 h-11 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 line-clamp-1">
                {fileName ? fileName : "Clique ou arraste arquivo de endereços"}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                Formatos: .TXT, .CSV, .TSV (1 endereço por linha)
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addressFileInputRef.current?.click();
                }}
                className="mt-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1.5 px-3.5 rounded-xl text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Procurar Arquivo no Computador</span>
              </button>
            </label>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>Ou cole as linhas de endereços diretamente:</span>
                {rawData && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {rawData.split(/\r?\n/).filter(Boolean).length} linhas
                  </span>
                )}
              </div>
              <textarea
                rows={4}
                placeholder="2371&#10;2372&#10;2373..."
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 font-mono text-xs p-3 rounded-xl border border-slate-800 outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* ACTION BUTTONS & FEEDBACK */}
      <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
        <button
          onClick={handleProcessData}
          className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          <span>Processar e Validar Dados</span>
        </button>
        
        {(previewProducts.length > 0 || previewAddresses.length > 0) && (
          <button
            onClick={handleSaveImport}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer animate-pulse"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gravando no Banco...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>
                  Confirmar e Gravar no Inventário ({activeTab === "products" ? previewProducts.length : previewAddresses.length})
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* MESSAGE BANNER */}
      {message && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border animate-fade-in ${
          message.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : message.type === "error" 
              ? "bg-rose-50 text-rose-800 border-rose-200" 
              : "bg-sky-50 text-sky-800 border-sky-200"
        }`}>
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* PREVIEW PRODUCTS GRID */}
      {previewProducts.length > 0 && activeTab === "products" && (
        <div className="border border-slate-200 rounded-xl overflow-hidden space-y-1">
          <span className="text-[10px] text-slate-500 font-mono px-3 pt-2 block flex items-center gap-1">
            <Table className="w-3.5 h-3.5" /> Pré-Visualização dos Primeiros 5 Produtos Processados:
          </span>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="p-2.5">EAN (Barras)</th>
                  <th className="p-2.5">Código SAP</th>
                  <th className="p-2.5">Descrição</th>
                  <th className="p-2.5 text-right">Saldo Estoque</th>
                  <th className="p-2.5 text-right">Preço Custo</th>
                  <th className="p-2.5">Departamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {previewProducts.slice(0, 5).map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-2.5 text-slate-900 font-bold">{p.ean}</td>
                    <td className="p-2.5 text-slate-600">{p.sap}</td>
                    <td className="p-2.5 font-sans text-slate-700">{p.descricao}</td>
                    <td className="p-2.5 text-right text-amber-600 font-bold">{p.estoque}</td>
                    <td className="p-2.5 text-right text-emerald-600 font-bold">R$ {p.precoCusto.toFixed(2)}</td>
                    <td className="p-2.5 text-slate-500">{p.departamento}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PREVIEW ADDRESSES GRID */}
      {previewAddresses.length > 0 && activeTab === "addresses" && (
        <div className="border border-slate-200 rounded-xl overflow-hidden space-y-1 p-3">
          <span className="text-[10px] text-slate-500 font-mono block">
            Endereços Encontrados para Configuração ({previewAddresses.length}):
          </span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {previewAddresses.slice(0, 30).map((a, i) => (
              <span key={i} className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] font-mono">
                {a.codigo}
              </span>
            ))}
            {previewAddresses.length > 30 && (
              <span className="text-slate-400 text-xs font-mono self-center">
                + {previewAddresses.length - 30} seções
              </span>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 animate-scale-in">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {confirmDeleteModal === "products" ? "Excluir Arquivo de Produtos?" : "Excluir Arquivo de Endereços?"}
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  Inventário: <b className="text-slate-800 font-mono">{inventory.nome}</b>
                </span>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 space-y-2">
              <p>
                {confirmDeleteModal === "products" ? (
                  <>
                    Você está prestes a excluir a base ativa de <b>{(inventory.products || []).length.toLocaleString("pt-BR")} códigos</b> vinculados a este inventário.
                  </>
                ) : (
                  <>
                    Você está prestes a excluir a base de <b>{(inventory.addresses || []).length.toLocaleString("pt-BR")} endereços</b> vinculados a este inventário.
                  </>
                )}
              </p>
              <p className="text-[11px] text-rose-800 font-bold">
                Após a exclusão, este arquivo deixará de ser o principal e você poderá carregar e gravar um novo arquivo para este inventário.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => handleDeleteActiveFile(confirmDeleteModal)}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-rose-600/30 transition-all cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Excluindo Arquivo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sim, Excluir Arquivo Ativo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
