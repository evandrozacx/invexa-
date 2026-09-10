import React, { useState, useRef, useMemo } from "react";
import { Inventory, Product } from "../types";
import { 
  X, Barcode, Upload, FileText, CheckCircle, AlertTriangle, 
  Search, Sliders, RefreshCw, Trash2, Download, Table, 
  Layers, Package, Check, ArrowRight, HelpCircle, FileSpreadsheet,
  FileCode, Sparkles, FolderOpen
} from "lucide-react";

interface Props {
  inventory: Inventory;
  isOpen: boolean;
  onClose: () => void;
  onSync: () => void;
  initialTab?: "list" | "csv" | "txt";
}

export default function InventoryProductsModal({
  inventory,
  isOpen,
  onClose,
  onSync,
  initialTab = "list"
}: Props) {
  const [activeTab, setActiveTab] = useState<"list" | "csv" | "txt">(initialTab);
  
  // List & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Raw file & text states
  const [rawData, setRawData] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // CSV Parameters
  const [csvSeparator, setCsvSeparator] = useState<";" | "," | "tab" | "space" | "|">(";");
  const [csvHasHeader, setCsvHasHeader] = useState(true);
  const [csvEanCol, setCsvEanCol] = useState(0);
  const [csvSapCol, setCsvSapCol] = useState(1);
  const [csvDescCol, setCsvDescCol] = useState(2);
  const [csvEstoqueCol, setCsvEstoqueCol] = useState(3);
  const [csvPrecoCol, setCsvPrecoCol] = useState(4);
  const [csvDeptCol, setCsvDeptCol] = useState(5);

  // TXT Mode & Parameters
  const [txtMode, setTxtMode] = useState<"positional" | "delimited">("positional");
  const [txtSeparator, setTxtSeparator] = useState<";" | "," | "tab" | "space" | "|">("|");
  const [txtHasHeader, setTxtHasHeader] = useState(false);
  
  // Positional parameters (1-indexed start/end for easy user input)
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

  // Processed Preview state
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [confirmClearModal, setConfirmClearModal] = useState(false);

  // Dedicated file input refs for robust OS file chooser activation
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const txtFileInputRef = useRef<HTMLInputElement>(null);

  const [modalProducts, setModalProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const fetchInventoryProducts = React.useCallback(async () => {
    if (!inventory?.id || !isOpen) return;
    setIsLoadingProducts(true);
    try {
      const res = await fetch(`/api/inventories/${inventory.id}/products`);
      if (res.ok) {
        const data = await res.json();
        setModalProducts(data.products || []);
      }
    } catch (e) {
      console.error("Error loading products for modal:", e);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [inventory?.id, isOpen]);

  // Keep active tab in sync if initialTab changes on open
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setMessage(null);
      setPreviewProducts([]);
      setRawData("");
      setFileName(null);
      fetchInventoryProducts();
    }
  }, [isOpen, initialTab, fetchInventoryProducts]);

  const currentProducts = useMemo(() => {
    if (modalProducts.length > 0) return modalProducts;
    if (inventory.products && inventory.products.length > 0) return inventory.products;
    return [];
  }, [modalProducts, inventory.products]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    currentProducts.forEach(p => {
      if (p.departamento && p.departamento.trim()) {
        set.add(p.departamento.trim().toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [currentProducts]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return currentProducts.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        (p.ean && p.ean.toLowerCase().includes(q)) ||
        (p.sap && p.sap.toLowerCase().includes(q)) ||
        (p.descricao && p.descricao.toLowerCase().includes(q)) ||
        (p.departamento && p.departamento.toLowerCase().includes(q));

      const matchesDept = 
        deptFilter === "ALL" || 
        (p.departamento && p.departamento.toUpperCase() === deptFilter);

      return matchesSearch && matchesDept;
    });
  }, [currentProducts, searchQuery, deptFilter]);

  // Pagination for catalog list
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, page]);

  // Catalog stats
  const catalogStats = useMemo(() => {
    let totalEstoque = 0;
    let totalCusto = 0;
    let comSap = 0;

    currentProducts.forEach(p => {
      totalEstoque += p.estoque || 0;
      totalCusto += (p.estoque || 0) * (p.precoCusto || 0);
      if (p.sap && p.sap.trim()) comSap++;
    });

    return {
      totalItems: currentProducts.length,
      totalEstoque,
      totalCusto,
      comSap,
      uniqueDepts: departments.length
    };
  }, [currentProducts, departments]);

  if (!isOpen) return null;

  // Trigger file picker programmatically
  function triggerPicker(format: "csv" | "txt") {
    if (format === "csv") {
      csvFileInputRef.current?.click();
    } else {
      txtFileInputRef.current?.click();
    }
  }

  // Handle file read (CSV / TXT)
  function processLoadedFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawData(content || "");
      setMessage({
        type: "info",
        text: `Arquivo "${file.name}" carregado com sucesso (${(file.size / 1024).toFixed(1)} KB). Clique em "Processar e Analisar" para validar os dados.`
      });
    };
    reader.onerror = () => {
      setMessage({ type: "error", text: "Erro ao ler o arquivo selecionado." });
    };
    reader.readAsText(file, "ISO-8859-1"); // Support Latin-1 / UTF-8 commonly used in Brazilian ERPs
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processLoadedFile(file);
    }
    // Reset value so re-selecting the exact same file fires onChange reliably
    e.target.value = "";
  }

  // Drag & Drop handlers
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

  function handleDrop(e: React.DragEvent, tab: "csv" | "txt") {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setActiveTab(tab);
      processLoadedFile(file);
    }
  }

  // Preset Loaders
  function loadPresetCSVPDF() {
    const sample = `7896181909705;001960;G DIPIRONA SODICA 500MG GTS 10;0000008;00000306;MEDIC OTC GENERICOS
7891317004347;001965;G PREDNISOLONA 11MG GTS 20ML;0000015;00000450;MEDIC OTC GENERICOS
7891317010362;001966;G FUROATO MOMETASONA 50MCG SPR;0000010;00001280;MEDIC OTC GENERICOS
7894916145336;001967;G GLICLAZIDA 30MG 60CPR LEGR;0000022;00000890;MEDIC OTC GENERICOS
7894916149181;001968;G GLICLAZIDA 60MG 30CPR LEGR;0000005;00001420;MEDIC OTC GENERICOS
7896181909705;001960;G DIPIRONA SODICA 500MG GTS 10;0000008;00000306;MEDIC OTC GENERICOS`;

    setRawData(sample);
    setFileName("exemplo_catalogo_padrao.csv");
    setCsvSeparator(";");
    setCsvHasHeader(false);
    setCsvEanCol(0);
    setCsvSapCol(1);
    setCsvDescCol(2);
    setCsvEstoqueCol(3);
    setCsvPrecoCol(4);
    setCsvDeptCol(5);
    setMessage({ type: "info", text: "Exemplo CSV carregado nos parâmetros." });
  }

  function loadPresetTXTPositional() {
    // 1-13 EAN, 14-20 SAP, 21-60 DESC, 61-68 QTY, 69-76 COST, 77-85 DEPT
    const sample = `7896181909705001960G DIPIRONA SODICA 500MG GTS 10          0000000800000306MEDIC GEN
7891317004347001965G PREDNISOLONA 11MG GTS 20ML            0000001500000450MEDIC GEN
7891317010362001966G FUROATO MOMETASONA 50MCG SPR          0000001000001280MEDIC GEN
7894916145336001967G GLICLAZIDA 30MG 60CPR LEGR            0000002200000890MEDIC GEN
7894916149181001968G GLICLAZIDA 60MG 30CPR LEGR            0000000500001420MEDIC GEN`;

    setRawData(sample);
    setFileName("exemplo_posicional.txt");
    setTxtMode("positional");
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
    setMessage({ type: "info", text: "Exemplo TXT Posicional (Largura Fixa) carregado." });
  }

  // Parse CSV
  function handleProcessCSV() {
    setMessage(null);
    if (!rawData.trim()) {
      setMessage({ type: "error", text: "Insira dados ou carregue um arquivo CSV antes de processar." });
      return;
    }

    setIsProcessing(true);
    try {
      const lines = rawData.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) {
        setMessage({ type: "error", text: "O arquivo ou texto fornecido está vazio." });
        setIsProcessing(false);
        return;
      }

      let sepChar = ";";
      if (csvSeparator === ",") sepChar = ",";
      if (csvSeparator === "tab") sepChar = "\t";
      if (csvSeparator === "space") sepChar = " ";
      if (csvSeparator === "|") sepChar = "|";

      const parsed: Product[] = [];
      const startIdx = csvHasHeader ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];
        let cols = csvSeparator === "space" 
          ? line.split(/\s+/).map(c => c.trim())
          : line.split(sepChar).map(c => c.trim());

        if (cols.length === 1) {
          const code = cols[0];
          if (code) {
            parsed.push({
              ean: code,
              sap: code,
              descricao: `PRODUTO ${code}`,
              estoque: 0,
              precoCusto: 0,
              departamento: "GERAL"
            });
          }
        } else {
          const ean = cols[csvEanCol] || "";
          const sap = cols[csvSapCol] || "";
          const desc = cols[csvDescCol] || "";
          const estRaw = cols[csvEstoqueCol] || "0";
          const precRaw = (cols[csvPrecoCol] || "0").replace("R$", "").replace(/\s/g, "").replace(",", ".");
          const dept = cols[csvDeptCol] || "GERAL";

          const estoque = parseInt(estRaw.replace(/\D/g, "")) || 0;
          let precoCusto = parseFloat(precRaw) || 0;
          
          // If cost was formatted as fixed 8-digit without decimal (e.g. 00000306 -> 3.06)
          if (/^\d{6,10}$/.test(cols[csvPrecoCol] || "")) {
            precoCusto = parseInt(cols[csvPrecoCol]) / 100;
          }

          if (ean || sap || desc) {
            parsed.push({
              ean: ean || sap,
              sap: sap || ean,
              descricao: desc || `PRODUTO ${ean || sap}`,
              estoque,
              precoCusto,
              departamento: dept.toUpperCase()
            });
          }
        }
      }

      // Deduplicate by EAN (or SAP/Desc if no EAN)
      const cleaned: Product[] = [];
      const seen = new Set<string>();
      let dups = 0;

      for (const p of parsed) {
        const key = p.ean ? p.ean.trim() : p.sap ? p.sap.trim() : p.descricao.trim();
        if (!key) continue;
        if (seen.has(key)) {
          dups++;
        } else {
          seen.add(key);
          cleaned.push(p);
        }
      }

      setDuplicateCount(dups);
      setPreviewProducts(cleaned);
      setMessage({
        type: "success",
        text: `Processamento CSV concluído: ${cleaned.length} produtos únicos identificados. (${dups} duplicados ignorados automaticamente).`
      });
    } catch (err: any) {
      setMessage({ type: "error", text: `Erro ao processar CSV: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  }

  // Parse TXT
  function handleProcessTXT() {
    setMessage(null);
    if (!rawData.trim()) {
      setMessage({ type: "error", text: "Insira dados ou carregue um arquivo TXT antes de processar." });
      return;
    }

    setIsProcessing(true);
    try {
      const lines = rawData.split(/\r?\n/).filter(l => l.length > 0);
      if (lines.length === 0) {
        setMessage({ type: "error", text: "O arquivo TXT está vazio." });
        setIsProcessing(false);
        return;
      }

      const parsed: Product[] = [];

      if (txtMode === "delimited") {
        let sepChar = "|";
        if (txtSeparator === ";") sepChar = ";";
        if (txtSeparator === ",") sepChar = ",";
        if (txtSeparator === "tab") sepChar = "\t";
        if (txtSeparator === "space") sepChar = " ";

        const startIdx = txtHasHeader ? 1 : 0;
        for (let i = startIdx; i < lines.length; i++) {
          const line = lines[i].trim();
          const cols = txtSeparator === "space"
            ? line.split(/\s+/).map(c => c.trim())
            : line.split(sepChar).map(c => c.trim());

          if (cols.length === 1) {
            const code = cols[0];
            if (code) {
              parsed.push({
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

            const estoque = parseInt(estRaw.replace(/\D/g, "")) || 0;
            let precoCusto = parseFloat(precRaw) || 0;

            if (ean || sap || desc) {
              parsed.push({
                ean: ean || sap,
                sap: sap || ean,
                descricao: desc || `PRODUTO ${ean || sap}`,
                estoque,
                precoCusto,
                departamento: dept.toUpperCase()
              });
            }
          }
        }
      } else {
        // Positional parsing (1-indexed substrings converted to slice)
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
          if (!line.trim()) continue;

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
              const divisor = Math.pow(10, posPrecoDecimals);
              precoCusto = parseInt(numOnly) / divisor;
            }
          }

          if (ean || sap || desc) {
            parsed.push({
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

      // Deduplicate
      const cleaned: Product[] = [];
      const seen = new Set<string>();
      let dups = 0;

      for (const p of parsed) {
        const key = p.ean ? p.ean.trim() : p.sap ? p.sap.trim() : p.descricao.trim();
        if (!key) continue;
        if (seen.has(key)) {
          dups++;
        } else {
          seen.add(key);
          cleaned.push(p);
        }
      }

      setDuplicateCount(dups);
      setPreviewProducts(cleaned);
      setMessage({
        type: "success",
        text: `Processamento TXT concluído: ${cleaned.length} produtos únicos identificados. (${dups} duplicados ignorados automaticamente).`
      });
    } catch (err: any) {
      setMessage({ type: "error", text: `Erro ao processar TXT: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  }

  // Save parsed products exclusively to this inventory
  async function handleSaveToInventory() {
    if (previewProducts.length === 0) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/inventories/${inventory.id}/upload-products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: previewProducts })
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({
          type: "success",
          text: `Sucesso! Foram gravados ${data.count || previewProducts.length} produtos EXCLUSIVAMENTE para o inventário "${inventory.nome}".`
        });
        setPreviewProducts([]);
        setRawData("");
        setFileName(null);
        await fetchInventoryProducts();
        onSync();
        // Switch to list tab to see imported products
        setTimeout(() => {
          setActiveTab("list");
        }, 800);
      } else {
        setMessage({ type: "error", text: "Erro ao salvar produtos no servidor." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Falha de conexão ao gravar no servidor." });
    } finally {
      setIsSaving(false);
    }
  }

  // Clear products from this inventory
  async function handleClearAllProducts() {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/inventories/${inventory.id}/products`, {
        method: "DELETE"
      });

      if (res.ok) {
        setMessage({
          type: "success",
          text: `Arquivo de produtos do inventário "${inventory.nome}" foi excluído com sucesso! Agora você pode importar um novo arquivo.`
        });
        setConfirmClearModal(false);
        setModalProducts([]);
        await fetchInventoryProducts();
        onSync();
      } else {
        setMessage({ type: "error", text: "Erro ao excluir arquivo de produtos ativo." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Falha ao conectar com o servidor." });
    } finally {
      setIsSaving(false);
    }
  }

  // Export current inventory's products as CSV or TXT
  function handleExportCurrentCatalog(format: "csv" | "txt") {
    if (currentProducts.length === 0) {
      alert("Não há produtos para exportar neste inventário.");
      return;
    }

    let content = "";
    if (format === "csv") {
      content = "EAN;SAP;DESCRICAO;ESTOQUE;PRECO_CUSTO;DEPARTAMENTO\r\n";
      currentProducts.forEach(p => {
        content += `${p.ean};${p.sap};${p.descricao};${p.estoque};${p.precoCusto.toFixed(2)};${p.departamento}\r\n`;
      });
    } else {
      currentProducts.forEach(p => {
        const ean = p.ean.padEnd(13, " ").substring(0, 13);
        const sap = p.sap.padStart(7, "0").substring(0, 7);
        const desc = p.descricao.padEnd(40, " ").substring(0, 40);
        const est = String(p.estoque).padStart(8, "0").substring(0, 8);
        const preco = String(Math.round(p.precoCusto * 100)).padStart(8, "0").substring(0, 8);
        const dept = (p.departamento || "GERAL").padEnd(10, " ").substring(0, 10);
        content += `${ean}${sap}${desc}${est}${preco}${dept}\r\n`;
      });
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `produtos_${inventory.filial.replace(/\s+/g, "_")}_${inventory.id}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 animate-scale-up">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00a8e8] to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight uppercase font-mono">
                  Catálogo de Produtos do Inventário
                </h3>
                <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Individual
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans mt-0.5">
                <b className="text-white uppercase">{inventory.nome}</b> • Filial: <b className="text-sky-300">{inventory.filial}</b>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition-colors cursor-pointer"
            title="Fechar Janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP NAVIGATION TABS */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => { setActiveTab("list"); setMessage(null); }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "list" 
                  ? "bg-white text-slate-900 shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Package className="w-4 h-4 text-sky-600" />
              <span>Produtos Cadastrados ({currentProducts.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab("csv"); setMessage(null); }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "csv" 
                  ? "bg-white text-emerald-700 shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Importar Arquivo CSV</span>
            </button>

            <button
              onClick={() => { setActiveTab("txt"); setMessage(null); }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "txt" 
                  ? "bg-white text-indigo-700 shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileCode className="w-4 h-4 text-indigo-600" />
              <span>Importar Arquivo TXT</span>
            </button>
          </div>

          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Válido exclusivamente para este inventário</span>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in border ${
            message.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : message.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : "bg-sky-50 text-sky-800 border-sky-200"
          }`}>
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : message.type === "error" ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <HelpCircle className="w-4 h-4 text-sky-600 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button 
              onClick={() => setMessage(null)}
              className="text-slate-400 hover:text-slate-700 text-xs px-1 cursor-pointer font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* TAB CONTENTS (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: LIST / CATALOG OF PRODUCTS */}
          {activeTab === "list" && (
            <div className="space-y-5">
              
              {/* SUMMARY STATS BAR */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total de Produtos (SKUs)</span>
                  <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">{catalogStats.totalItems}</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">{catalogStats.comSap} com código interno SAP</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Estoque Previsto Total</span>
                  <span className="text-xl font-black text-amber-600 font-mono mt-0.5 block">{catalogStats.totalEstoque} un</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Saldo inicial do cliente</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Valor Previsto em Custo</span>
                  <span className="text-xl font-black text-emerald-600 font-mono mt-0.5 block">
                    R$ {catalogStats.totalCusto.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Avaliação monetária</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Departamentos</span>
                  <span className="text-xl font-black text-indigo-600 font-mono mt-0.5 block">{catalogStats.uniqueDepts}</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Categorias cadastradas</span>
                </div>
              </div>

              {/* SEARCH & FILTER CONTROLS */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex-1 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                    placeholder="Buscar por EAN, SAP, Descrição ou Departamento..."
                    className="w-full bg-transparent text-xs outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
                      ×
                    </button>
                  )}
                </div>

                {departments.length > 0 && (
                  <select
                    value={deptFilter}
                    onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
                    className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 outline-none cursor-pointer max-w-[180px] truncate"
                  >
                    <option value="ALL">Todos os Departamentos ({departments.length})</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("csv")}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    title="Importar catálogo de produtos via CSV ou TXT"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importar Arquivo</span>
                  </button>

                  <button
                    onClick={() => handleExportCurrentCatalog("csv")}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Exportar base deste inventário em CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CSV</span>
                  </button>

                  <button
                    onClick={() => handleExportCurrentCatalog("txt")}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Exportar base deste inventário em TXT"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>TXT</span>
                  </button>

                  {currentProducts.length > 0 && (
                    <button
                      onClick={() => setConfirmClearModal(true)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Apagar produtos deste inventário"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Limpar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* PRODUCTS TABLE */}
              {currentProducts.length === 0 ? (
                <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 mx-auto flex items-center justify-center shadow-xs">
                    <Package className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Nenhum produto importado para este inventário ainda</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Você pode importar a base específica deste inventário usando um arquivo <b>CSV</b> ou <b>TXT</b> nos botões abaixo.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab("csv")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Importar com CSV</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("txt")}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <FileCode className="w-4 h-4" />
                      <span>Importar com TXT</span>
                    </button>
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-medium">
                  Nenhum produto encontrado com os filtros selecionados.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto max-h-[380px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3">EAN (Cód. Barras)</th>
                          <th className="py-2.5 px-3">Cód. SAP/SKU</th>
                          <th className="py-2.5 px-3">Descrição do Produto</th>
                          <th className="py-2.5 px-3 text-right">Saldo Previsto</th>
                          <th className="py-2.5 px-3 text-right">Preço de Custo</th>
                          <th className="py-2.5 px-3">Departamento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] font-sans">
                        {paginatedProducts.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.ean || "---"}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">{p.sap || "---"}</td>
                            <td className="py-2.5 px-3 text-slate-800 font-medium">{p.descricao}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">{p.estoque} un</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                              R$ {(p.precoCusto || 0).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-semibold">{p.departamento || "GERAL"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINATION */}
                  {totalPages > 1 && (
                    <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-600">
                      <span>
                        Exibindo {(page - 1) * itemsPerPage + 1} - {Math.min(page * itemsPerPage, filteredProducts.length)} de {filteredProducts.length} itens
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded disabled:opacity-40 font-bold hover:bg-slate-100 cursor-pointer"
                        >
                          Anterior
                        </button>
                        <span className="font-bold px-2">{page} / {totalPages}</span>
                        <button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded disabled:opacity-40 font-bold hover:bg-slate-100 cursor-pointer"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: IMPORT CSV */}
          {activeTab === "csv" && (
            <div className="space-y-5">
              
              {/* ACTIVE FILE BANNER */}
              {currentProducts.length > 0 ? (
                <div className="bg-slate-900 border-2 border-emerald-500/50 text-white p-4.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <Barcode className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                          Arquivo Ativo de Produtos
                        </span>
                        <span className="text-[11px] text-slate-300 font-medium">Base Principal de Consultas</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5 font-mono">
                        {currentProducts.length.toLocaleString("pt-BR")} Códigos Importados no Inventário "{inventory.nome}"
                      </h4>
                    </div>
                  </div>

                  <button
                    onClick={() => setConfirmClearModal(true)}
                    className="bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-600 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer group shrink-0"
                    title="Excluir o arquivo de produtos atual na lixeira para colocar um novo"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400 group-hover:text-white transition-transform" />
                    <span>Excluir Arquivo Ativo (Lixeira)</span>
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    Nenhum arquivo de produtos ativo no momento. Importe um arquivo abaixo para gravar a base deste inventário.
                  </span>
                </div>
              )}

              {/* INSTRUCTION CARD */}
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>Importação de Arquivo CSV para o Inventário: {inventory.nome}</span>
                  </div>
                  <button
                    onClick={loadPresetCSVPDF}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded-lg text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Carregar Exemplo de Teste</span>
                  </button>
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  Carregue um arquivo <b>.CSV</b> ou cole os dados abaixo. O sistema lerá e removerá duplicados baseado no <b>EAN</b>. Os produtos serão vinculados exclusivamente a este inventário.
                </p>
              </div>

              {/* FILE UPLOAD & DRAG DROP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label 
                  htmlFor="inventory-csv-file-input"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, "csv")}
                  className={`border-2 border-dashed p-5 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group select-none ${
                    isDragging 
                      ? "border-emerald-500 bg-emerald-100/50 scale-[1.01]" 
                      : "border-slate-300 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/40"
                  }`}
                >
                  <input
                    id="inventory-csv-file-input"
                    ref={csvFileInputRef}
                    type="file"
                    accept=".csv,.txt,.tsv,.dat"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 line-clamp-1">
                    {fileName ? fileName : "Clique ou Arraste o arquivo .CSV aqui"}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    Formatos suportados: .CSV, .TSV, .TXT
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      triggerPicker("csv");
                    }}
                    className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3.5 rounded-xl text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Procurar Arquivo no Computador</span>
                  </button>
                </label>

                {/* DIRECT TEXT PASTE */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>Ou cole as linhas do CSV diretamente:</span>
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
                    placeholder="7896181909705;001960;DIPIRONA 500MG;8;3.06;MEDICAMENTOS..."
                    className="w-full bg-slate-900 text-slate-100 font-mono text-xs p-3 rounded-xl border border-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* CSV CONFIGURATION PARAMETERS */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Parâmetros e Mapeamento de Colunas CSV
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Separador / Delimitador</label>
                    <select
                      value={csvSeparator}
                      onChange={e => setCsvSeparator(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold outline-none cursor-pointer"
                    >
                      <option value=";">Ponto e Vírgula (;)</option>
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
                        checked={csvHasHeader}
                        onChange={e => setCsvHasHeader(e.target.checked)}
                        className="rounded border-slate-300 accent-emerald-600 w-4 h-4"
                      />
                      <span>Ignorar 1ª linha (Cabeçalho)</span>
                    </label>
                  </div>

                  <div className="sm:col-span-2 bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Índice das Colunas (0 = 1ª coluna, 1 = 2ª coluna...)
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[10px]">
                      <div>
                        <label className="block font-bold text-slate-600 mb-0.5">EAN</label>
                        <input
                          type="number"
                          min={0}
                          value={csvEanCol}
                          onChange={e => setCsvEanCol(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-mono font-bold text-center"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 mb-0.5">SAP/SKU</label>
                        <input
                          type="number"
                          min={0}
                          value={csvSapCol}
                          onChange={e => setCsvSapCol(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-mono font-bold text-center"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 mb-0.5">Descrição</label>
                        <input
                          type="number"
                          min={0}
                          value={csvDescCol}
                          onChange={e => setCsvDescCol(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-mono font-bold text-center"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 mb-0.5">Qtd Estoque</label>
                        <input
                          type="number"
                          min={0}
                          value={csvEstoqueCol}
                          onChange={e => setCsvEstoqueCol(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-mono font-bold text-center"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 mb-0.5">Preço Custo</label>
                        <input
                          type="number"
                          min={0}
                          value={csvPrecoCol}
                          onChange={e => setCsvPrecoCol(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-mono font-bold text-center"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-600 mb-0.5">Depto</label>
                        <input
                          type="number"
                          min={0}
                          value={csvDeptCol}
                          onChange={e => setCsvDeptCol(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 font-mono font-bold text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleProcessCSV}
                    disabled={isProcessing || !rawData.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Processar e Analisar CSV</span>
                  </button>
                </div>
              </div>

              {/* PREVIEW OF PROCESSED CSV */}
              {previewProducts.length > 0 && (
                <div className="border border-emerald-200 bg-emerald-50/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        Pré-visualização: {previewProducts.length} produtos prontos para gravação
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {duplicateCount > 0 && `${duplicateCount} itens duplicados foram removidos automaticamente.`} Mostrando os primeiros 5 registros.
                      </p>
                    </div>

                    <button
                      onClick={handleSaveToInventory}
                      disabled={isSaving}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer animate-pulse"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Gravando no Banco ({previewProducts.length})...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Gravar Produtos no Inventário ({previewProducts.length})</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-emerald-200 rounded-lg bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2">EAN</th>
                          <th className="p-2">SAP</th>
                          <th className="p-2">Descrição</th>
                          <th className="p-2 text-right">Estoque</th>
                          <th className="p-2 text-right">Preço</th>
                          <th className="p-2">Departamento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {previewProducts.slice(0, 5).map((p, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 font-bold text-slate-900">{p.ean}</td>
                            <td className="p-2 text-slate-600">{p.sap}</td>
                            <td className="p-2 font-sans text-slate-800">{p.descricao}</td>
                            <td className="p-2 text-right text-amber-600 font-bold">{p.estoque}</td>
                            <td className="p-2 text-right text-emerald-600 font-bold">R$ {p.precoCusto.toFixed(2)}</td>
                            <td className="p-2 text-slate-500">{p.departamento}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: IMPORT TXT */}
          {activeTab === "txt" && (
            <div className="space-y-5">
              
              {/* ACTIVE FILE BANNER */}
              {currentProducts.length > 0 ? (
                <div className="bg-slate-900 border-2 border-indigo-500/50 text-white p-4.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shrink-0">
                      <Barcode className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                          Arquivo Ativo de Produtos
                        </span>
                        <span className="text-[11px] text-slate-300 font-medium">Base Principal de Consultas</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5 font-mono">
                        {currentProducts.length.toLocaleString("pt-BR")} Códigos Importados no Inventário "{inventory.nome}"
                      </h4>
                    </div>
                  </div>

                  <button
                    onClick={() => setConfirmClearModal(true)}
                    className="bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-600 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer group shrink-0"
                    title="Excluir o arquivo de produtos atual na lixeira para colocar um novo"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400 group-hover:text-white transition-transform" />
                    <span>Excluir Arquivo Ativo (Lixeira)</span>
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    Nenhum arquivo de produtos ativo no momento. Importe um arquivo abaixo para gravar a base deste inventário.
                  </span>
                </div>
              )}

              {/* INSTRUCTION CARD */}
              <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 p-4 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <FileCode className="w-4 h-4 text-indigo-700" />
                    <span>Importação de Arquivo TXT para o Inventário: {inventory.nome}</span>
                  </div>
                  <button
                    onClick={loadPresetTXTPositional}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded-lg text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Carregar Exemplo TXT Posicional</span>
                  </button>
                </div>
                <p className="text-indigo-800 leading-relaxed">
                  Importe arquivos <b>.TXT</b> (com colunas fixas/posicionais ou delimitados por caracteres). Ideal para layouts de ERPs tradicionais (SAP, Protheus, Datasul, Linx).
                </p>
              </div>

              {/* TXT MODE TOGGLE */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setTxtMode("positional")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    txtMode === "positional" 
                      ? "bg-indigo-600 text-white shadow-xs" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  TXT com Largura Fixa (Posicional por Caracteres)
                </button>
                <button
                  onClick={() => setTxtMode("delimited")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    txtMode === "delimited" 
                      ? "bg-indigo-600 text-white shadow-xs" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  TXT Delimitado (Separador)
                </button>
              </div>

              {/* FILE UPLOAD & DRAG DROP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label 
                  htmlFor="inventory-txt-file-input"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, "txt")}
                  className={`border-2 border-dashed p-5 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group select-none ${
                    isDragging 
                      ? "border-indigo-500 bg-indigo-100/50 scale-[1.01]" 
                      : "border-slate-300 hover:border-indigo-500 bg-slate-50/70 hover:bg-indigo-50/40"
                  }`}
                >
                  <input
                    id="inventory-txt-file-input"
                    ref={txtFileInputRef}
                    type="file"
                    accept=".txt,.prn,.dat,.rem,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 line-clamp-1">
                    {fileName ? fileName : "Clique ou Arraste o arquivo .TXT aqui"}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    Formatos suportados: .TXT, .PRN, .DAT, .REM
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      triggerPicker("txt");
                    }}
                    className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3.5 rounded-xl text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Procurar Arquivo no Computador</span>
                  </button>
                </label>

                {/* DIRECT TEXT PASTE */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>Ou cole as linhas do arquivo TXT:</span>
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
                    placeholder="7896181909705001960DIPIRONA 500MG GTS 10          0000000800000306MEDIC..."
                    className="w-full bg-slate-900 text-slate-100 font-mono text-xs p-3 rounded-xl border border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* TXT PARAMETERS */}
              {txtMode === "positional" ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        Posições de Caracteres na Linha (Início - Fim)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Base 1 (1 = Primeiro caractere)</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                    {/* EAN */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-700 block text-[11px] mb-1.5">EAN / Barras</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={posEanStart}
                          onChange={e => setPosEanStart(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-center font-mono font-bold text-xs"
                          placeholder="Ini"
                        />
                        <span className="text-slate-400 font-bold">-</span>
                        <input
                          type="number"
                          value={posEanEnd}
                          onChange={e => setPosEanEnd(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-center font-mono font-bold text-xs"
                          placeholder="Fim"
                        />
                      </div>
                    </div>

                    {/* SAP */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-700 block text-[11px] mb-1.5">Cód. SAP / SKU</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={posSapStart}
                          onChange={e => setPosSapStart(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-center font-mono font-bold text-xs"
                          placeholder="Ini"
                        />
                        <span className="text-slate-400 font-bold">-</span>
                        <input
                          type="number"
                          value={posSapEnd}
                          onChange={e => setPosSapEnd(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-center font-mono font-bold text-xs"
                          placeholder="Fim"
                        />
                      </div>
                    </div>

                    {/* DESCRICAO */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-700 block text-[11px] mb-1.5">Descrição</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={posDescStart}
                          onChange={e => setPosDescStart(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-center font-mono font-bold text-xs"
                          placeholder="Ini"
                        />
                        <span className="text-slate-400 font-bold">-</span>
                        <input
                          type="number"
                          value={posDescEnd}
                          onChange={e => setPosDescEnd(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-center font-mono font-bold text-xs"
                          placeholder="Fim"
                        />
                      </div>
                    </div>

                    {/* ESTOQUE */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-700 block text-[11px] mb-1.5">Qtd Estoque</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={posEstoqueStart}
                          onChange={e => setPosEstoqueStart(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-center font-mono font-bold text-xs"
                          placeholder="Ini"
                        />
                        <span className="text-slate-400 font-bold">-</span>
                        <input
                          type="number"
                          value={posEstoqueEnd}
                          onChange={e => setPosEstoqueEnd(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-center font-mono font-bold text-xs"
                          placeholder="Fim"
                        />
                      </div>
                    </div>

                    {/* PRECO */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-700 block text-[11px] mb-1.5">Preço Custo</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={posPrecoStart}
                          onChange={e => setPosPrecoStart(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-center font-mono font-bold text-xs"
                          placeholder="Ini"
                        />
                        <span className="text-slate-400 font-bold">-</span>
                        <input
                          type="number"
                          value={posPrecoEnd}
                          onChange={e => setPosPrecoEnd(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-center font-mono font-bold text-xs"
                          placeholder="Fim"
                        />
                      </div>
                    </div>

                    {/* DEPTO */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-700 block text-[11px] mb-1.5">Departamento</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={posDeptStart}
                          onChange={e => setPosDeptStart(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-center font-mono font-bold text-xs"
                          placeholder="Ini"
                        />
                        <span className="text-slate-400 font-bold">-</span>
                        <input
                          type="number"
                          value={posDeptEnd}
                          onChange={e => setPosDeptEnd(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-center font-mono font-bold text-xs"
                          placeholder="Fim"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-600">Casas Decimais do Preço:</label>
                      <select
                        value={posPrecoDecimals}
                        onChange={e => setPosPrecoDecimals(parseInt(e.target.value) || 2)}
                        className="bg-white border border-slate-300 rounded p-1 text-xs font-bold font-mono outline-none"
                      >
                        <option value={0}>0 (Ex: 300 = R$ 300)</option>
                        <option value={2}>2 decimais (Ex: 00000306 = R$ 3,06)</option>
                        <option value={3}>3 decimais (Ex: 00003060 = R$ 3,060)</option>
                      </select>
                    </div>

                    <button
                      onClick={handleProcessTXT}
                      disabled={isProcessing || !rawData.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Processar e Analisar TXT Posicional</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* DELIMITED TXT PARAMS */
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Delimitador do TXT</label>
                      <select
                        value={txtSeparator}
                        onChange={e => setTxtSeparator(e.target.value as any)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold outline-none cursor-pointer"
                      >
                        <option value="|">Pipe (|)</option>
                        <option value=";">Ponto e Vírgula (;)</option>
                        <option value=",">Vírgula (,)</option>
                        <option value="tab">Tabulação (Tab)</option>
                        <option value="space">Espaço simples (Space)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-slate-700 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={txtHasHeader}
                          onChange={e => setTxtHasHeader(e.target.checked)}
                          className="rounded border-slate-300 accent-indigo-600 w-4 h-4"
                        />
                        <span>Ignorar 1ª linha (Cabeçalho)</span>
                      </label>
                    </div>

                    <div className="flex items-end justify-end">
                      <button
                        onClick={handleProcessTXT}
                        disabled={isProcessing || !rawData.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Processar TXT Delimitado</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PREVIEW OF PROCESSED TXT */}
              {previewProducts.length > 0 && (
                <div className="border border-indigo-200 bg-indigo-50/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-indigo-600" />
                        Pré-visualização: {previewProducts.length} produtos prontos para gravação
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {duplicateCount > 0 && `${duplicateCount} itens duplicados foram removidos automaticamente.`} Mostrando os primeiros 5 registros.
                      </p>
                    </div>

                    <button
                      onClick={handleSaveToInventory}
                      disabled={isSaving}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all cursor-pointer animate-pulse"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Gravando no Banco ({previewProducts.length})...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Gravar Produtos no Inventário ({previewProducts.length})</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-indigo-200 rounded-lg bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2">EAN</th>
                          <th className="p-2">SAP</th>
                          <th className="p-2">Descrição</th>
                          <th className="p-2 text-right">Estoque</th>
                          <th className="p-2 text-right">Preço</th>
                          <th className="p-2">Departamento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {previewProducts.slice(0, 5).map((p, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 font-bold text-slate-900">{p.ean}</td>
                            <td className="p-2 text-slate-600">{p.sap}</td>
                            <td className="p-2 font-sans text-slate-800">{p.descricao}</td>
                            <td className="p-2 text-right text-amber-600 font-bold">{p.estoque}</td>
                            <td className="p-2 text-right text-emerald-600 font-bold">R$ {p.precoCusto.toFixed(2)}</td>
                            <td className="p-2 text-slate-500">{p.departamento}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Inventário Ativo:</span>
            <span className="font-mono font-bold text-sky-700">{inventory.nome} ({inventory.filial})</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>

      </div>

      {/* CONFIRM CLEAR MODAL */}
      {confirmClearModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 text-left animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">Limpar Catálogo de Produtos?</h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja apagar todos os <b>{currentProducts.length}</b> produtos cadastrados <b>exclusivamente</b> no inventário <b>"{inventory.nome}"</b>? 
              <br /><br />
              Esta ação não afeta os outros inventários cadastrados no sistema.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmClearModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAllProducts}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Sim, Limpar Produtos Deste Inventário
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
