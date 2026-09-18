import React, { useState, useRef, useEffect, useMemo } from "react";
import { Company, Inventory, Product, SavedProductBase } from "../types";
import { 
  Upload, FileText, CheckCircle, Table, ArrowRight, 
  Trash2, Sliders, Barcode, Sparkles, RefreshCw, Check, 
  FileSpreadsheet, AlertTriangle, Layers, FolderOpen, 
  Search, Calendar, Download, Eye, X, HelpCircle, ArrowDownCircle, ExternalLink, Database, Plus
} from "lucide-react";

export interface UploadedFileItem {
  id: string;
  name: string;
  size: string;
  file: File;
  sampleText: string;
  estimatedLineCount: number;
}

// Pure helper function for fast line-to-product parsing
function parseLineToProduct(
  line: string,
  format: "csv" | "txt",
  csvOpts: {
    separator: string;
    eanCol: number | null;
    sapCol: number | null;
    descCol: number | null;
    estoqueCol: number | null;
    precoCol: number | null;
    deptCol: number | null;
  },
  txtOpts: {
    mode: "positional" | "delimited";
    separator: string;
    eanCol: number | null;
    sapCol: number | null;
    descCol: number | null;
    estoqueCol: number | null;
    precoCol: number | null;
    deptCol: number | null;
    posEan: { enabled: boolean; start: number; end: number };
    posSap: { enabled: boolean; start: number; end: number };
    posDesc: { enabled: boolean; start: number; end: number };
    posEstoque: { enabled: boolean; start: number; end: number };
    posPreco: { enabled: boolean; start: number; end: number; decimals: number };
    posDept: { enabled: boolean; start: number; end: number };
  }
): Product | null {
  if (!line || !line.trim()) return null;

  let ean = "";
  let sap = "";
  let desc = "";
  let estoque = 0;
  let precoCusto = 0;
  let departamento = "";

  if (format === "csv") {
    let sepChar = ";";
    if (csvOpts.separator === ",") sepChar = ",";
    if (csvOpts.separator === "tab") sepChar = "\t";
    if (csvOpts.separator === "space") sepChar = " ";
    if (csvOpts.separator === "|") sepChar = "|";

    const cols = csvOpts.separator === "space"
      ? line.split(/\s+/).map(c => c.trim())
      : line.split(sepChar).map(c => c.trim());

    ean = (csvOpts.eanCol !== null && csvOpts.eanCol >= 0 && cols[csvOpts.eanCol] !== undefined) ? cols[csvOpts.eanCol].trim() : "";
    sap = (csvOpts.sapCol !== null && csvOpts.sapCol >= 0 && cols[csvOpts.sapCol] !== undefined) ? cols[csvOpts.sapCol].trim() : "";
    desc = (csvOpts.descCol !== null && csvOpts.descCol >= 0 && cols[csvOpts.descCol] !== undefined) ? cols[csvOpts.descCol].trim() : "";
    const estRaw = (csvOpts.estoqueCol !== null && csvOpts.estoqueCol >= 0 && cols[csvOpts.estoqueCol] !== undefined) ? cols[csvOpts.estoqueCol].trim() : "";
    const precRaw = (csvOpts.precoCol !== null && csvOpts.precoCol >= 0 && cols[csvOpts.precoCol] !== undefined) ? cols[csvOpts.precoCol].trim() : "";
    departamento = (csvOpts.deptCol !== null && csvOpts.deptCol >= 0 && cols[csvOpts.deptCol] !== undefined) ? cols[csvOpts.deptCol].trim() : "";

    estoque = (csvOpts.estoqueCol !== null && csvOpts.estoqueCol >= 0 && estRaw) ? (parseInt(estRaw.replace(/\D/g, ""), 10) || 0) : 0;
    if (csvOpts.precoCol !== null && csvOpts.precoCol >= 0 && precRaw) {
      precoCusto = parseFloat(precRaw.replace("R$", "").replace(",", ".")) || 0;
      if (/^\d{6,10}$/.test(precRaw)) {
        precoCusto = parseInt(precRaw, 10) / 100;
      }
    }
  } else {
    // TXT Format
    if (txtOpts.mode === "delimited") {
      let sepChar = "|";
      if (txtOpts.separator === ";") sepChar = ";";
      if (txtOpts.separator === ",") sepChar = ",";
      if (txtOpts.separator === "tab") sepChar = "\t";
      if (txtOpts.separator === "space") sepChar = " ";

      const cols = txtOpts.separator === "space"
        ? line.split(/\s+/).map(c => c.trim())
        : line.split(sepChar).map(c => c.trim());

      ean = (txtOpts.eanCol !== null && txtOpts.eanCol >= 0 && cols[txtOpts.eanCol] !== undefined) ? cols[txtOpts.eanCol].trim() : "";
      sap = (txtOpts.sapCol !== null && txtOpts.sapCol >= 0 && cols[txtOpts.sapCol] !== undefined) ? cols[txtOpts.sapCol].trim() : "";
      desc = (txtOpts.descCol !== null && txtOpts.descCol >= 0 && cols[txtOpts.descCol] !== undefined) ? cols[txtOpts.descCol].trim() : "";
      const estRaw = (txtOpts.estoqueCol !== null && txtOpts.estoqueCol >= 0 && cols[txtOpts.estoqueCol] !== undefined) ? cols[txtOpts.estoqueCol].trim() : "";
      const precRaw = (txtOpts.precoCol !== null && txtOpts.precoCol >= 0 && cols[txtOpts.precoCol] !== undefined) ? cols[txtOpts.precoCol].replace("R$", "").replace(",", ".") : "";
      departamento = (txtOpts.deptCol !== null && txtOpts.deptCol >= 0 && cols[txtOpts.deptCol] !== undefined) ? cols[txtOpts.deptCol].trim() : "";

      estoque = (txtOpts.estoqueCol !== null && txtOpts.estoqueCol >= 0 && estRaw) ? (parseInt(estRaw.replace(/\D/g, ""), 10) || 0) : 0;
      precoCusto = (txtOpts.precoCol !== null && txtOpts.precoCol >= 0 && precRaw) ? (parseFloat(precRaw) || 0) : 0;
    } else {
      // Positional
      const eanStr = txtOpts.posEan.enabled ? line.slice(txtOpts.posEan.start, txtOpts.posEan.end).trim() : "";
      const sapStr = txtOpts.posSap.enabled ? line.slice(txtOpts.posSap.start, txtOpts.posSap.end).trim() : "";
      const descStr = txtOpts.posDesc.enabled ? line.slice(txtOpts.posDesc.start, txtOpts.posDesc.end).trim() : "";
      const estRaw = txtOpts.posEstoque.enabled ? line.slice(txtOpts.posEstoque.start, txtOpts.posEstoque.end).trim() : "";
      const precRaw = txtOpts.posPreco.enabled ? line.slice(txtOpts.posPreco.start, txtOpts.posPreco.end).trim() : "";
      const deptStr = txtOpts.posDept.enabled ? line.slice(txtOpts.posDept.start, txtOpts.posDept.end).trim() : "";

      ean = eanStr;
      sap = sapStr;
      desc = descStr;
      departamento = deptStr;

      estoque = (txtOpts.posEstoque.enabled && estRaw) ? (parseInt(estRaw.replace(/\D/g, ""), 10) || 0) : 0;
      if (txtOpts.posPreco.enabled && precRaw) {
        const numOnly = precRaw.replace(/\D/g, "");
        if (numOnly) {
          precoCusto = parseInt(numOnly, 10) / Math.pow(10, txtOpts.posPreco.decimals);
        }
      }
    }
  }

  if (ean || sap || desc) {
    return {
      ean: ean || "",
      sap: sap || "",
      descricao: desc || "",
      estoque,
      precoCusto,
      departamento: departamento ? departamento.toUpperCase() : ""
    };
  }

  return null;
}

interface Props {
  inventory?: Inventory;
  inventories?: Inventory[];
  companies?: Company[];
  setActiveInventoryId?: (id: string) => void;
  onSync?: () => void;
  setActiveTab?: (tab: any) => void;
}

export default function ProductAddressImport({ 
  inventory, 
  inventories, 
  companies = [], 
  setActiveInventoryId, 
  onSync,
  setActiveTab
}: Props) {
  // Main view tabs: "new" (Importar Novo Arquivo) or "saved" (Bases Salvas)
  const [activeSubTab, setActiveSubTab] = useState<"new" | "saved">("new");

  // Client Name field (User's core requirement: nomear com o cliente que quiser)
  const [clientName, setClientName] = useState("");

  // Append / Overwrite / Create modes
  const [saveMode, setSaveMode] = useState<"append" | "overwrite" | "create">("append");
  const [selectedTargetBaseId, setSelectedTargetBaseId] = useState<string>("");

  // Multi-File & Raw Data states
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [productFormat, setProductFormat] = useState<"csv" | "txt">("csv");
  const [rawData, setRawData] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // CSV Configuration
  const [separator, setSeparator] = useState<";" | "," | "tab" | "space" | "|">(";");
  const [hasHeader, setHasHeader] = useState(true);
  const [eanCol, setEanCol] = useState<number | null>(0);
  const [sapCol, setSapCol] = useState<number | null>(1);
  const [descCol, setDescCol] = useState<number | null>(2);
  const [estoqueCol, setEstoqueCol] = useState<number | null>(3);
  const [precoCol, setPrecoCol] = useState<number | null>(4);
  const [deptCol, setDeptCol] = useState<number | null>(5);

  // TXT Configuration
  const [txtMode, setTxtMode] = useState<"positional" | "delimited">("positional");
  const [txtSeparator, setTxtSeparator] = useState<";" | "," | "tab" | "space" | "|">("|");
  const [txtHasHeader, setTxtHasHeader] = useState(false);
  const [posEanEnabled, setPosEanEnabled] = useState(true);
  const [posEanStart, setPosEanStart] = useState("1");
  const [posEanEnd, setPosEanEnd] = useState("13");
  const [posSapEnabled, setPosSapEnabled] = useState(true);
  const [posSapStart, setPosSapStart] = useState("14");
  const [posSapEnd, setPosSapEnd] = useState("20");
  const [posDescEnabled, setPosDescEnabled] = useState(true);
  const [posDescStart, setPosDescStart] = useState("21");
  const [posDescEnd, setPosDescEnd] = useState("60");
  const [posEstoqueEnabled, setPosEstoqueEnabled] = useState(true);
  const [posEstoqueStart, setPosEstoqueStart] = useState("61");
  const [posEstoqueEnd, setPosEstoqueEnd] = useState("68");
  const [posPrecoEnabled, setPosPrecoEnabled] = useState(true);
  const [posPrecoStart, setPosPrecoStart] = useState("69");
  const [posPrecoEnd, setPosPrecoEnd] = useState("76");
  const [posDeptEnabled, setPosDeptEnabled] = useState(true);
  const [posDeptStart, setPosDeptStart] = useState("77");
  const [posDeptEnd, setPosDeptEnd] = useState("85");
  const [posPrecoDecimals, setPosPrecoDecimals] = useState(2);

  // Processed Preview state
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [totalParsedLines, setTotalParsedLines] = useState(0);

  // Status & Feedback
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ percent: number; stepText: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; stepText: string } | null>(null);

  // Saved Bases Library State
  const [savedBases, setSavedBases] = useState<SavedProductBase[]>([]);
  const [isLoadingBases, setIsLoadingBases] = useState(false);
  const [basesSearchQuery, setBasesSearchQuery] = useState("");
  const [viewingBase, setViewingBase] = useState<SavedProductBase | null>(null);
  const [viewingBaseProducts, setViewingBaseProducts] = useState<Product[]>([]);
  const [isLoadingBaseDetails, setIsLoadingBaseDetails] = useState(false);
  const [viewModalSearch, setViewModalSearch] = useState("");
  const [deletingBaseId, setDeletingBaseId] = useState<string | null>(null);
  const [confirmDeleteBase, setConfirmDeleteBase] = useState<SavedProductBase | null>(null);

  // Duplicate verification toggle option (User requirement)
  const [checkDuplicates, setCheckDuplicates] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load registered companies if not provided via props
  const [localCompanies, setLocalCompanies] = useState<Company[]>(companies);
  useEffect(() => {
    if (companies && companies.length > 0) {
      setLocalCompanies(companies);
    } else {
      fetch("/api/companies")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setLocalCompanies(data);
        })
        .catch(() => {});
    }
  }, [companies]);

  // Load saved bases
  const fetchSavedBases = async () => {
    setIsLoadingBases(true);
    try {
      const res = await fetch("/api/imported-bases");
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setSavedBases(Array.isArray(data) ? data : (data.bases || []));
        } catch (e) {
          console.warn("Resposta não é JSON válido em /api/imported-bases");
        }
      }
    } catch (err) {
      console.error("Erro ao carregar bases salvas:", err);
    } finally {
      setIsLoadingBases(false);
    }
  };

  useEffect(() => {
    fetchSavedBases();
  }, []);

  // Check matching saved base for client name
  const matchingBase = useMemo(() => {
    if (selectedTargetBaseId) {
      return savedBases.find(b => b.id === selectedTargetBaseId) || null;
    }
    if (!clientName.trim()) return null;
    return savedBases.find(b => b.clientName.trim().toLowerCase() === clientName.trim().toLowerCase()) || null;
  }, [clientName, selectedTargetBaseId, savedBases]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(e.target.files);
    }
  };

  const processSelectedFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploadProgress({ percent: 10, stepText: `Analisando ${fileArray.length} arquivo(s)...` });

    const ext = fileArray[0].name.toLowerCase().split(".").pop();
    if (ext === "txt") {
      setProductFormat("txt");
      setTxtMode("delimited");
      setTxtSeparator(";");
    } else {
      setProductFormat("csv");
    }

    if (!clientName.trim()) {
      const cleaned = fileArray[0].name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]/g, " ")
        .replace(/produtos|base|inventario|arquivo|itens/gi, "")
        .trim();
      if (cleaned.length > 2) {
        setClientName(cleaned.toUpperCase());
      }
    }

    let loadedCount = 0;
    const newItems: UploadedFileItem[] = [];

    fileArray.forEach((file) => {
      // Read ONLY sample slice (128 KB) for fast preview & line count estimation without loading full file into memory
      const sampleBlob = file.slice(0, 128 * 1024);
      const reader = new FileReader();

      reader.onload = (event) => {
        const sampleText = (event.target?.result as string) || "";
        const sampleLines = sampleText.split(/\r?\n/);

        const sizeKb = (file.size / 1024).toFixed(1);
        const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${sizeKb} KB`;

        const avgLineBytes = sampleText.length > 0 && sampleLines.length > 1
          ? (sampleBlob.size / sampleLines.length)
          : 80;
        const estimatedLineCount = Math.max(1, Math.round(file.size / Math.max(1, avgLineBytes)));

        newItems.push({
          id: "file_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          name: file.name,
          size: sizeStr,
          file,
          sampleText,
          estimatedLineCount
        });

        loadedCount++;
        const currentPercent = Math.round(15 + (loadedCount / fileArray.length) * 80);
        setUploadProgress({
          percent: currentPercent,
          stepText: `Analisado arquivo ${loadedCount} de ${fileArray.length}: ${file.name} (${sizeStr} - ~${estimatedLineCount.toLocaleString("pt-BR")} linhas)...`
        });

        if (loadedCount === fileArray.length) {
          setUploadedFiles(prev => {
            const updated = [...prev, ...newItems];
            if (updated.length > 0) {
              setFileName(updated.map(f => f.name).join(", "));
              const totalBytes = updated.reduce((acc, f) => acc + f.file.size, 0);
              setFileSize(totalBytes > 1024 * 1024 ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB` : `${(totalBytes / 1024).toFixed(1)} KB`);
            }
            return updated;
          });

          setUploadProgress({
            percent: 100,
            stepText: `${fileArray.length} arquivo(s) analisado(s) com sucesso!`
          });

          setTimeout(() => {
            setUploadProgress(null);
          }, 1000);

          setMessage({
            type: "info",
            text: `${fileArray.length} arquivo(s) preparado(s). Configure os campos de colunas abaixo e clique em Salvar para iniciar a importação streaming.`
          });
        }
      };

      reader.onerror = () => {
        setUploadProgress(null);
        setMessage({ type: "error", text: `Erro ao analisar amostra do arquivo "${file.name}".` });
      };

      reader.readAsText(sampleBlob, "ISO-8859-1");
    });
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      if (updated.length > 0) {
        setFileName(updated.map(f => f.name).join(", "));
        const totalBytes = updated.reduce((acc, f) => acc + f.file.size, 0);
        setFileSize(totalBytes > 1024 * 1024 ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB` : `${(totalBytes / 1024).toFixed(1)} KB`);
      } else {
        setFileName(null);
        setFileSize(null);
        setPreviewProducts([]);
      }
      return updated;
    });
  };

  // Re-process sample data whenever parameters or uploaded files change
  useEffect(() => {
    if (uploadedFiles.length === 0) {
      setPreviewProducts([]);
      setDuplicateCount(0);
      setTotalParsedLines(0);
      return;
    }

    const grandTotalEstimatedLines = uploadedFiles.reduce((acc, f) => acc + f.estimatedLineCount, 0);
    setTotalParsedLines(grandTotalEstimatedLines);

    const sampleProducts: Product[] = [];
    const sampleText = uploadedFiles[0].sampleText || "";
    const lines = sampleText.split(/\r?\n/).slice(0, 60);

    let startIdx = 0;
    if (productFormat === "csv" && hasHeader) startIdx = 1;
    if (productFormat === "txt" && txtMode === "delimited" && txtHasHeader) startIdx = 1;

    const csvOpts = {
      separator,
      eanCol,
      sapCol,
      descCol,
      estoqueCol,
      precoCol,
      deptCol
    };
    const txtOpts = {
      mode: txtMode,
      separator: txtSeparator,
      eanCol,
      sapCol,
      descCol,
      estoqueCol,
      precoCol,
      deptCol,
      posEan: { enabled: posEanEnabled, start: Math.max(0, (parseInt(posEanStart, 10) || 1) - 1), end: parseInt(posEanEnd, 10) || 13 },
      posSap: { enabled: posSapEnabled, start: Math.max(0, (parseInt(posSapStart, 10) || 14) - 1), end: parseInt(posSapEnd, 10) || 20 },
      posDesc: { enabled: posDescEnabled, start: Math.max(0, (parseInt(posDescStart, 10) || 21) - 1), end: parseInt(posDescEnd, 10) || 60 },
      posEstoque: { enabled: posEstoqueEnabled, start: Math.max(0, (parseInt(posEstoqueStart, 10) || 61) - 1), end: parseInt(posEstoqueEnd, 10) || 68 },
      posPreco: { enabled: posPrecoEnabled, start: Math.max(0, (parseInt(posPrecoStart, 10) || 69) - 1), end: parseInt(posPrecoEnd, 10) || 76, decimals: posPrecoDecimals },
      posDept: { enabled: posDeptEnabled, start: Math.max(0, (parseInt(posDeptStart, 10) || 77) - 1), end: parseInt(posDeptEnd, 10) || 85 }
    };

    for (let i = startIdx; i < lines.length; i++) {
      const rawLine = lines[i];
      if (!rawLine) continue;
      const isPositional = productFormat === "txt" && txtMode === "positional";
      const line = isPositional ? rawLine.replace(/\r$/, "") : rawLine.trim();
      if (!line || (!isPositional && !line.trim())) continue;

      const prod = parseLineToProduct(line, productFormat, csvOpts, txtOpts);
      if (prod) {
        sampleProducts.push(prod);
        if (sampleProducts.length >= 50) break;
      }
    }

    setPreviewProducts(sampleProducts);
  }, [
    uploadedFiles, productFormat, separator, hasHeader, 
    eanCol, sapCol, descCol, estoqueCol, precoCol, deptCol,
    txtMode, txtSeparator, txtHasHeader,
    posEanEnabled, posEanStart, posEanEnd,
    posSapEnabled, posSapStart, posSapEnd,
    posDescEnabled, posDescStart, posDescEnd,
    posEstoqueEnabled, posEstoqueStart, posEstoqueEnd,
    posPrecoEnabled, posPrecoStart, posPrecoEnd,
    posDeptEnabled, posDeptStart, posDeptEnd, posPrecoDecimals
  ]);

  const getSessionStatus = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/imported-bases/session-status/${sessionId}?t=${Date.now()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
    return null;
  };

  const sendChunkWithRetry = async (
    sessionId: string,
    chunkIndex: number,
    products: Product[],
    setProgress: React.Dispatch<React.SetStateAction<{ percent: number; stepText: string } | null>>,
    totalLinesProcessed: number,
    totalEstimatedLines: number
  ) => {
    let attempts = 0;
    let success = false;
    let lastErr = "";

    while (attempts < 3 && !success) {
      attempts++;
      try {
        const res = await fetch("/api/imported-bases/chunk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            chunkIndex,
            products
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            success = true;
            break;
          } else {
            lastErr = data.error || "Servidor recusou lote";
          }
        } else {
          lastErr = `HTTP ${res.status}`;
        }
      } catch (err: any) {
        lastErr = err.message || "Erro de conexão / timeout";
      }

      // If request failed or timed out (502, 504, 500), verify session status on backend before assuming failure
      if (!success) {
        setProgress({
          percent: Math.min(88, Math.round((totalLinesProcessed / Math.max(1, totalEstimatedLines)) * 85)),
          stepText: `Servidor está processando a importação (Lote ${chunkIndex + 1}). Verificando estado com o servidor...`
        });

        await new Promise(r => setTimeout(r, 1500));
        const statusData = await getSessionStatus(sessionId);
        if (statusData) {
          if (statusData.status === "completed" || (Array.isArray(statusData.receivedChunks) && statusData.receivedChunks.includes(chunkIndex))) {
            // Server received chunk successfully!
            success = true;
            break;
          }
        }

        if (!success && attempts < 3) {
          setProgress({
            percent: Math.min(88, Math.round((totalLinesProcessed / Math.max(1, totalEstimatedLines)) * 85)),
            stepText: `Reenviando Lote ${chunkIndex + 1} (${attempts + 1}/3 tentativas após aviso do servidor: ${lastErr})...`
          });
          await new Promise(r => setTimeout(r, 1200));
        }
      }
    }

    if (!success) {
      throw new Error(`Não foi possível confirmar o recebimento do Lote ${chunkIndex + 1} pelo servidor (${lastErr}).`);
    }
  };

  // Save parsed products using progressive client-side streaming (10,000 items/chunk) directly from File.slice
  const handleSaveBase = async () => {
    if (!clientName.trim()) {
      setMessage({ type: "error", text: "Por favor, informe o Nome do Cliente para salvar esta base de produtos." });
      return;
    }
    if (uploadedFiles.length === 0) {
      setMessage({ type: "error", text: "Nenhum arquivo de produtos foi selecionado para salvar." });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const totalEstimatedLines = uploadedFiles.reduce((acc, f) => acc + f.estimatedLineCount, 0);
    const combinedFileNames = uploadedFiles.map(f => f.name).join(", ");
    const filesToProcess = uploadedFiles.map(f => f.file);

    setSaveProgress({
      percent: 2,
      stepText: `Iniciando sessão de importação incremental (~${totalEstimatedLines.toLocaleString("pt-BR")} linhas estimadas)...`
    });

    try {
      const activeColumns = {
        ean: eanCol !== null && eanCol >= 0,
        sap: sapCol !== null && sapCol >= 0,
        descricao: descCol !== null && descCol >= 0,
        estoque: estoqueCol !== null && estoqueCol >= 0,
        precoCusto: precoCol !== null && precoCol >= 0,
        departamento: deptCol !== null && deptCol >= 0,
      };

      // Step 1: Start import session on backend
      const startRes = await fetch("/api/imported-bases/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          fileName: combinedFileNames,
          mode: saveMode,
          targetBaseId: selectedTargetBaseId || (matchingBase ? matchingBase.id : undefined),
          checkDuplicates,
          totalExpectedItems: totalEstimatedLines,
          activeColumns
        })
      });

      if (!startRes.ok) {
        const startRaw = await startRes.text();
        let startErrData: any = {};
        try { startErrData = JSON.parse(startRaw); } catch (e) {}
        throw new Error(startErrData.error || `Erro ao iniciar sessão no servidor (Status HTTP ${startRes.status}).`);
      }

      const { sessionId } = await startRes.json();

      const csvOpts = {
        separator,
        eanCol,
        sapCol,
        descCol,
        estoqueCol,
        precoCol,
        deptCol
      };
      const txtOpts = {
        mode: txtMode,
        separator: txtSeparator,
        eanCol,
        sapCol,
        descCol,
        estoqueCol,
        precoCol,
        deptCol,
        posEan: { enabled: posEanEnabled, start: Math.max(0, (parseInt(posEanStart, 10) || 1) - 1), end: parseInt(posEanEnd, 10) || 13 },
        posSap: { enabled: posSapEnabled, start: Math.max(0, (parseInt(posSapStart, 10) || 14) - 1), end: parseInt(posSapEnd, 10) || 20 },
        posDesc: { enabled: posDescEnabled, start: Math.max(0, (parseInt(posDescStart, 10) || 21) - 1), end: parseInt(posDescEnd, 10) || 60 },
        posEstoque: { enabled: posEstoqueEnabled, start: Math.max(0, (parseInt(posEstoqueStart, 10) || 61) - 1), end: parseInt(posEstoqueEnd, 10) || 68 },
        posPreco: { enabled: posPrecoEnabled, start: Math.max(0, (parseInt(posPrecoStart, 10) || 69) - 1), end: parseInt(posPrecoEnd, 10) || 76, decimals: posPrecoDecimals },
        posDept: { enabled: posDeptEnabled, start: Math.max(0, (parseInt(posDeptStart, 10) || 77) - 1), end: parseInt(posDeptEnd, 10) || 85 }
      };

      // Step 2: Stream file slice by slice (1 MB per slice), parsing & sending chunks of 10,000 items
      const CHUNK_ITEM_COUNT = 10000;
      const READ_BYTE_SIZE = 1024 * 1024; // 1 MB slice

      let totalLinesProcessed = 0;
      let chunkIndex = 0;
      let currentChunkProducts: Product[] = [];
      let leftoverText = "";

      for (let fileIdx = 0; fileIdx < filesToProcess.length; fileIdx++) {
        const file = filesToProcess[fileIdx];
        let offset = 0;
        const fileSize = file.size;

        while (offset < fileSize) {
          const sliceEnd = Math.min(offset + READ_BYTE_SIZE, fileSize);
          const blob = file.slice(offset, sliceEnd);
          
          const chunkText = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = (e) => resolve((e.target?.result as string) || "");
            r.onerror = (e) => reject(e);
            r.readAsText(blob, "ISO-8859-1");
          });

          const isFirstSliceOfFile = offset === 0;
          offset = sliceEnd;

          const combinedText = leftoverText + chunkText;
          const lines = combinedText.split(/\r?\n/);

          if (sliceEnd < fileSize) {
            leftoverText = lines.pop() || "";
          } else {
            leftoverText = "";
          }

          let startLineIdx = 0;
          if (isFirstSliceOfFile) {
            if (productFormat === "csv" && hasHeader) startLineIdx = 1;
            if (productFormat === "txt" && txtMode === "delimited" && txtHasHeader) startLineIdx = 1;
          }

          for (let i = startLineIdx; i < lines.length; i++) {
            const rawLine = lines[i];
            if (!rawLine) continue;
            const isPositional = productFormat === "txt" && txtMode === "positional";
            const line = isPositional ? rawLine.replace(/\r$/, "") : rawLine.trim();
            if (!line || (!isPositional && !line.trim())) continue;
            totalLinesProcessed++;

            const prod = parseLineToProduct(line, productFormat, csvOpts, txtOpts);
            if (prod) {
              currentChunkProducts.push(prod);
            }

            if (currentChunkProducts.length >= CHUNK_ITEM_COUNT) {
              const percent = Math.min(88, Math.round((totalLinesProcessed / Math.max(1, totalEstimatedLines)) * 85));
              setSaveProgress({
                percent,
                stepText: `Importando arquivo...\n${totalLinesProcessed.toLocaleString("pt-BR")} / ~${totalEstimatedLines.toLocaleString("pt-BR")} registros`
              });

              await sendChunkWithRetry(sessionId, chunkIndex, currentChunkProducts, setSaveProgress, totalLinesProcessed, totalEstimatedLines);
              chunkIndex++;
              // FREES MEMORY IMMEDIATELY
              currentChunkProducts = [];
            }
          }
        }

        if (leftoverText) {
          const rawLine = leftoverText;
          const isPositional = productFormat === "txt" && txtMode === "positional";
          const line = isPositional ? rawLine.replace(/\r$/, "") : rawLine.trim();
          if (line && (!isPositional || line.trim())) {
            totalLinesProcessed++;
            const prod = parseLineToProduct(line, productFormat, csvOpts, txtOpts);
            if (prod) currentChunkProducts.push(prod);
          }
          leftoverText = "";
        }
      }

      if (currentChunkProducts.length > 0) {
        setSaveProgress({
          percent: 88,
          stepText: `Importando arquivo...\n${totalLinesProcessed.toLocaleString("pt-BR")} / ~${totalEstimatedLines.toLocaleString("pt-BR")} registros`
        });
        await sendChunkWithRetry(sessionId, chunkIndex, currentChunkProducts, setSaveProgress, totalLinesProcessed, totalEstimatedLines);
        chunkIndex++;
        currentChunkProducts = [];
      }

      // Step 3: Finish session and consolidate base
      setSaveProgress({
        percent: 92,
        stepText: "Servidor está finalizando a consolidação da base..."
      });

      let finishData: any = null;
      let finishOk = false;

      try {
        const finishRes = await fetch("/api/imported-bases/finish-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId })
        });

        if (finishRes.ok) {
          finishData = await finishRes.json();
          if (finishData && finishData.success) {
            finishOk = true;
          }
        } else {
          try {
            const errBody = await finishRes.json();
            if (errBody && errBody.error) {
              throw new Error(errBody.error);
            }
          } catch (pe) {
            if (pe instanceof Error && !pe.message.includes("JSON")) throw pe;
          }
        }
      } catch (e: any) {
        if (e && e.message && !e.message.includes("fetch")) {
          throw e;
        }
        // Network timeout / 502 / proxy disconnection, continue to robust polling
      }

      // If finish-session response was not OK immediately, poll session status!
      if (!finishOk) {
        setSaveProgress({
          percent: 95,
          stepText: "Servidor está finalizando a importação...\nAguardando confirmação do servidor..."
        });

        let pollCount = 0;
        const maxPolls = 240; // Up to 10 minutes of status polling (60 attempts x 2.5s)

        while (pollCount < maxPolls && !finishOk) {
          pollCount++;
          await new Promise(r => setTimeout(r, 2500));

          const statusData = await getSessionStatus(sessionId);
          if (statusData) {
            if (statusData.status === "completed" && statusData.result) {
              finishData = statusData.result;
              finishOk = true;
              break;
            } else if (statusData.status === "failed") {
              throw new Error(statusData.error || "Erro reportado pelo servidor durante a consolidação da base.");
            } else if (statusData.status === "finishing" || statusData.status === "processing") {
              setSaveProgress({
                percent: Math.min(99, 93 + Math.floor(pollCount / 10)),
                stepText: `Servidor está finalizando a importação... (${pollCount * 2}s decorridos)\nAguardando confirmação do servidor...`
              });
            }
          }
        }
      }

      // Final fallback check: verify if base was saved to the system index
      if (!finishOk || !finishData) {
        try {
          const basesRes = await fetch("/api/imported-bases");
          if (basesRes.ok) {
            const allBases = await basesRes.json();
            const list = Array.isArray(allBases) ? allBases : (allBases.bases || []);
            const found = list.find((b: any) => b.clientName?.toLowerCase().trim() === clientName.trim().toLowerCase());
            if (found) {
              finishData = {
                success: true,
                base: found,
                mode: saveMode,
                totalProducts: found.totalProducts,
                newAddedCount: found.totalProducts
              };
              finishOk = true;
            }
          }
        } catch (checkErr) {}
      }

      if (!finishOk || !finishData) {
        throw new Error("O servidor demorou para responder a consolidação final. Por favor, recarregue a página ou verifique a aba 'Bases de Produtos Salvas' para confirmar.");
      }

      setSaveProgress({ percent: 100, stepText: "✅ Importação concluída com sucesso!" });

      if (finishData.mode === "append") {
        setMessage({
          type: "success",
          text: `Base do cliente "${clientName.trim()}" atualizada com sucesso! +${(finishData.newAddedCount || 0).toLocaleString("pt-BR")} novos produtos adicionados (Total consolidado: ${(finishData.totalProducts || 0).toLocaleString("pt-BR")} SKUs. ${(finishData.duplicateCount || 0).toLocaleString("pt-BR")} duplicados unificados no servidor).`
        });
      } else {
        setMessage({
          type: "success",
          text: `Base do cliente "${clientName.trim()}" salva com sucesso com ${(finishData.totalProducts || totalLinesProcessed).toLocaleString("pt-BR")} produtos!`
        });
      }

      // Reset form
      setUploadedFiles([]);
      setFileName(null);
      setFileSize(null);
      setPreviewProducts([]);
      setClientName("");
      setSelectedTargetBaseId("");
      setSaveMode("append");

      await fetchSavedBases();
      setTimeout(() => {
        setSaveProgress(null);
        setActiveSubTab("saved");
      }, 1200);
    } catch (err: any) {
      setSaveProgress(null);
      setMessage({
        type: "error",
        text: err.message || "Erro durante o envio da base em lotes para o servidor."
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete saved base
  const handleDeleteBase = async (baseId: string) => {
    setDeletingBaseId(baseId);
    try {
      const res = await fetch(`/api/imported-bases/${baseId}`, { method: "DELETE" });
      if (res.ok) {
        setSavedBases(prev => prev.filter(b => b.id !== baseId));
        setConfirmDeleteBase(null);
        setMessage({ type: "success", text: "Base de produtos excluída com sucesso." });
      } else {
        setMessage({ type: "error", text: "Falha ao excluir a base de produtos." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Erro ao excluir a base de produtos." });
    } finally {
      setDeletingBaseId(null);
    }
  };

  // View full details of a saved base
  const handleOpenViewBase = async (base: SavedProductBase) => {
    setViewingBase(base);
    setIsLoadingBaseDetails(true);
    setViewModalSearch("");
    try {
      const res = await fetch(`/api/imported-bases/${base.id}`);
      if (res.ok) {
        const data = await res.json();
        setViewingBaseProducts(data.products || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingBaseDetails(false);
    }
  };

  // Download CSV of a saved base (only exporting columns that were selected/imported)
  const handleDownloadBaseCsv = (base: SavedProductBase, productsList: Product[]) => {
    if (!productsList || productsList.length === 0) return;
    
    const colsActive = base.activeColumns || {
      ean: true,
      sap: true,
      descricao: true,
      estoque: true,
      precoCusto: true,
      departamento: true
    };

    const headerParts: string[] = [];
    if (colsActive.ean) headerParts.push("EAN");
    if (colsActive.sap) headerParts.push("SAP");
    if (colsActive.descricao) headerParts.push("DESCRICAO");
    if (colsActive.estoque) headerParts.push("ESTOQUE");
    if (colsActive.precoCusto) headerParts.push("PRECO_CUSTO");
    if (colsActive.departamento) headerParts.push("DEPARTAMENTO");

    const header = headerParts.join(";") + "\n";

    const rows = productsList.map(p => {
      const parts: string[] = [];
      if (colsActive.ean) parts.push(`"${p.ean || ""}"`);
      if (colsActive.sap) parts.push(`"${p.sap || ""}"`);
      if (colsActive.descricao) parts.push(`"${p.descricao || ""}"`);
      if (colsActive.estoque) parts.push(`${p.estoque ?? 0}`);
      if (colsActive.precoCusto) parts.push(`${(p.precoCusto ?? 0).toFixed(2).replace(".", ",")}`);
      if (colsActive.departamento) parts.push(`"${p.departamento || ""}"`);
      return parts.join(";");
    }).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `base_${base.clientName.toLowerCase().replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter saved bases by search
  const filteredSavedBases = useMemo(() => {
    if (!basesSearchQuery.trim()) return savedBases;
    const q = basesSearchQuery.toLowerCase();
    return savedBases.filter(b => 
      (b.clientName && b.clientName.toLowerCase().includes(q)) ||
      (b.fileName && b.fileName.toLowerCase().includes(q))
    );
  }, [savedBases, basesSearchQuery]);

  // Filter products inside the view modal
  const filteredModalProducts = useMemo(() => {
    if (!viewModalSearch.trim()) return viewingBaseProducts;
    const q = viewModalSearch.toLowerCase();
    return viewingBaseProducts.filter(p => 
      (p.ean && p.ean.toLowerCase().includes(q)) ||
      (p.sap && p.sap.toLowerCase().includes(q)) ||
      (p.descricao && p.descricao.toLowerCase().includes(q)) ||
      (p.departamento && p.departamento.toLowerCase().includes(q))
    );
  }, [viewingBaseProducts, viewModalSearch]);

  // Calculate quick summary metrics
  const totalSavedProductsCount = useMemo(() => {
    return savedBases.reduce((acc, b) => acc + (b.totalProducts || 0), 0);
  }, [savedBases]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* HEADER */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Importar Bases
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                  Arquivos por Cliente
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Importe planilhas (.CSV) ou arquivos (.TXT) e salve a base associada ao nome de cada cliente para carregar nos inventários.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Bases Salvas</span>
            <span className="text-base font-extrabold text-white">{savedBases.length}</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total SKUs</span>
            <span className="text-base font-extrabold text-blue-400">{totalSavedProductsCount.toLocaleString("pt-BR")}</span>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS HELPER BANNER */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900 leading-relaxed">
        <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold text-blue-950">Fluxo Direto de Importação:</strong>
          <p>
            1. Carregue seu arquivo de produtos aqui, digite o <strong>Nome do Cliente</strong> e clique em <strong>Salvar Base</strong>.<br />
            2. Quando estiver no <strong>Painel de Mapeamento</strong> do inventário, clique no botão <strong>PRODUTOS</strong> para apenas selecionar a base salva do cliente desejado e puxar para dentro daquele inventário!
          </p>
        </div>
      </div>

      {/* TABS NAVIGATION: NOVA IMPORTAÇÃO vs BASES SALVAS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab("new")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "new"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Nova Importação de Arquivo</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab("saved");
            fetchSavedBases();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "saved"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Bases de Clientes Salvas</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold ${
            activeSubTab === "saved" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
          }`}>
            {savedBases.length}
          </span>
        </button>
      </div>

      {/* FEEDBACK BANNER */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-150 ${
          message.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : message.type === "error"
            ? "bg-red-50 text-red-800 border-red-200"
            : "bg-blue-50 text-blue-800 border-blue-200"
        }`}>
          <div className="flex items-center gap-2">
            {message.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
            {message.type === "error" && <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
            {message.type === "info" && <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: NOVA IMPORTAÇÃO DE ARQUIVO */}
      {activeSubTab === "new" && (
        <div className="space-y-6">
          
          {/* PASSO 1: NOME DO CLIENTE E MODO DE IMPORTAÇÃO */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Identificação do Cliente e Destino da Base
                </h3>
              </div>

              {matchingBase && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  Base existente: {matchingBase.totalProducts?.toLocaleString("pt-BR")} itens
                </span>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Nome do Cliente para Salvar a Base *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  setSelectedTargetBaseId("");
                }}
                placeholder="Ex: Supermercado Extra, Drogaria São Paulo, Loja Matriz..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500">
                Este nome identificará o arquivo salvo para você poder escolher facilmente no botão "Produtos" dentro do inventário.
              </p>
            </div>

            {/* If an existing base exists for this client or is selected */}
            {matchingBase && (
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-3">
                <div className="flex items-center gap-2 text-blue-900">
                  <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-bold">
                    O que deseja fazer com a base existente de "{matchingBase.clientName}"?
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    saveMode === "append" 
                      ? "bg-white border-blue-500 shadow-xs ring-1 ring-blue-500/20" 
                      : "bg-white/70 border-slate-200 hover:bg-white"
                  }`}>
                    <input
                      type="radio"
                      name="saveMode"
                      value="append"
                      checked={saveMode === "append"}
                      onChange={() => setSaveMode("append")}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">➕ Acrescentar à Base</span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                        Adiciona novos produtos mantendo os atuais e remove códigos duplicados automaticamente.
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    saveMode === "overwrite" 
                      ? "bg-white border-amber-500 shadow-xs ring-1 ring-amber-500/20" 
                      : "bg-white/70 border-slate-200 hover:bg-white"
                  }`}>
                    <input
                      type="radio"
                      name="saveMode"
                      value="overwrite"
                      checked={saveMode === "overwrite"}
                      onChange={() => setSaveMode("overwrite")}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">🔄 Sobrescrever</span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                        Substitui completamente a base anterior por estes novos arquivos.
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    saveMode === "create" 
                      ? "bg-white border-slate-400 shadow-xs ring-1 ring-slate-400/20" 
                      : "bg-white/70 border-slate-200 hover:bg-white"
                  }`}>
                    <input
                      type="radio"
                      name="saveMode"
                      value="create"
                      checked={saveMode === "create"}
                      onChange={() => setSaveMode("create")}
                      className="mt-0.5 text-slate-600 focus:ring-slate-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">✨ Nova Base Separada</span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                        Salva como uma base adicional independente.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Quick base selection or client selection */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              {savedBases.length > 0 && (
                <div className="flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Ou selecione uma base já salva para acrescentar arquivos:
                  </span>
                  <select
                    value={selectedTargetBaseId || (matchingBase ? matchingBase.id : "")}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setSelectedTargetBaseId(selId);
                      const found = savedBases.find(b => b.id === selId);
                      if (found) {
                        setClientName(found.clientName);
                        setSaveMode("append");
                      }
                    }}
                    className="w-full sm:max-w-md px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700"
                  >
                    <option value="">-- Escolher uma base existente --</option>
                    {savedBases.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.clientName} ({b.totalProducts?.toLocaleString("pt-BR")} produtos) - {b.fileName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {localCompanies.length > 0 && !matchingBase && (
                <div className="pt-1">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Clientes cadastrados:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {localCompanies.slice(0, 5).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setClientName(c.nomeFantasia || c.razaoSocial);
                          setSelectedTargetBaseId("");
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                      >
                        {c.nomeFantasia || c.razaoSocial}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PASSO 2: SELEÇÃO E UPLOAD DE UM OU MAIS ARQUIVOS */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Carregar Arquivos de Produtos
                </h3>
              </div>

              {/* Format selection */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setProductFormat("csv")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    productFormat === "csv" 
                      ? "bg-white text-blue-700 shadow-xs" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Planilha Delimitada (.CSV)
                </button>
                <button
                  type="button"
                  onClick={() => setProductFormat("txt")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    productFormat === "txt" 
                      ? "bg-white text-blue-700 shadow-xs" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Texto Posicional (.TXT)
                </button>
              </div>
            </div>

            {/* Upload Progress Bar */}
            {uploadProgress && (
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Processando Arquivos...</span>
                  </span>
                  <span className="font-mono font-bold text-blue-700">{uploadProgress.percent}%</span>
                </div>
                <div className="w-full bg-blue-200/60 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </div>
                <p className="text-[11px] text-blue-700 font-medium">
                  {uploadProgress.stepText}
                </p>
              </div>
            )}

            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50 scale-[1.005]"
                  : "border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".csv,.txt,.tsv,.prn"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2.5 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  Clique para selecionar um ou mais arquivos ou arraste para cá
                </p>
                <p className="text-xs text-slate-500">
                  Você pode selecionar <strong>vários arquivos CSV ou TXT</strong> de uma vez. O sistema irá unificar todos e remover códigos duplicados automaticamente.
                </p>
              </div>
            </div>

            {/* LIST OF LOADED FILES */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Arquivos Carregados ({uploadedFiles.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Outro Arquivo</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {uploadedFiles.map((fileItem) => (
                    <div
                      key={fileItem.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-bold text-slate-800 truncate block font-mono">
                            {fileItem.name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {fileItem.size} • ~{fileItem.estimatedLineCount.toLocaleString("pt-BR")} linhas estimadas
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(fileItem.id);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remover arquivo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PASSO 3: CONFIGURAÇÃO DE COLUNAS */}
          {uploadedFiles.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Mapeamento de Colunas do Arquivo
                </h3>
              </div>

              {productFormat === "csv" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Separador de Colunas:
                      </label>
                      <select
                        value={separator}
                        onChange={(e) => setSeparator(e.target.value as any)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white font-medium"
                      >
                        <option value=";">Ponto e vírgula (;)</option>
                        <option value=",">Vírgula (,)</option>
                        <option value="tab">Tabulação (\t)</option>
                        <option value="|">Barra vertical (|)</option>
                        <option value="space">Espaço</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="hasHeaderChk"
                        checked={hasHeader}
                        onChange={(e) => setHasHeader(e.target.checked)}
                        className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="hasHeaderChk" className="text-xs font-semibold text-slate-700 cursor-pointer">
                        Primeira linha é cabeçalho
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="checkDuplicatesChk"
                        checked={checkDuplicates}
                        onChange={(e) => setCheckDuplicates(e.target.checked)}
                        className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="checkDuplicatesChk" className="text-xs font-semibold text-slate-700 cursor-pointer">
                        Verificar e remover códigos duplicados
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* COL EAN */}
                    <div className={`p-2.5 rounded-xl border transition-all ${
                      eanCol !== null && eanCol >= 0 
                        ? 'bg-white border-slate-300 shadow-xs' 
                        : 'bg-slate-100/90 border-dashed border-slate-300'
                    }`}>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <label className="text-[11px] font-bold text-slate-800 truncate" title="Col. EAN">Col. EAN</label>
                        <button
                          type="button"
                          onClick={() => setEanCol(eanCol !== null && eanCol >= 0 ? null : 0)}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                            eanCol !== null && eanCol >= 0
                              ? 'text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200'
                              : 'text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-200'
                          }`}
                        >
                          {eanCol !== null && eanCol >= 0 ? "Ignorar" : "+ Importar"}
                        </button>
                      </div>
                      {eanCol !== null && eanCol >= 0 ? (
                        <input
                          type="number"
                          min={0}
                          value={eanCol}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEanCol(v === "" ? null : Math.max(0, parseInt(v) || 0));
                          }}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-center bg-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Nº Coluna"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEanCol(0)}
                          className="w-full border border-dashed border-slate-300 rounded-lg py-2 px-1 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 bg-slate-50 transition-colors block text-[10px] font-semibold text-slate-400"
                        >
                          Não importar
                        </button>
                      )}
                    </div>

                    {/* COL SAP */}
                    <div className={`p-2.5 rounded-xl border transition-all ${
                      sapCol !== null && sapCol >= 0 
                        ? 'bg-white border-slate-300 shadow-xs' 
                        : 'bg-slate-100/90 border-dashed border-slate-300'
                    }`}>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <label className="text-[11px] font-bold text-slate-800 truncate" title="Col. SAP / Ref">Col. SAP / Ref</label>
                        <button
                          type="button"
                          onClick={() => setSapCol(sapCol !== null && sapCol >= 0 ? null : 1)}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                            sapCol !== null && sapCol >= 0
                              ? 'text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200'
                              : 'text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-200'
                          }`}
                        >
                          {sapCol !== null && sapCol >= 0 ? "Ignorar" : "+ Importar"}
                        </button>
                      </div>
                      {sapCol !== null && sapCol >= 0 ? (
                        <input
                          type="number"
                          min={0}
                          value={sapCol}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSapCol(v === "" ? null : Math.max(0, parseInt(v) || 0));
                          }}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-center bg-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Nº Coluna"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSapCol(1)}
                          className="w-full border border-dashed border-slate-300 rounded-lg py-2 px-1 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 bg-slate-50 transition-colors block text-[10px] font-semibold text-slate-400"
                        >
                          Não importar
                        </button>
                      )}
                    </div>

                    {/* COL DESCRICAO */}
                    <div className={`p-2.5 rounded-xl border transition-all ${
                      descCol !== null && descCol >= 0 
                        ? 'bg-white border-slate-300 shadow-xs' 
                        : 'bg-slate-100/90 border-dashed border-slate-300'
                    }`}>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <label className="text-[11px] font-bold text-slate-800 truncate" title="Col. Descrição">Col. Descrição</label>
                        <button
                          type="button"
                          onClick={() => setDescCol(descCol !== null && descCol >= 0 ? null : 2)}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                            descCol !== null && descCol >= 0
                              ? 'text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200'
                              : 'text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-200'
                          }`}
                        >
                          {descCol !== null && descCol >= 0 ? "Ignorar" : "+ Importar"}
                        </button>
                      </div>
                      {descCol !== null && descCol >= 0 ? (
                        <input
                          type="number"
                          min={0}
                          value={descCol}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDescCol(v === "" ? null : Math.max(0, parseInt(v) || 0));
                          }}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-center bg-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Nº Coluna"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDescCol(2)}
                          className="w-full border border-dashed border-slate-300 rounded-lg py-2 px-1 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 bg-slate-50 transition-colors block text-[10px] font-semibold text-slate-400"
                        >
                          Não importar
                        </button>
                      )}
                    </div>

                    {/* COL ESTOQUE */}
                    <div className={`p-2.5 rounded-xl border transition-all ${
                      estoqueCol !== null && estoqueCol >= 0 
                        ? 'bg-white border-slate-300 shadow-xs' 
                        : 'bg-slate-100/90 border-dashed border-slate-300'
                    }`}>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <label className="text-[11px] font-bold text-slate-800 truncate" title="Col. Estoque">Col. Estoque</label>
                        <button
                          type="button"
                          onClick={() => setEstoqueCol(estoqueCol !== null && estoqueCol >= 0 ? null : 3)}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                            estoqueCol !== null && estoqueCol >= 0
                              ? 'text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200'
                              : 'text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-200'
                          }`}
                        >
                          {estoqueCol !== null && estoqueCol >= 0 ? "Ignorar" : "+ Importar"}
                        </button>
                      </div>
                      {estoqueCol !== null && estoqueCol >= 0 ? (
                        <input
                          type="number"
                          min={0}
                          value={estoqueCol}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEstoqueCol(v === "" ? null : Math.max(0, parseInt(v) || 0));
                          }}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-center bg-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Nº Coluna"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEstoqueCol(3)}
                          className="w-full border border-dashed border-slate-300 rounded-lg py-2 px-1 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 bg-slate-50 transition-colors block text-[10px] font-semibold text-slate-400"
                        >
                          Não importar
                        </button>
                      )}
                    </div>

                    {/* COL PRECO */}
                    <div className={`p-2.5 rounded-xl border transition-all ${
                      precoCol !== null && precoCol >= 0 
                        ? 'bg-white border-slate-300 shadow-xs' 
                        : 'bg-slate-100/90 border-dashed border-slate-300'
                    }`}>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <label className="text-[11px] font-bold text-slate-800 truncate" title="Col. Preço Custo">Col. Preço Custo</label>
                        <button
                          type="button"
                          onClick={() => setPrecoCol(precoCol !== null && precoCol >= 0 ? null : 4)}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                            precoCol !== null && precoCol >= 0
                              ? 'text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200'
                              : 'text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-200'
                          }`}
                        >
                          {precoCol !== null && precoCol >= 0 ? "Ignorar" : "+ Importar"}
                        </button>
                      </div>
                      {precoCol !== null && precoCol >= 0 ? (
                        <input
                          type="number"
                          min={0}
                          value={precoCol}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPrecoCol(v === "" ? null : Math.max(0, parseInt(v) || 0));
                          }}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-center bg-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Nº Coluna"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPrecoCol(4)}
                          className="w-full border border-dashed border-slate-300 rounded-lg py-2 px-1 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 bg-slate-50 transition-colors block text-[10px] font-semibold text-slate-400"
                        >
                          Não importar
                        </button>
                      )}
                    </div>

                    {/* COL DEPARTAMENTO */}
                    <div className={`p-2.5 rounded-xl border transition-all ${
                      deptCol !== null && deptCol >= 0 
                        ? 'bg-white border-slate-300 shadow-xs' 
                        : 'bg-slate-100/90 border-dashed border-slate-300'
                    }`}>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <label className="text-[11px] font-bold text-slate-800 truncate" title="Col. Departamento">Col. Departamento</label>
                        <button
                          type="button"
                          onClick={() => setDeptCol(deptCol !== null && deptCol >= 0 ? null : 5)}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                            deptCol !== null && deptCol >= 0
                              ? 'text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200'
                              : 'text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-200'
                          }`}
                        >
                          {deptCol !== null && deptCol >= 0 ? "Ignorar" : "+ Importar"}
                        </button>
                      </div>
                      {deptCol !== null && deptCol >= 0 ? (
                        <input
                          type="number"
                          min={0}
                          value={deptCol}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDeptCol(v === "" ? null : Math.max(0, parseInt(v) || 0));
                          }}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-center bg-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Nº Coluna"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeptCol(5)}
                          className="w-full border border-dashed border-slate-300 rounded-lg py-2 px-1 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 bg-slate-50 transition-colors block text-[10px] font-semibold text-slate-400"
                        >
                          Não importar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* TXT POSITIONAL / DELIMITED CONFIG */
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-4">
                      <label className="text-xs font-semibold text-slate-700">Modo TXT:</label>
                      <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                        <input
                          type="radio"
                          checked={txtMode === "positional"}
                          onChange={() => setTxtMode("positional")}
                          className="text-blue-600"
                        />
                        Posicional (Início / Fim)
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                        <input
                          type="radio"
                          checked={txtMode === "delimited"}
                          onChange={() => setTxtMode("delimited")}
                          className="text-blue-600"
                        />
                        Delimitado
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                      <input
                        type="checkbox"
                        id="checkDuplicatesTxtChk"
                        checked={checkDuplicates}
                        onChange={(e) => setCheckDuplicates(e.target.checked)}
                        className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="checkDuplicatesTxtChk" className="text-xs font-semibold text-slate-700 cursor-pointer">
                        Verificar e remover códigos duplicados
                      </label>
                    </div>
                  </div>

                  {txtMode === "positional" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {/* EAN */}
                      <div className={`p-2.5 rounded-xl border transition-all ${
                        posEanEnabled ? 'bg-slate-50 border-slate-300' : 'bg-slate-100/90 border-dashed border-slate-300'
                      }`}>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[11px] font-bold text-slate-800">EAN</span>
                          <button
                            type="button"
                            onClick={() => setPosEanEnabled(!posEanEnabled)}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                              posEanEnabled ? 'text-rose-600 hover:bg-rose-50' : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                            }`}
                          >
                            {posEanEnabled ? "Ignorar" : "+ Importar"}
                          </button>
                        </div>
                        {posEanEnabled ? (
                          <div className="flex gap-1 items-center">
                            <input type="text" value={posEanStart} onChange={e => setPosEanStart(e.target.value)} className="w-full border rounded p-1 text-xs text-center font-mono bg-white" placeholder="Início" />
                            <span className="text-slate-400">-</span>
                            <input type="text" value={posEanEnd} onChange={e => setPosEanEnd(e.target.value)} className="w-full border rounded p-1 text-xs text-center font-mono bg-white" placeholder="Fim" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPosEanEnabled(true)}
                            className="w-full border border-dashed border-slate-300 rounded py-1 px-1 text-center cursor-pointer hover:border-blue-400 bg-slate-50 text-[10px] font-semibold text-slate-400 block"
                          >
                            Não importar
                          </button>
                        )}
                      </div>

                      {/* SAP */}
                      <div className={`p-2.5 rounded-xl border transition-all ${
                        posSapEnabled ? 'bg-slate-50 border-slate-300' : 'bg-slate-100/90 border-dashed border-slate-300'
                      }`}>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[11px] font-bold text-slate-800">SAP</span>
                          <button
                            type="button"
                            onClick={() => setPosSapEnabled(!posSapEnabled)}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                              posSapEnabled ? 'text-rose-600 hover:bg-rose-50' : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                            }`}
                          >
                            {posSapEnabled ? "Ignorar" : "+ Importar"}
                          </button>
                        </div>
                        {posSapEnabled ? (
                          <div className="flex gap-1 items-center">
                            <input type="text" value={posSapStart} onChange={e => setPosSapStart(e.target.value)} className="w-full border rounded p-1 text-xs text-center font-mono bg-white" placeholder="Início" />
                            <span className="text-slate-400">-</span>
                            <input type="text" value={posSapEnd} onChange={e => setPosSapEnd(e.target.value)} className="w-full border rounded p-1 text-xs text-center font-mono bg-white" placeholder="Fim" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPosSapEnabled(true)}
                            className="w-full border border-dashed border-slate-300 rounded py-1 px-1 text-center cursor-pointer hover:border-blue-400 bg-slate-50 text-[10px] font-semibold text-slate-400 block"
                          >
                            Não importar
                          </button>
                        )}
                      </div>

                      {/* DESCRICAO */}
                      <div className={`p-2.5 rounded-xl border transition-all ${
                        posDescEnabled ? 'bg-slate-50 border-slate-300' : 'bg-slate-100/90 border-dashed border-slate-300'
                      }`}>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[11px] font-bold text-slate-800">Descrição</span>
                          <button
                            type="button"
                            onClick={() => setPosDescEnabled(!posDescEnabled)}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                              posDescEnabled ? 'text-rose-600 hover:bg-rose-50' : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                            }`}
                          >
                            {posDescEnabled ? "Ignorar" : "+ Importar"}
                          </button>
                        </div>
                        {posDescEnabled ? (
                          <div className="flex gap-1 items-center">
                            <input type="text" value={posDescStart} onChange={e => setPosDescStart(e.target.value)} className="w-full border rounded p-1 text-xs text-center font-mono bg-white" placeholder="Início" />
                            <span className="text-slate-400">-</span>
                            <input type="text" value={posDescEnd} onChange={e => setPosDescEnd(e.target.value)} className="w-full border rounded p-1 text-xs text-center font-mono bg-white" placeholder="Fim" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPosDescEnabled(true)}
                            className="w-full border border-dashed border-slate-300 rounded py-1 px-1 text-center cursor-pointer hover:border-blue-400 bg-slate-50 text-[10px] font-semibold text-slate-400 block"
                          >
                            Não importar
                          </button>
                        )}
                      </div>

                      {/* ESTOQUE */}
                      <div className={`p-2.5 rounded-xl border transition-all ${
                        posEstoqueEnabled ? 'bg-slate-50 border-slate-300' : 'bg-slate-100/90 border-dashed border-slate-300'
                      }`}>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[11px] font-bold text-slate-800">Estoque</span>
                          <button
                            type="button"
                            onClick={() => setPosEstoqueEnabled(!posEstoqueEnabled)}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                              posEstoqueEnabled ? 'text-rose-600 hover:bg-rose-50' : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                            }`}
                          >
                            {posEstoqueEnabled ? "Ignorar" : "+ Importar"}
                          </button>
                        </div>
                        {posEstoqueEnabled ? (
                          <div className="flex gap-1 items-center">
                            <input type="text" value={posEstoqueStart} onChange={e => setPosEstoqueStart(e.target.value)} className="w-full border rounded p-1 text-xs text-center font-mono bg-white" placeholder="Início" />
                            <span className="text-slate-400">-</span>
                            <input type="text" value={posEstoqueEnd} onChange={e => setPosEstoqueEnd(e.target.value)} className="w-full border rounded p-1 text-xs text-center font-mono bg-white" placeholder="Fim" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPosEstoqueEnabled(true)}
                            className="w-full border border-dashed border-slate-300 rounded py-1 px-1 text-center cursor-pointer hover:border-blue-400 bg-slate-50 text-[10px] font-semibold text-slate-400 block"
                          >
                            Não importar
                          </button>
                        )}
                      </div>

                      {/* PRECO */}
                      <div className={`p-2.5 rounded-xl border transition-all ${
                        posPrecoEnabled ? 'bg-slate-50 border-slate-300' : 'bg-slate-100/90 border-dashed border-slate-300'
                      }`}>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[11px] font-bold text-slate-800">Preço</span>
                          <button
                            type="button"
                            onClick={() => setPosPrecoEnabled(!posPrecoEnabled)}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                              posPrecoEnabled ? 'text-rose-600 hover:bg-rose-50' : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                            }`}
                          >
                            {posPrecoEnabled ? "Ignorar" : "+ Importar"}
                          </button>
                        </div>
                        {posPrecoEnabled ? (
                          <div className="flex gap-1 items-center">
                            <input type="text" value={posPrecoStart} onChange={e => setPosPrecoStart(e.target.value)} className="w-full border rounded p-1 text-xs text-center font-mono bg-white" placeholder="Início" />
                            <span className="text-slate-400">-</span>
                            <input type="text" value={posPrecoEnd} onChange={e => setPosPrecoEnd(e.target.value)} className="w-full border rounded p-1 text-xs text-center font-mono bg-white" placeholder="Fim" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPosPrecoEnabled(true)}
                            className="w-full border border-dashed border-slate-300 rounded py-1 px-1 text-center cursor-pointer hover:border-blue-400 bg-slate-50 text-[10px] font-semibold text-slate-400 block"
                          >
                            Não importar
                          </button>
                        )}
                      </div>

                      {/* DEPTO */}
                      <div className={`p-2.5 rounded-xl border transition-all ${
                        posDeptEnabled ? 'bg-slate-50 border-slate-300' : 'bg-slate-100/90 border-dashed border-slate-300'
                      }`}>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[11px] font-bold text-slate-800">Depto</span>
                          <button
                            type="button"
                            onClick={() => setPosDeptEnabled(!posDeptEnabled)}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                              posDeptEnabled ? 'text-rose-600 hover:bg-rose-50' : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                            }`}
                          >
                            {posDeptEnabled ? "Ignorar" : "+ Importar"}
                          </button>
                        </div>
                        {posDeptEnabled ? (
                          <div className="flex gap-1 items-center">
                            <input type="text" value={posDeptStart} onChange={e => setPosDeptStart(e.target.value)} className="w-full border rounded p-1 text-xs text-center font-mono bg-white" placeholder="Início" />
                            <span className="text-slate-400">-</span>
                            <input type="text" value={posDeptEnd} onChange={e => setPosDeptEnd(e.target.value)} className="w-full border rounded p-1 text-xs text-center font-mono bg-white" placeholder="Fim" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPosDeptEnabled(true)}
                            className="w-full border border-dashed border-slate-300 rounded py-1 px-1 text-center cursor-pointer hover:border-blue-400 bg-slate-50 text-[10px] font-semibold text-slate-400 block"
                          >
                            Não importar
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PASSO 4: PRÉVIA E SALVAR BASE */}
          {previewProducts.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center">
                    4
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Prévia dos Produtos Analisados
                    </h3>
                    <p className="text-xs text-slate-500">
                      Mostrando os primeiros {Math.min(15, previewProducts.length)} itens da amostra (estimados ~{totalParsedLines.toLocaleString("pt-BR")} registros no total).
                    </p>
                  </div>
                </div>

                {/* BOTÃO SALVAR BASE DO CLIENTE */}
                <button
                  type="button"
                  onClick={handleSaveBase}
                  disabled={isSaving}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processando e Salvando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Salvar Base de Produtos deste Cliente</span>
                    </>
                  )}
                </button>
              </div>

              {/* SAVE PROGRESS BAR */}
              {saveProgress && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-950 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Progresso do Salvamento da Base</span>
                    </span>
                    <span className="font-mono font-extrabold text-emerald-700 text-sm">{saveProgress.percent}%</span>
                  </div>
                  <div className="w-full bg-emerald-200/70 rounded-full h-3 overflow-hidden shadow-inner">
                    <div 
                      className="bg-emerald-600 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${saveProgress.percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-emerald-800 font-medium whitespace-pre-line">
                    {saveProgress.stepText}
                  </p>
                </div>
              )}

              {/* STATS STRIP */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-blue-700 block">Linhas Estimadas</span>
                  <span className="text-base font-extrabold text-blue-950">~{totalParsedLines.toLocaleString("pt-BR")}</span>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">Tamanho Total</span>
                  <span className="text-base font-extrabold text-emerald-950">{fileSize || "—"}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">Deduplicação Servidor</span>
                  <span className="text-xs font-bold text-slate-800 block mt-0.5">{checkDuplicates ? "Ativada no Servidor" : "Desativada"}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-600 block">Cliente Atribuído</span>
                  <span className="text-xs font-bold text-blue-700 truncate block mt-0.5">
                    {clientName.trim() || "NÃO PREENCHIDO"}
                  </span>
                </div>
              </div>

              {/* TABLE PREVIEW */}
              <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">EAN</th>
                      <th className="px-3 py-2.5">SAP</th>
                      <th className="px-3 py-2.5">Descrição</th>
                      <th className="px-3 py-2.5 text-right">Estoque</th>
                      <th className="px-3 py-2.5 text-right">Preço</th>
                      <th className="px-3 py-2.5">Departamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewProducts.slice(0, 15).map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2 font-mono font-semibold text-slate-800">{p.ean || <span className="text-slate-400 font-sans italic font-normal">—</span>}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{p.sap || <span className="text-slate-400 font-sans italic font-normal">—</span>}</td>
                        <td className="px-3 py-2 font-medium text-slate-900 truncate max-w-[220px]">{p.descricao || <span className="text-slate-400 font-sans italic font-normal">—</span>}</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-700">{p.estoque !== undefined && p.estoque !== null ? p.estoque : 0}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">R$ {(p.precoCusto || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-slate-600">{p.departamento || <span className="text-slate-400 font-sans italic font-normal">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB 2: BASES DE CLIENTES SALVAS */}
      {activeSubTab === "saved" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Repositório de Bases Salvas por Cliente
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Todas as bases salvas aqui estão disponíveis para serem selecionadas pelo botão <strong>PRODUTOS</strong> no Painel de Mapeamento.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchSavedBases}
              disabled={isLoadingBases}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBases ? "animate-spin text-blue-600" : ""}`} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* SEARCH IN BASES */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={basesSearchQuery}
              onChange={(e) => setBasesSearchQuery(e.target.value)}
              placeholder="Buscar por nome do cliente ou arquivo salvo..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
            />
            {basesSearchQuery && (
              <button
                onClick={() => setBasesSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* BASES LIST */}
          {isLoadingBases ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Carregando bases salvas...</p>
            </div>
          ) : savedBases.length === 0 ? (
            <div className="py-12 px-6 rounded-2xl border-2 border-dashed border-slate-200 text-center bg-white flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="max-w-md">
                <h4 className="text-sm font-bold text-slate-800">
                  Nenhuma base de produtos salva ainda
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Clique na aba <strong>Nova Importação de Arquivo</strong> acima para carregar o arquivo CSV/TXT do seu primeiro cliente e salvá-lo aqui.
                </p>
              </div>
              <button
                onClick={() => setActiveSubTab("new")}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-600/20 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Meu Primeiro Arquivo</span>
              </button>
            </div>
          ) : filteredSavedBases.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200">
              Nenhuma base encontrada para o termo "<strong>{basesSearchQuery}</strong>".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSavedBases.map((base) => (
                <div
                  key={base.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                        Cliente
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(base.importDate).toLocaleDateString("pt-BR")}
                      </span>
                    </div>

                    <h4 className="text-base font-extrabold text-slate-900">
                      {base.clientName}
                    </h4>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-mono">{base.fileName}</span>
                    </div>

                    {/* METRICS */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 block uppercase">Produtos / SKUs</span>
                        <span className="text-sm font-extrabold text-slate-900">
                          {base.totalProducts?.toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 block uppercase">Peças Estoque</span>
                        <span className="text-sm font-extrabold text-emerald-700">
                          {base.totalEstoque > 0 ? base.totalEstoque?.toLocaleString("pt-BR") : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => handleOpenViewBase(base)}
                      className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ver Itens</span>
                    </button>

                    <button
                      onClick={() => {
                        setClientName(base.clientName);
                        setSelectedTargetBaseId(base.id);
                        setSaveMode("append");
                        setActiveSubTab("new");
                        // Scroll to top
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="py-2 px-3 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Acrescentar mais arquivos a esta base"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      <span>+ Acrescentar</span>
                    </button>

                    <button
                      onClick={() => setConfirmDeleteBase(base)}
                      className="p-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                      title="Excluir base"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW BASE PRODUCTS MODAL */}
      {viewingBase && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Base: {viewingBase.clientName}
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {viewingBaseProducts.length.toLocaleString("pt-BR")} produtos
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Arquivo original: {viewingBase.fileName}</p>
                </div>
              </div>

              <button
                onClick={() => setViewingBase(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={viewModalSearch}
                  onChange={e => setViewModalSearch(e.target.value)}
                  placeholder="Buscar por EAN, SAP, Descrição ou Depto..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <button
                onClick={() => handleDownloadBaseCsv(viewingBase, viewingBaseProducts)}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {isLoadingBaseDetails ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-xs">Carregando catálogo de produtos...</span>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">EAN</th>
                        <th className="px-3 py-2">SAP</th>
                        <th className="px-3 py-2">Descrição</th>
                        <th className="px-3 py-2 text-right">Estoque</th>
                        <th className="px-3 py-2 text-right">Preço Custo</th>
                        <th className="px-3 py-2">Departamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredModalProducts.slice(0, 100).map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-mono font-semibold text-slate-800">{p.ean || <span className="text-slate-400 font-sans italic font-normal">—</span>}</td>
                          <td className="px-3 py-1.5 font-mono text-slate-600">{p.sap || <span className="text-slate-400 font-sans italic font-normal">—</span>}</td>
                          <td className="px-3 py-1.5 font-medium text-slate-900">{p.descricao || <span className="text-slate-400 font-sans italic font-normal">—</span>}</td>
                          <td className="px-3 py-1.5 text-right font-semibold text-slate-700">{p.estoque !== undefined && p.estoque !== null ? p.estoque : 0}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-700">R$ {(p.precoCusto || 0).toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-slate-600">{p.departamento || <span className="text-slate-400 font-sans italic font-normal">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredModalProducts.length > 100 && (
                    <div className="p-2 text-center text-[11px] text-slate-500 bg-slate-50 border-t border-slate-200">
                      Exibindo os primeiros 100 produtos de {filteredModalProducts.length.toLocaleString("pt-BR")} correspondentes.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingBase(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmDeleteBase && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Excluir Base Salva?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tem certeza que deseja excluir a base salva do cliente <strong className="text-slate-900">{confirmDeleteBase.clientName}</strong>?
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteBase(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteBase(confirmDeleteBase.id)}
                disabled={deletingBaseId !== null}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {deletingBaseId !== null ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sim, Excluir</span>
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
