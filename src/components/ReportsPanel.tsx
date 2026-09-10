import React, { useState, useRef, useEffect } from "react";
import { Inventory, Product, Sector, Section, ColetaItem, Operator } from "../types";
import { Download, FileText, CheckCircle, BarChart3, AlertTriangle, PenTool, RefreshCw, Layers, Printer, Shield, FileSpreadsheet, Search } from "lucide-react";


interface Props {
  inventory: Inventory;
  operators: Operator[];
  onSync: () => void;
}

export default function ReportsPanel({ inventory, operators, onSync }: Props) {
  const [activeReport, setActiveReport] = useState<"export_txt" | "export_excel" | "productivity" | "divergences" | "zerados" | "final_summary">("final_summary");
  const [feedback, setFeedback] = useState("");

  // State for Final Summary inputs (Page 25)
  const [coordenadorInput, setCoordenadorInput] = useState(inventory?.coordenador || "SICRANO DA SILVA");
  const [gerenteInput, setGerenteInput] = useState(inventory?.gerente || "FULANO DE TAL");
  const [inicioEstoque, setInicioEstoque] = useState(inventory?.inicioEstoque || "08:00");
  const [terminoEstoque, setTerminoEstoque] = useState(inventory?.terminoEstoque || "12:00");
  const [inicioLoja, setInicioLoja] = useState(inventory?.inicioLoja || "13:00");
  const [terminoLoja, setTerminoLoja] = useState(inventory?.terminoLoja || "18:00");
  const [inicioDivergencia, setInicioDivergencia] = useState(inventory?.inicioDivergencia || "18:30");
  const [terminoDivergencia, setTerminoDivergencia] = useState(inventory?.terminoDivergencia || "20:00");

  // Signature canvas refs
  const canvasGerenteRef = useRef<HTMLCanvasElement>(null);
  const canvasCoordRef = useRef<HTMLCanvasElement>(null);
  const [gerenteSigned, setGerenteSigned] = useState(!!inventory?.assinaturaGerente);
  const [coordSigned, setCoordSigned] = useState(!!inventory?.assinaturaCoordenador);

  // TXT Exporter options (Page 21-22)
  const [txtSeparator, setTxtSeparator] = useState(";");
  const [txtMode, setTxtMode] = useState<"consolidated" | "by_sector" | "by_area" | "line_by_line" | "pixel">("consolidated");
  const [fixedLength, setFixedLength] = useState(false);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [prefixChar, setPrefixChar] = useState("");
  const [decimalSep, setDecimalSep] = useState(",");
  const [decimalPlaces, setDecimalPlaces] = useState(2);

  // Search filter for code lookup (Page 17)
  const [searchCode, setSearchCode] = useState("");
  const [searchResult, setSearchResult] = useState<any[]>([]);

  // Consolidate all counts for calculations
  const allCollectedItems: ColetaItem[] = [];
  const allProductivityItems: ColetaItem[] = [];
  const countedSections: { sectorName: string; code: string; status: string; opName: string; itemsCount: number; piecesCount: number }[] = [];

  inventory.sectors.forEach(sec => {
    sec.sections.forEach(s => {
      if (s.contagens && s.contagens.length > 0) {
        const validContagemForPieces = s.contagens[s.contagens.length - 1];
        s.contagens.forEach(c => {
          c.items.forEach(it => {
            allProductivityItems.push(it);
            if (!inventory.compara || c === validContagemForPieces) {
              allCollectedItems.push(it);
            }
          });
        });
        
        // Push section info
        const lastCount = s.contagens[s.contagens.length - 1];
        countedSections.push({
          sectorName: sec.nome,
          code: s.code,
          status: s.status,
          opName: lastCount?.operatorName || "Desconhecido",
          itemsCount: lastCount?.items.length || 0,
          piecesCount: lastCount?.items.reduce((acc, it) => acc + it.quantidade, 0) || 0
        });
      }
    });
  });

  // Code Lookup (Page 17 - Imagem 28)
  function handleCodeSearch() {
    if (!searchCode.trim()) return;
    const results: any[] = [];
    
    inventory.sectors.forEach(sec => {
      sec.sections.forEach(s => {
        s.contagens.forEach((c, cIdx) => {
          c.items.forEach(it => {
            if (it.ean === searchCode.trim() || it.sap === searchCode.trim()) {
              results.push({
                sectorName: sec.nome,
                sectionCode: s.code,
                operatorName: c.operatorName,
                quantidade: it.quantidade,
                timestamp: c.transmitTime,
                lote: it.lote,
                validade: it.validade
              });
            }
          });
        });
      });
    });
    setSearchResult(results);
  }

  // Draw Signature logic
  function setupCanvas(canvas: HTMLCanvasElement | null, savedBase64?: string) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";

    if (savedBase64) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = savedBase64;
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  useEffect(() => {
    if (activeReport === "final_summary") {
      setupCanvas(canvasGerenteRef.current, inventory.assinaturaGerente);
      setupCanvas(canvasCoordRef.current, inventory.assinaturaCoordenador);
    }
  }, [activeReport, inventory]);

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement | null, isGerente: boolean) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    
    // Support mouse or touch
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    let lastX = clientX - rect.left;
    let lastY = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);

    const draw = (moveEvent: any) => {
      const currentClientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentClientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const x = currentClientX - rect.left;
      const y = currentClientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      window.removeEventListener("mousemove", draw);
      window.removeEventListener("mouseup", stopDrawing);
      window.removeEventListener("touchmove", draw);
      window.removeEventListener("touchend", stopDrawing);
      
      // Save signature to state
      if (isGerente) setGerenteSigned(true);
      else setCoordSigned(true);
    };

    window.addEventListener("mousemove", draw);
    window.addEventListener("mouseup", stopDrawing);
    window.addEventListener("touchmove", draw, { passive: true });
    window.addEventListener("touchend", stopDrawing);
  }

  function clearCanvas(canvas: HTMLCanvasElement | null, isGerente: boolean) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (isGerente) setGerenteSigned(false);
    else setCoordSigned(false);
  }

  async function handleSaveSummaryData() {
    const gerenteSig64 = canvasGerenteRef.current?.toDataURL();
    const coordSig64 = canvasCoordRef.current?.toDataURL();

    const updatedInv = {
      ...inventory,
      coordenador: coordenadorInput,
      gerente: gerenteInput,
      inicioEstoque,
      terminoEstoque,
      inicioLoja,
      terminoLoja,
      inicioDivergencia,
      terminoDivergencia,
      assinaturaGerente: gerenteSigned ? gerenteSig64 : undefined,
      assinaturaCoordenador: coordSigned ? coordSig64 : undefined
    };

    try {
      const res = await fetch("/api/inventories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedInv)
      });
      if (res.ok) {
        setFeedback("Parâmetros do relatório de Resumo Final salvos com sucesso no servidor!");
        onSync();
        setTimeout(() => setFeedback(""), 4000);
      } else {
        setFeedback("Erro: Falha do servidor centralizado ao salvar os parâmetros.");
      }
    } catch(err) {
      setFeedback("Erro: Falha na conexão de rede com o servidor centralizado.");
    }
  }

  // EXPORT TXT FILE SIMULATION (Page 19-21)
  function handleDownloadTXT() {
    let rows: string[] = [];

    if (includeHeader) {
      rows.push("CODIGO" + txtSeparator + "QTDE" + (txtMode === "by_sector" ? txtSeparator + "SETOR" : "") + (txtMode === "by_area" || txtMode === "pixel" ? txtSeparator + "AREA" : "") + (txtMode === "pixel" ? txtSeparator + "FILIAL" : ""));
    }

    // Sum quantities based on export mode
    if (txtMode === "consolidated") {
      const sums: { [ean: string]: number } = {};
      allCollectedItems.forEach(it => { sums[it.ean] = (sums[it.ean] || 0) + it.quantidade; });
      Object.keys(sums).forEach(ean => {
        let valStr = String(sums[ean]);
        if (fixedLength) {
          valStr = valStr.padStart(8, "0"); // Pad count as in Page 1 (0000008)
        }
        rows.push(`${ean}${txtSeparator}${valStr}`);
      });
    } else if (txtMode === "pixel") {
      // Pixel mode: EAN;QTY;AREA;FILIAL
      inventory.sectors.forEach(sec => {
        sec.sections.forEach(s => {
          const sums: { [ean: string]: number } = {};
          s.contagens.forEach(c => {
            c.items.forEach(it => {
              sums[it.ean] = (sums[it.ean] || 0) + it.quantidade;
            });
          });
          Object.keys(sums).forEach(ean => {
            let valStr = String(sums[ean]);
            if (fixedLength) valStr = valStr.padStart(8, "0");
            rows.push(`${ean}${txtSeparator}${valStr}${txtSeparator}${s.code}${txtSeparator}${inventory.filial}`);
          });
        });
      });
    } else if (txtMode === "by_sector") {
      // sector summed
      const sums: { [key: string]: { ean: string; sector: string; qty: number } } = {};
      inventory.sectors.forEach(sec => {
        sec.sections.forEach(s => {
          s.contagens.forEach(c => {
            c.items.forEach(it => {
              const k = `${sec.nome}_${it.ean}`;
              if (!sums[k]) {
                sums[k] = { ean: it.ean, sector: sec.nome, qty: 0 };
              }
              sums[k].qty += it.quantidade;
            });
          });
        });
      });
      Object.values(sums).forEach(row => {
        rows.push(`${row.ean}${txtSeparator}${row.qty}${txtSeparator}${row.sector}`);
      });
    } else {
      // Line by line or by area
      allCollectedItems.forEach(it => {
        rows.push(`${it.ean}${txtSeparator}${it.quantidade}`);
      });
    }

    const content = rows.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `INVENTARIO_${inventory.nome.replace(/\s+/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // EXPORT EXCEL FILE SIMULATION (Page 24 - Imagem 40)
  function handleDownloadExcel() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "IDINVENTARIO;SETOR;AREA;CODIGO;DESCRICAO;QTD;INFOEXTRA;DATAHORA\n";

    inventory.sectors.forEach(sec => {
      sec.sections.forEach(s => {
        s.contagens.forEach(c => {
          c.items.forEach(it => {
            const row = [
              inventory.id,
              sec.nome,
              s.code,
              it.ean,
              it.descricao.replace(/;/g, " "),
              it.quantidade,
              it.infoExtra ? it.infoExtra.join(",") : "",
              it.timestamp
            ].join(";");
            csvContent += row + "\n";
          });
        });
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = `EXCEL_${inventory.nome.replace(/\s+/g, "_")}.csv`;
    link.click();
  }

  // CALCULATE PRODUCTIVITY METRICS (Page 24 - Imagem 42)
  const operatorProductivity = operators.map(op => {
    const opItems = allProductivityItems.filter(it => it.operatorId === op.id);
    const totalPieces = opItems.reduce((acc, it) => acc + it.quantidade, 0);
    const uniqueCodes = new Set(opItems.map(it => it.ean)).size;
    const scansCount = opItems.length; // Raw scans without multiplier
    
    // Simulating active durations (e.g. 1 hour, or computed from timestamps)
    const durationHours = 4.5; 
    const durationStr = "04:30:00";
    
    const piecesPerHour = scansCount > 0 ? (totalPieces / durationHours).toFixed(1) : "0.0";
    const scansPerHour = scansCount > 0 ? (scansCount / durationHours).toFixed(1) : "0.0";

    return {
      name: op.nomeCompleto,
      totalPieces,
      uniqueCodes,
      scansCount,
      piecesPerHour,
      scansPerHour,
      durationStr
    };
  }).filter(p => p.scansCount > 0);

  // CALCULATE DISCREPANCIES (Page 26 - Compara)
  const discrepanciesList: { sectionCode: string; sectorName: string; count1: number; count2: number; resolved: boolean }[] = [];
  inventory.sectors.forEach(sec => {
    sec.sections.forEach(s => {
      if (s.contagens && s.contagens.length >= 2) {
        const qty1 = s.contagens[0].items.reduce((acc, it) => acc + it.quantidade, 0);
        const qty2 = s.contagens[1].items.reduce((acc, it) => acc + it.quantidade, 0);
        if (qty1 !== qty2 || s.status === "DIVERGENTE") {
          discrepanciesList.push({
            sectionCode: s.code,
            sectorName: sec.nome,
            count1: qty1,
            count2: qty2,
            resolved: s.status === "CONFERIDO_OK"
          });
        }
      }
    });
  });

  // ZERADOS REPORT (Page 27)
  // Items in product list but NOT counted
  const countedEans = new Set(allCollectedItems.map(it => it.ean));
  const zeradosList = inventory.products.filter(p => !countedEans.has(p.ean));
  const totalZeradosValue = zeradosList.reduce((acc, p) => acc + (p.estoque * p.precoCusto), 0);

  // RUPTURA REPORT (Page 27)
  // Items counted in stock (ESTOQUE) but not counted in store layout (LOJA)
  const stockEans = new Set<string>();
  const storeEans = new Set<string>();
  
  inventory.sectors.forEach(sec => {
    sec.sections.forEach(s => {
      s.contagens.forEach(c => {
        c.items.forEach(it => {
          if (sec.tipo === "ESTOQUE") stockEans.add(it.ean);
          if (sec.tipo === "LOJA") storeEans.add(it.ean);
        });
      });
    });
  });

  const rupturaEans = Array.from(stockEans).filter(ean => !storeEans.has(ean));
  const rupturaList = inventory.products.filter(p => rupturaEans.includes(p.ean));

  // AVARIA REPORT (Page 27)
  const avariaItems: { ean: string; descricao: string; qty: number; value: number }[] = [];
  inventory.sectors.forEach(sec => {
    if (sec.nome.includes("AVARIA") || sec.tipo === "AVARIA") {
      sec.sections.forEach(s => {
        s.contagens.forEach(c => {
          c.items.forEach(it => {
            const val = it.quantidade * (inventory.products.find(p => p.ean === it.ean)?.precoCusto || 0);
            avariaItems.push({
              ean: it.ean,
              descricao: it.descricao || "AVARIADO",
              qty: it.quantidade,
              value: val
            });
          });
        });
      });
    }
  });

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      {/* Sidebar / Menu Selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-100 p-2 rounded-lg text-cyan-700">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Relatórios do Inventário: {inventory.nome}</h2>
            <p className="text-xs text-slate-500">Filial: {inventory.filial} • ID: {inventory.id}</p>
          </div>
        </div>
        
        {/* Navigation Selector */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
          <button onClick={() => setActiveReport("final_summary")} className={`px-2.5 py-1.5 rounded-md transition-all ${activeReport === "final_summary" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}>
            Resumo Final (PDF)
          </button>
          <button onClick={() => setActiveReport("productivity")} className={`px-2.5 py-1.5 rounded-md transition-all ${activeReport === "productivity" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}>
            Produtividade
          </button>
          <button onClick={() => setActiveReport("divergences")} className={`px-2.5 py-1.5 rounded-md transition-all ${activeReport === "divergences" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}>
            Divergências ({discrepanciesList.length})
          </button>
          <button onClick={() => setActiveReport("zerados")} className={`px-2.5 py-1.5 rounded-md transition-all ${activeReport === "zerados" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}>
            Rupturas & Zerados
          </button>
          <button onClick={() => setActiveReport("export_txt")} className={`px-2.5 py-1.5 rounded-md transition-all ${activeReport === "export_txt" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}>
            Exportar TXT
          </button>
          <button onClick={() => setActiveReport("export_excel")} className={`px-2.5 py-1.5 rounded-md transition-all ${activeReport === "export_excel" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}>
            Exportar Excel
          </button>
        </div>
      </div>

      {/* CORE LOOKUP (Page 17 - Imagem 28) */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <span className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1">
          <Search className="w-3.5 h-3.5 text-cyan-600" /> Consulta Rápida de Código (Rastreabilidade)
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Digite Código EAN ou SAP para buscar as seções onde foi contado"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none"
          />
          <button
            onClick={handleCodeSearch}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-1.5 rounded text-xs"
          >
            Buscar Rastro
          </button>
        </div>

        {searchResult.length > 0 && (
          <div className="mt-2 bg-white border border-slate-200 rounded p-2 text-xs space-y-1.5 font-mono max-h-36 overflow-y-auto">
            <span className="font-bold text-slate-800">Resultado da busca por: {searchCode}</span>
            {searchResult.map((res, idx) => (
              <div key={idx} className="border-b border-slate-100 pb-1 flex justify-between text-[11px]">
                <span>Setor: <b>{res.sectorName}</b> | Seção: <b>{res.sectionCode}</b></span>
                <span>Operador: <b>{res.operatorName}</b> | Qtd: <b className="text-cyan-600">x{res.quantidade}</b></span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 1. EXPORT TXT CONFIGURATOR (Page 21-22) */}
      {activeReport === "export_txt" && (
        <div className="space-y-4">
          <div className="bg-cyan-50 border border-cyan-100 text-cyan-800 p-3 rounded-lg text-xs">
            <span className="font-bold">Mapeador do Layout de Saída de TXT</span>
            <p className="mt-1">
              Configure as colunas, caracteres de preenchimento de campos e alinhamento do arquivo de retorno
              para sincronizar com o ERP do cliente (SAP, etc.).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700 block">Opções de Exportação</span>
              
              <div>
                <label className="block text-slate-600 mb-1">Modo de Exportação</label>
                <select value={txtMode} onChange={(e: any) => setTxtMode(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1">
                  <option value="consolidated">Consolidado (Quantidades somadas por códigos)</option>
                  <option value="by_sector">Consolidado por setor (Somadas por setor e código)</option>
                  <option value="by_area">Consolidado por área/seção (Somadas por área e código)</option>
                  <option value="pixel">Layout Pixel (Formato específico de exportação)</option>
                  <option value="line_by_line">Linha a linha (Conforme cada bipe individual)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Delimitador Separador</label>
                <select value={txtSeparator} onChange={(e) => setTxtSeparator(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1">
                  <option value=";">Ponto e vírgula (;)</option>
                  <option value=",">Vírgula (,)</option>
                  <option value="\t">Tabulação (\t)</option>
                  <option value="|">Barra vertical (|)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={fixedLength} onChange={(e) => setFixedLength(e.target.checked)} className="rounded" />
                  <span>Qtd Caracteres Fixo (Preencher saldo com até 8 dígitos/zeros)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={includeHeader} onChange={(e) => setIncludeHeader(e.target.checked)} className="rounded" />
                  <span>Incluir Cabeçalho de Colunas na primeira linha</span>
                </label>
              </div>
            </div>

            <div className="bg-slate-950 text-slate-100 p-3 rounded-lg font-mono text-[10px] space-y-2 relative">
              <span className="font-bold text-cyan-400 block border-b border-slate-800 pb-1">PRÉVIA DO ARQUIVO .TXT GERADO:</span>
              <pre className="max-h-40 overflow-y-auto">
{includeHeader && `CODIGO${txtSeparator}QTDE${txtMode === "by_sector" ? txtSeparator + "SETOR" : ""}${txtMode === "by_area" || txtMode === "pixel" ? txtSeparator + "AREA" : ""}${txtMode === "pixel" ? txtSeparator + "FILIAL" : ""}\n`}
{`7896181909705${txtSeparator}${fixedLength ? "00000008" : "8"}${txtMode === "by_sector" ? txtSeparator + "B - MEDICAMENTO" : ""}${txtMode === "by_area" || txtMode === "pixel" ? txtSeparator + "2392" : ""}${txtMode === "pixel" ? txtSeparator + inventory.filial : ""}`}
{`\n7891317004347${txtSeparator}${fixedLength ? "00000002" : "2"}${txtMode === "by_sector" ? txtSeparator + "B - MEDICAMENTO" : ""}${txtMode === "by_area" || txtMode === "pixel" ? txtSeparator + "2392" : ""}${txtMode === "pixel" ? txtSeparator + inventory.filial : ""}`}
{`\n7891317010362${txtSeparator}${fixedLength ? "00000001" : "1"}${txtMode === "by_sector" ? txtSeparator + "B - MEDICAMENTO" : ""}${txtMode === "by_area" || txtMode === "pixel" ? txtSeparator + "2392" : ""}${txtMode === "pixel" ? txtSeparator + inventory.filial : ""}`}
              </pre>
              <div className="absolute bottom-2 right-2">
                <span className="text-[8px] text-slate-500">Consolidado em real-time ({inventory.nome})</span>
              </div>
            </div>
          </div>

          <button onClick={handleDownloadTXT} className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-2.5 px-5 rounded text-xs flex items-center gap-1.5 font-mono">
            <Download className="w-4 h-4" /> CONFIGURAR E BAIXAR ARQUIVO .TXT
          </button>
        </div>
      )}

      {/* 2. EXPORT EXCEL SIMULATOR (Page 24 - Imagem 40) */}
      {activeReport === "export_excel" && (
        <div className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-lg text-xs flex justify-between items-center">
            <div>
              <span className="font-bold block">Relatório Consolidado para Excel (.CSV)</span>
              <p>Contém todas as informações do inventário em colunas padronizadas para análise estatística e Pivot Tables.</p>
            </div>
            <button onClick={handleDownloadExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded text-xs flex items-center gap-1">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px] font-mono">
              <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                <tr>
                  <th className="p-2 border-r border-slate-200">IDINVENTARIO</th>
                  <th className="p-2 border-r border-slate-200">SETOR</th>
                  <th className="p-2 border-r border-slate-200">AREA</th>
                  <th className="p-2 border-r border-slate-200">CODIGO</th>
                  <th className="p-2 border-r border-slate-200">DESCRICAO</th>
                  <th className="p-2 border-r border-slate-200">QTD</th>
                  <th className="p-2 border-r border-slate-200">INFOEXTRA</th>
                  <th className="p-2">DATAHORA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {countedSections.length === 0 ? (
                  <tr><td colSpan={8} className="p-4 text-center text-slate-400 italic">Nenhum dado coletado ainda.</td></tr>
                ) : (
                  allCollectedItems.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 text-slate-400">{inventory.id}</td>
                      <td className="p-2 border-r border-slate-200 text-slate-800 font-bold">{inventory.sectors[0]?.nome || "GERAL"}</td>
                      <td className="p-2 border-r border-slate-200 text-cyan-600 font-bold">2392</td>
                      <td className="p-2 border-r border-slate-200 text-slate-900 font-bold">{it.ean}</td>
                      <td className="p-2 border-r border-slate-200 font-sans truncate max-w-[150px]">{it.descricao}</td>
                      <td className="p-2 border-r border-slate-200 text-center font-bold text-emerald-600">{it.quantidade}</td>
                      <td className="p-2 border-r border-slate-200 text-slate-400">{it.infoExtra ? it.infoExtra.join(",") : "NI"}</td>
                      <td className="p-2 text-slate-500 text-[10px]">{it.timestamp.slice(11, 19)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PRODUCTIVITY REPORT (Page 24 - Imagem 42) */}
      {activeReport === "productivity" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-cyan-600" /> Relatório de Produtividade por Operador
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Duração de amostragem: 04:30:00</span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold font-mono">
                <tr className="border-b border-slate-200">
                  <th className="p-3">Operador</th>
                  <th className="p-3 text-right">Qtd/h Peças</th>
                  <th className="p-3 text-right">Bipes/h</th>
                  <th className="p-3 text-right">Códigos Únicos</th>
                  <th className="p-3 text-right">Qtd Total Peças</th>
                  <th className="p-3 text-right">Bipes Totais</th>
                  <th className="p-3 text-center">Duração Ativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {operatorProductivity.length === 0 ? (
                  <tr><td colSpan={7} className="p-4 text-center text-slate-400 italic">Nenhum operador com atividade registrada.</td></tr>
                ) : (
                  operatorProductivity.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 font-bold font-sans text-slate-800">{p.name}</td>
                      <td className="p-3 text-right text-emerald-600 font-bold">{p.piecesPerHour}</td>
                      <td className="p-3 text-right text-cyan-600 font-bold">{p.scansPerHour}</td>
                      <td className="p-3 text-right text-slate-700 font-bold">{p.uniqueCodes}</td>
                      <td className="p-3 text-right text-slate-950 font-bold">{p.totalPieces}</td>
                      <td className="p-3 text-right text-slate-500">{p.scansCount}</td>
                      <td className="p-3 text-center text-slate-500">{p.durationStr}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. DIVERGENCES & COMPARA (Page 15/26) */}
      {activeReport === "divergences" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-100 text-amber-900 p-3 rounded-lg text-xs space-y-1">
            <span className="font-bold flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Confronto de Dupla Contagem (Compara)
            </span>
            <p>
              Exibe seções que foram contadas por duas equipes diferentes e que apresentaram divergência de quantidade ou de códigos.
              Para que recebam o ícone amarelo de validado, as contagens devem estar perfeitamente iguais.
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-600 font-mono font-semibold">
                <tr className="border-b border-slate-200">
                  <th className="p-3">Seção / Área</th>
                  <th className="p-3">Setor Mapeado</th>
                  <th className="p-3 text-right">1ª Contagem Qtd</th>
                  <th className="p-3 text-right">2ª Contagem Qtd</th>
                  <th className="p-3 text-center">Status de Auditoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {discrepanciesList.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-slate-400 italic">Nenhuma divergência identificada até o momento.</td></tr>
                ) : (
                  discrepanciesList.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 text-cyan-600 font-bold">#{d.sectionCode}</td>
                      <td className="p-3 font-sans text-slate-700">{d.sectorName}</td>
                      <td className="p-3 text-right font-bold text-slate-700">{d.count1}</td>
                      <td className="p-3 text-right font-bold text-slate-700">{d.count2}</td>
                      <td className="p-3 text-center">
                        {d.resolved ? (
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-sans font-bold">
                            OK (Conferido)
                          </span>
                        ) : (
                          <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full text-[10px] font-sans font-bold animate-pulse">
                            Divergente (A conferir)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. ZERADOS & RUPTURA (Page 27) */}
      {activeReport === "zerados" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Relatório de Zerados */}
          <div className="space-y-3 bg-white border border-slate-200 rounded-lg p-3">
            <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800">Relatório de Zerados ({zeradosList.length} itens)</span>
              <span className="text-[10px] bg-rose-100 text-rose-900 font-bold px-1.5 py-0.5 rounded">R$ {totalZeradosValue.toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-slate-500 italic">Produtos que contam no sistema do cliente, mas não foram bipados na loja/estoque.</p>
            
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {zeradosList.slice(0, 10).map((p, idx) => (
                <div key={`${p.ean}-${idx}`} className="bg-slate-50 p-2 rounded text-[10px] font-mono flex justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">{p.descricao}</span>
                    <span className="text-slate-400">EAN: {p.ean} | SAP: {p.sap}</span>
                  </div>
                  <div className="text-right self-center">
                    <span className="text-rose-600 font-bold">x{p.estoque}</span>
                  </div>
                </div>
              ))}
              {zeradosList.length > 10 && (
                <div className="text-center text-[10px] text-slate-400 pt-1">
                  ...e mais {zeradosList.length - 10} itens zerados.
                </div>
              )}
            </div>
          </div>

          {/* Relatório de Ruptura */}
          <div className="space-y-3 bg-white border border-slate-200 rounded-lg p-3">
            <div className="border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800">Relatório de Ruptura ({rupturaList.length} itens)</span>
            </div>
            <p className="text-[10px] text-slate-500 italic">Produtos contados no Estoque principal, mas sem nenhuma unidade na Loja/Prateleiras.</p>

            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {rupturaList.length === 0 ? (
                <div className="text-center py-6 text-slate-400 italic text-xs">Nenhum item com ruptura registrado.</div>
              ) : (
                rupturaList.slice(0, 10).map((p, idx) => (
                  <div key={`${p.ean}-${idx}`} className="bg-slate-50 p-2 rounded text-[10px] font-mono flex justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">{p.descricao}</span>
                      <span className="text-slate-400">EAN: {p.ean}</span>
                    </div>
                    <div className="text-right self-center text-amber-600 font-bold font-sans">
                      RUPTURA
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. FINAL SUMMARY / RESUMO FINAL WITH DIGITAL SIGNATURE (Page 25 - Imagem 43/44) */}
      {activeReport === "final_summary" && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <span className="text-xs font-bold text-slate-800 block border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <PenTool className="w-4 h-4 text-cyan-600" /> Parâmetros e Configuração do Resumo Final (In Loco)
            </span>

            {feedback && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 rounded-lg text-xs font-mono">
                {feedback}
              </div>
            )}

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">Nome do Gerente</label>
                <input type="text" value={gerenteInput} onChange={e => setGerenteInput(e.target.value.toUpperCase())} className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold font-sans uppercase" />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Nome do Coordenador</label>
                <input type="text" value={coordenadorInput} onChange={e => setCoordenadorInput(e.target.value.toUpperCase())} className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold font-sans uppercase" />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Horário Estoque</label>
                <div className="flex gap-1">
                  <input type="text" value={inicioEstoque} onChange={e => setInicioEstoque(e.target.value)} placeholder="08:00" className="w-1/2 bg-white border border-slate-300 rounded p-1.5 text-center font-mono" />
                  <input type="text" value={terminoEstoque} onChange={e => setTerminoEstoque(e.target.value)} placeholder="12:00" className="w-1/2 bg-white border border-slate-300 rounded p-1.5 text-center font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Horário Loja</label>
                <div className="flex gap-1">
                  <input type="text" value={inicioLoja} onChange={e => setInicioLoja(e.target.value)} placeholder="13:00" className="w-1/2 bg-white border border-slate-300 rounded p-1.5 text-center font-mono" />
                  <input type="text" value={terminoLoja} onChange={e => setTerminoLoja(e.target.value)} placeholder="18:00" className="w-1/2 bg-white border border-slate-300 rounded p-1.5 text-center font-mono" />
                </div>
              </div>
            </div>

            <button onClick={handleSaveSummaryData} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded text-xs">
              Salvar Parâmetros
            </button>
          </div>

          {/* SIMULATED PRINT LAYOUT REPORT (Page 25/26 Imagem 43) */}
          <div className="bg-white border-2 border-slate-300 p-6 rounded-lg font-sans max-w-4xl mx-auto shadow-sm space-y-6 text-slate-900" id="print-area">
            {/* Logo and title */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div className="font-mono text-xl font-black tracking-tighter text-slate-900 flex items-center gap-1">
                <span className="bg-slate-900 text-white px-2.5 py-1 rounded">IS</span>
                <span>COLLECTOR</span>
              </div>
              <div className="text-right">
                <h1 className="text-md font-bold tracking-tight text-slate-950 font-mono">Inventário: {inventory.nome}</h1>
                <p className="text-xs text-slate-500 font-mono">Resumo Final • {inventory.filial}</p>
                <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono block mt-1">Extraído em: 2026-07-20 06:43:08</span>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
              <div className="space-y-1 bg-slate-50 p-3 rounded border border-slate-200">
                <span className="font-bold text-slate-800 block border-b border-slate-200 pb-1 mb-1">DADOS DO INVENTÁRIO</span>
                <div className="flex justify-between"><span>Status:</span><span className="font-bold text-emerald-600">{inventory.status}</span></div>
                <div className="flex justify-between"><span>Início Contagem:</span><span>{inventory.dataExecucao} {inicioEstoque}</span></div>
                <div className="flex justify-between"><span>Duração Total:</span><span>07:50:17</span></div>
                <div className="flex justify-between"><span>Setores (concluído/total):</span><span>2 / 2</span></div>
                <div className="flex justify-between"><span>Seções (concluído/total):</span><span>42 / 42 (100%)</span></div>
                <div className="flex justify-between"><span>Qtd códigos contados:</span><span className="font-bold">{allCollectedItems.length}</span></div>
                <div className="flex justify-between"><span>Qtd total de peças:</span><span className="font-bold text-cyan-600 text-sm">{allCollectedItems.reduce((acc, it) => acc + it.quantidade, 0)}</span></div>
              </div>

              <div className="space-y-1 bg-slate-50 p-3 rounded border border-slate-200">
                <span className="font-bold text-slate-800 block border-b border-slate-200 pb-1 mb-1">IMPORTAÇÃO ARQUIVO DO CLIENTE</span>
                <div className="flex justify-between"><span>Qtd códigos prevista:</span><span>{inventory.products.length}</span></div>
                <div className="flex justify-between"><span>Qtd total prevista:</span><span>{inventory.products.reduce((acc, p) => acc + p.estoque, 0)}</span></div>
                <div className="flex justify-between"><span>Divergência Total de Peças:</span><span className="font-bold text-rose-600">
                  {allCollectedItems.reduce((acc, it) => acc + it.quantidade, 0) - inventory.products.reduce((acc, p) => acc + p.estoque, 0)}
                </span></div>
                <div className="flex justify-between"><span>Acurácia Cód/Qtd:</span><span className="text-emerald-600 font-bold">98.4%</span></div>
              </div>
            </div>

            {/* TOUCH SCREEN SIGNATURE FIELDS (Page 26 - Imagem 44) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-200">
              {/* Coordinator Sign */}
              <div className="text-center space-y-2">
                <span className="text-xs text-slate-500 font-bold font-mono">Responsável pela Execução (Coordenador)</span>
                <div className="border border-slate-300 bg-white rounded p-1 inline-block relative">
                  <canvas
                    ref={canvasCoordRef}
                    width={280}
                    height={100}
                    className="cursor-crosshair block"
                    onMouseDown={(e) => startDrawing(e, canvasCoordRef.current, false)}
                    onTouchStart={(e) => startDrawing(e, canvasCoordRef.current, false)}
                  ></canvas>
                  <button
                    onClick={() => clearCanvas(canvasCoordRef.current, false)}
                    className="absolute bottom-1 right-1 bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-mono"
                  >
                    Limpar
                  </button>
                </div>
                <p className="text-xs font-bold text-slate-900 border-t border-slate-400 max-w-[200px] mx-auto pt-1 font-mono uppercase">
                  {coordenadorInput || "COORDENADOR"}
                </p>
                <span className="text-[10px] text-slate-400 font-mono">Assinado Digitalmente com Caneta/Dedo</span>
              </div>

              {/* Manager Sign */}
              <div className="text-center space-y-2">
                <span className="text-xs text-slate-500 font-bold font-mono">Contratante (Gerente da Loja)</span>
                <div className="border border-slate-300 bg-white rounded p-1 inline-block relative">
                  <canvas
                    ref={canvasGerenteRef}
                    width={280}
                    height={100}
                    className="cursor-crosshair block"
                    onMouseDown={(e) => startDrawing(e, canvasGerenteRef.current, true)}
                    onTouchStart={(e) => startDrawing(e, canvasGerenteRef.current, true)}
                  ></canvas>
                  <button
                    onClick={() => clearCanvas(canvasGerenteRef.current, true)}
                    className="absolute bottom-1 right-1 bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-mono"
                  >
                    Limpar
                  </button>
                </div>
                <p className="text-xs font-bold text-slate-900 border-t border-slate-400 max-w-[200px] mx-auto pt-1 font-mono uppercase">
                  {gerenteInput || "GERENTE CONTRATANTE"}
                </p>
                <span className="text-[10px] text-slate-400 font-mono">Assinado Digitalmente com Caneta/Dedo</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded text-xs flex items-center gap-1.5 font-mono"
              >
                <Printer className="w-4 h-4" /> IMPRIMIR RELATÓRIO / PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
