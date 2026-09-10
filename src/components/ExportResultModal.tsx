import React, { useState, useEffect } from "react";
import { Inventory, Product, ColetaItem } from "../types";
import { X, FileText, Download, Save, Trash2, CheckCircle2, ChevronDown, Bookmark } from "lucide-react";

export interface ColumnExportConfig {
  id: "ean" | "sap" | "descricao" | "quantidade" | "setor" | "area" | "lote" | "validade" | "infoExtra";
  label: string;
  checked: boolean;
  ordem: string;
  tamanho: string;
  complementar: string;
  alinhamento: "Esq" | "Dir";
}

export interface ExportLayoutConfig {
  id?: string;
  name: string;
  modoExportacao: "consolidado" | "consolidado_setor" | "consolidado_area" | "linha_a_linha";
  separadorTipo: "ponto_virgula" | "virgula" | "tabulacao" | "posicional" | "personalizado";
  separadorPersonalizado: string;
  colunas: ColumnExportConfig[];
  cabecalhoTipo: "personalizado" | "colunas" | "sem_cabecalho";
  cabecalhoPersonalizadoTexto: string;
  caractereInicioLinha: string;
  configQuantidade: "fracionado" | "sempre_decimal" | "inteiro";
  separadorDecimal: "," | ".";
  casasDecimais: number;
  adicionarNaoColetados: boolean;
}

export const DEFAULT_COLUMNS: ColumnExportConfig[] = [
  { id: "ean", label: "Código EAN", checked: true, ordem: "1", tamanho: "", complementar: "", alinhamento: "Esq" },
  { id: "sap", label: "Código Interno", checked: false, ordem: "", tamanho: "", complementar: "", alinhamento: "Esq" },
  { id: "descricao", label: "Descrição", checked: true, ordem: "2", tamanho: "", complementar: "", alinhamento: "Esq" },
  { id: "quantidade", label: "Quantidade", checked: true, ordem: "3", tamanho: "", complementar: "", alinhamento: "Esq" },
  { id: "setor", label: "Setor", checked: false, ordem: "", tamanho: "", complementar: "", alinhamento: "Esq" },
  { id: "area", label: "Área", checked: false, ordem: "", tamanho: "", complementar: "", alinhamento: "Esq" },
  { id: "lote", label: "Lote", checked: false, ordem: "", tamanho: "", complementar: "", alinhamento: "Esq" },
  { id: "validade", label: "Validade", checked: false, ordem: "", tamanho: "", complementar: "", alinhamento: "Esq" },
  { id: "infoExtra", label: "Info Extra", checked: false, ordem: "", tamanho: "", complementar: "", alinhamento: "Esq" },
];

export const STORAGE_LAYOUTS_KEY = "inveco_export_layouts_v1";

export function getSavedLayouts(): ExportLayoutConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_LAYOUTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Erro ao carregar layouts salvos:", e);
  }
  return [];
}

export function saveLayoutToStorage(layouts: ExportLayoutConfig[]) {
  try {
    localStorage.setItem(STORAGE_LAYOUTS_KEY, JSON.stringify(layouts));
    window.dispatchEvent(new CustomEvent("inveco_layouts_changed"));
  } catch (e) {
    console.error("Erro ao salvar layout:", e);
  }
}

export function deleteSavedLayout(layoutId: string) {
  const current = getSavedLayouts();
  const updated = current.filter(l => l.id !== layoutId);
  saveLayoutToStorage(updated);
  return updated;
}

// Format quantity helper
export function formatQuantityWithConfig(qty: number, config: { configQuantidade: ExportLayoutConfig["configQuantidade"]; separadorDecimal: "," | "."; casasDecimais: number }): string {
  if (config.configQuantidade === "inteiro") {
    return String(Math.round(qty));
  }

  if (config.configQuantidade === "fracionado") {
    if (Number.isInteger(qty)) {
      return String(qty);
    }
    const str = qty.toFixed(config.casasDecimais);
    return config.separadorDecimal === "," ? str.replace(".", ",") : str;
  }

  // sempre_decimal
  const str = qty.toFixed(config.casasDecimais);
  return config.separadorDecimal === "," ? str.replace(".", ",") : str;
}

// Format value with fixed length padding / alignment
export function formatValueWithPadding(val: string, colConfig: ColumnExportConfig): string {
  const targetLength = parseInt(colConfig.tamanho, 10);
  if (isNaN(targetLength) || targetLength <= 0) {
    return val;
  }

  const padChar = colConfig.complementar ? colConfig.complementar.charAt(0) : " ";

  let result = val;
  if (result.length > targetLength) {
    return result.substring(0, targetLength);
  }

  const needed = targetLength - result.length;
  const padding = padChar.repeat(needed);

  if (colConfig.alinhamento === "Dir") {
    return padding + result;
  } else {
    return result + padding;
  }
}

// Core Data Generation for any inventory and layout
export function generateExportRowsForInventory(inventory: Inventory, layout: ExportLayoutConfig): { headers: string[]; rows: string[][] } {
  const activeColumns = (layout.colunas || DEFAULT_COLUMNS)
    .filter(c => c.checked)
    .sort((a, b) => {
      const orderA = parseInt(a.ordem, 10) || 999;
      const orderB = parseInt(b.ordem, 10) || 999;
      return orderA - orderB;
    });

  const productCatalogMap = new Map<string, Product>();
  if (inventory.products && Array.isArray(inventory.products)) {
    inventory.products.forEach(p => {
      if (p.ean) productCatalogMap.set(p.ean, p);
      if (p.sap) productCatalogMap.set(p.sap, p);
    });
  }

  interface CollectedRowItem {
    ean: string;
    sap: string;
    descricao: string;
    quantidade: number;
    setor: string;
    area: string;
    lote: string;
    validade: string;
    infoExtra: string;
  }

  const rawCollectedItems: CollectedRowItem[] = [];
  const countedEans = new Set<string>();

  if (inventory.sectors && Array.isArray(inventory.sectors)) {
    inventory.sectors.forEach(sec => {
      if (sec.sections && Array.isArray(sec.sections)) {
        sec.sections.forEach(section => {
          if (section.contagens && section.contagens.length > 0) {
            const validCount = inventory.compara 
              ? section.contagens[section.contagens.length - 1] 
              : null;

            section.contagens.forEach(c => {
              if (!inventory.compara || c === validCount) {
                c.items.forEach(it => {
                  const catalogProd = productCatalogMap.get(it.ean) || (it.sap ? productCatalogMap.get(it.sap) : undefined);
                  
                  const row: CollectedRowItem = {
                    ean: it.ean || "",
                    sap: it.sap || catalogProd?.sap || "",
                    descricao: it.descricao || catalogProd?.descricao || "",
                    quantidade: it.quantidade || 0,
                    setor: sec.nome || "",
                    area: section.code || "",
                    lote: it.lote || "",
                    validade: it.validade || "",
                    infoExtra: (it.infoExtra && it.infoExtra.length > 0) ? it.infoExtra.join(" | ") : ""
                  };

                  rawCollectedItems.push(row);
                  if (row.ean) countedEans.add(row.ean);
                  if (row.sap) countedEans.add(row.sap);
                });
              }
            });
          }
        });
      }
    });
  }

  if (layout.adicionarNaoColetados && inventory.products && Array.isArray(inventory.products)) {
    inventory.products.forEach(p => {
      if (!countedEans.has(p.ean) && !countedEans.has(p.sap)) {
        rawCollectedItems.push({
          ean: p.ean || "",
          sap: p.sap || "",
          descricao: p.descricao || "",
          quantidade: 0,
          setor: "-",
          area: "-",
          lote: "",
          validade: "",
          infoExtra: ""
        });
      }
    });
  }

  let consolidatedRows: CollectedRowItem[] = [];

  if (layout.modoExportacao === "consolidado") {
    const map = new Map<string, CollectedRowItem>();
    rawCollectedItems.forEach(item => {
      const key = item.ean || item.sap || item.descricao;
      if (!map.has(key)) {
        map.set(key, { ...item });
      } else {
        const existing = map.get(key)!;
        existing.quantidade += item.quantidade;
      }
    });
    consolidatedRows = Array.from(map.values());
  } else if (layout.modoExportacao === "consolidado_setor") {
    const map = new Map<string, CollectedRowItem>();
    rawCollectedItems.forEach(item => {
      const key = `${item.setor}___${item.ean || item.sap}`;
      if (!map.has(key)) {
        map.set(key, { ...item });
      } else {
        const existing = map.get(key)!;
        existing.quantidade += item.quantidade;
      }
    });
    consolidatedRows = Array.from(map.values());
  } else if (layout.modoExportacao === "consolidado_area") {
    const map = new Map<string, CollectedRowItem>();
    rawCollectedItems.forEach(item => {
      const key = `${item.setor}___${item.area}___${item.ean || item.sap}`;
      if (!map.has(key)) {
        map.set(key, { ...item });
      } else {
        const existing = map.get(key)!;
        existing.quantidade += item.quantidade;
      }
    });
    consolidatedRows = Array.from(map.values());
  } else if (layout.modoExportacao === "linha_a_linha") {
    rawCollectedItems.forEach(item => {
      const intQty = Math.floor(item.quantidade);
      if (intQty > 1) {
        for (let i = 0; i < intQty; i++) {
          consolidatedRows.push({ ...item, quantidade: 1 });
        }
        const remainder = item.quantidade - intQty;
        if (remainder > 0) {
          consolidatedRows.push({ ...item, quantidade: remainder });
        }
      } else {
        consolidatedRows.push({ ...item });
      }
    });
  }

  const headerRow: string[] = activeColumns.map(col => {
    let label = col.label;
    if (layout.separadorTipo === "posicional") {
      return formatValueWithPadding(label, col);
    }
    return label;
  });

  const dataRows: string[][] = consolidatedRows.map(row => {
    return activeColumns.map(col => {
      let rawVal = "";
      switch (col.id) {
        case "ean":
          rawVal = row.ean;
          break;
        case "sap":
          rawVal = row.sap;
          break;
        case "descricao":
          rawVal = row.descricao;
          break;
        case "quantidade":
          rawVal = formatQuantityWithConfig(row.quantidade, {
            configQuantidade: layout.configQuantidade,
            separadorDecimal: layout.separadorDecimal,
            casasDecimais: layout.casasDecimais
          });
          break;
        case "setor":
          rawVal = row.setor;
          break;
        case "area":
          rawVal = row.area;
          break;
        case "lote":
          rawVal = row.lote;
          break;
        case "validade":
          rawVal = row.validade;
          break;
        case "infoExtra":
          rawVal = row.infoExtra;
          break;
      }

      return formatValueWithPadding(rawVal, col);
    });
  });

  return { headers: headerRow, rows: dataRows };
}

export function getDelimiterForLayout(layout: ExportLayoutConfig): string {
  switch (layout.separadorTipo) {
    case "virgula":
      return ",";
    case "ponto_virgula":
      return ";";
    case "tabulacao":
      return "\t";
    case "personalizado":
      return layout.separadorPersonalizado || ";";
    case "posicional":
      return "";
  }
}

export function exportInventoryFile(inventory: Inventory, layout: ExportLayoutConfig, format: "txt" | "csv") {
  const { headers, rows } = generateExportRowsForInventory(inventory, layout);
  const delimiter = format === "csv" && layout.separadorTipo === "posicional" ? ";" : getDelimiterForLayout(layout);
  const lines: string[] = [];

  if (layout.cabecalhoTipo === "personalizado" && layout.cabecalhoPersonalizadoTexto?.trim()) {
    lines.push(layout.cabecalhoPersonalizadoTexto.trim());
  } else if (layout.cabecalhoTipo === "colunas" && headers.length > 0) {
    if (format === "csv") {
      lines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(delimiter));
    } else {
      lines.push(headers.join(delimiter));
    }
  }

  rows.forEach(r => {
    let lineText = "";
    if (format === "csv") {
      lineText = r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(delimiter);
    } else {
      lineText = r.join(delimiter);
    }
    lines.push((layout.caractereInicioLinha || "") + lineText);
  });

  const safeName = (inventory.nome || "resultado").replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateStr = new Date().toISOString().split("T")[0];

  if (format === "csv") {
    const BOM = "\uFEFF";
    const fileContent = BOM + lines.join("\r\n");
    const blob = new Blob([fileContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `RESULTADO_${safeName}_${layout.name ? layout.name.replace(/[^a-zA-Z0-9_-]/g, '_') + '_' : ''}${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    const fileContent = lines.join("\r\n");
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `RESULTADO_${safeName}_${layout.name ? layout.name.replace(/[^a-zA-Z0-9_-]/g, '_') + '_' : ''}${dateStr}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

interface ExportResultModalProps {
  inventory: Inventory;
  isOpen: boolean;
  onClose: () => void;
  initialLayoutId?: string;
}

export default function ExportResultModal({ inventory, isOpen, onClose, initialLayoutId }: ExportResultModalProps) {
  // 1. Modo de Exportação
  const [modoExportacao, setModoExportacao] = useState<ExportLayoutConfig["modoExportacao"]>("consolidado");

  // 2. Separador
  const [separadorTipo, setSeparadorTipo] = useState<ExportLayoutConfig["separadorTipo"]>("ponto_virgula");
  const [separadorPersonalizado, setSeparadorPersonalizado] = useState("");

  // 3. Dados a Exportar
  const [colunas, setColunas] = useState<ColumnExportConfig[]>(DEFAULT_COLUMNS);

  // 4. Opções
  const [cabecalhoTipo, setCabecalhoTipo] = useState<ExportLayoutConfig["cabecalhoTipo"]>("colunas");
  const [cabecalhoPersonalizadoTexto, setCabecalhoPersonalizadoTexto] = useState("");
  const [caractereInicioLinha, setCaractereInicioLinha] = useState("");
  const [configQuantidade, setConfigQuantidade] = useState<ExportLayoutConfig["configQuantidade"]>("fracionado");
  const [separadorDecimal, setSeparadorDecimal] = useState<"," | ".">(",");
  const [casasDecimais, setCasasDecimais] = useState<number>(2);
  const [adicionarNaoColetados, setAdicionarNaoColetados] = useState<boolean>(false);

  // 5. Salvar Layout
  const [nomeLayout, setNomeLayout] = useState("");
  const [savedLayouts, setSavedLayouts] = useState<ExportLayoutConfig[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>("");
  const [layoutSavedMessage, setLayoutSavedMessage] = useState<string | null>(null);

  // Load saved layouts from local storage on mount / changes
  useEffect(() => {
    const loadLayouts = () => {
      const layouts = getSavedLayouts();
      setSavedLayouts(layouts);

      if (initialLayoutId) {
        const found = layouts.find(l => l.id === initialLayoutId);
        if (found) {
          applyLayoutData(found);
          setSelectedLayoutId(found.id!);
        }
      }
    };

    loadLayouts();

    window.addEventListener("inveco_layouts_changed", loadLayouts);
    return () => window.removeEventListener("inveco_layouts_changed", loadLayouts);
  }, [initialLayoutId, isOpen]);

  function applyLayoutData(layout: ExportLayoutConfig) {
    setModoExportacao(layout.modoExportacao);
    setSeparadorTipo(layout.separadorTipo);
    setSeparadorPersonalizado(layout.separadorPersonalizado || "");
    setCabecalhoTipo(layout.cabecalhoTipo);
    setCabecalhoPersonalizadoTexto(layout.cabecalhoPersonalizadoTexto || "");
    setCaractereInicioLinha(layout.caractereInicioLinha || "");
    setConfigQuantidade(layout.configQuantidade);
    setSeparadorDecimal(layout.separadorDecimal || ",");
    setCasasDecimais(layout.casasDecimais ?? 2);
    setAdicionarNaoColetados(layout.adicionarNaoColetados ?? false);

    if (layout.colunas && Array.isArray(layout.colunas)) {
      const merged = DEFAULT_COLUMNS.map(defCol => {
        const savedCol = layout.colunas.find(c => c.id === defCol.id);
        return savedCol ? { ...savedCol } : { ...defCol };
      });
      setColunas(merged);
    }
  }

  if (!isOpen) return null;

  // Handle column checkbox toggle and assign automatic next order if empty
  function handleToggleColumn(index: number) {
    setColunas(prev => {
      const next = [...prev];
      const col = { ...next[index] };
      col.checked = !col.checked;

      if (col.checked && !col.ordem) {
        // Find highest existing order number
        const currentOrders = next
          .filter(c => c.checked && c.ordem)
          .map(c => parseInt(c.ordem, 10))
          .filter(n => !isNaN(n));
        const maxOrder = currentOrders.length > 0 ? Math.max(...currentOrders) : 0;
        col.ordem = String(maxOrder + 1);
      } else if (!col.checked) {
        col.ordem = "";
      }

      next[index] = col;
      return next;
    });
  }

  function handleColumnFieldChange(index: number, field: keyof ColumnExportConfig, value: any) {
    setColunas(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  // Save current config as layout
  function handleSaveLayout() {
    if (!nomeLayout.trim()) {
      alert("Por favor, digite o nome do layout antes de salvar.");
      return;
    }

    const newLayout: ExportLayoutConfig = {
      id: "layout_" + Date.now(),
      name: nomeLayout.trim().toUpperCase(),
      modoExportacao,
      separadorTipo,
      separadorPersonalizado,
      colunas,
      cabecalhoTipo,
      cabecalhoPersonalizadoTexto,
      caractereInicioLinha,
      configQuantidade,
      separadorDecimal,
      casasDecimais,
      adicionarNaoColetados
    };

    const updatedLayouts = [...savedLayouts.filter(l => l.name !== newLayout.name), newLayout];
    setSavedLayouts(updatedLayouts);
    saveLayoutToStorage(updatedLayouts);

    setSelectedLayoutId(newLayout.id!);
    setNomeLayout("");
    setLayoutSavedMessage(`Layout "${newLayout.name}" salvo com sucesso!`);
    setTimeout(() => setLayoutSavedMessage(null), 3500);
  }

  // Load a selected saved layout
  function handleApplyLayout(layoutId: string) {
    setSelectedLayoutId(layoutId);
    const layout = savedLayouts.find(l => l.id === layoutId);
    if (!layout) return;
    applyLayoutData(layout);
  }

  function handleDeleteLayout(layoutId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Deseja realmente excluir este layout salvo?")) return;
    const filtered = savedLayouts.filter(l => l.id !== layoutId);
    setSavedLayouts(filtered);
    saveLayoutToStorage(filtered);
    if (selectedLayoutId === layoutId) {
      setSelectedLayoutId("");
    }
  }

  // Helper to format quantity
  function formatQuantity(qty: number): string {
    if (configQuantidade === "inteiro") {
      return String(Math.round(qty));
    }

    if (configQuantidade === "fracionado") {
      if (Number.isInteger(qty)) {
        return String(qty);
      }
      const str = qty.toFixed(casasDecimais);
      return separadorDecimal === "," ? str.replace(".", ",") : str;
    }

    // sempre_decimal
    const str = qty.toFixed(casasDecimais);
    return separadorDecimal === "," ? str.replace(".", ",") : str;
  }

  // Format value with fixed length padding / alignment
  function formatValueWithPadding(val: string, colConfig: ColumnExportConfig): string {
    const targetLength = parseInt(colConfig.tamanho, 10);
    if (isNaN(targetLength) || targetLength <= 0) {
      return val;
    }

    const padChar = colConfig.complementar ? colConfig.complementar.charAt(0) : " ";

    let result = val;
    if (result.length > targetLength) {
      // Truncate to length
      return result.substring(0, targetLength);
    }

    const needed = targetLength - result.length;
    const padding = padChar.repeat(needed);

    if (colConfig.alinhamento === "Dir") {
      return padding + result;
    } else {
      return result + padding;
    }
  }

  // Core Data Generation
  function generateExportRows(): { headers: string[]; rows: string[][] } {
    // Sort checked columns by 'ordem'
    const activeColumns = colunas
      .filter(c => c.checked)
      .sort((a, b) => {
        const orderA = parseInt(a.ordem, 10) || 999;
        const orderB = parseInt(b.ordem, 10) || 999;
        return orderA - orderB;
      });

    // Build product lookup map from catalog
    const productCatalogMap = new Map<string, Product>();
    if (inventory.products && Array.isArray(inventory.products)) {
      inventory.products.forEach(p => {
        if (p.ean) productCatalogMap.set(p.ean, p);
        if (p.sap) productCatalogMap.set(p.sap, p);
      });
    }

    // Extract all collected items respecting 'compara' double count rule
    interface CollectedRowItem {
      ean: string;
      sap: string;
      descricao: string;
      quantidade: number;
      setor: string;
      area: string;
      lote: string;
      validade: string;
      infoExtra: string;
    }

    const rawCollectedItems: CollectedRowItem[] = [];
    const countedEans = new Set<string>();

    if (inventory.sectors && Array.isArray(inventory.sectors)) {
      inventory.sectors.forEach(sec => {
        if (sec.sections && Array.isArray(sec.sections)) {
          sec.sections.forEach(section => {
            if (section.contagens && section.contagens.length > 0) {
              // In Compara mode, take only the verified/final count to avoid duplicate sum
              const validCount = inventory.compara 
                ? section.contagens[section.contagens.length - 1] 
                : null;

              section.contagens.forEach(c => {
                if (!inventory.compara || c === validCount) {
                  c.items.forEach(it => {
                    const catalogProd = productCatalogMap.get(it.ean) || (it.sap ? productCatalogMap.get(it.sap) : undefined);
                    
                    const row: CollectedRowItem = {
                      ean: it.ean || "",
                      sap: it.sap || catalogProd?.sap || "",
                      descricao: it.descricao || catalogProd?.descricao || "",
                      quantidade: it.quantidade || 0,
                      setor: sec.nome || "",
                      area: section.code || "",
                      lote: it.lote || "",
                      validade: it.validade || "",
                      infoExtra: (it.infoExtra && it.infoExtra.length > 0) ? it.infoExtra.join(" | ") : ""
                    };

                    rawCollectedItems.push(row);
                    if (row.ean) countedEans.add(row.ean);
                    if (row.sap) countedEans.add(row.sap);
                  });
                }
              });
            }
          });
        }
      });
    }

    // Add uncollected catalog items if enabled
    if (adicionarNaoColetados && inventory.products && Array.isArray(inventory.products)) {
      inventory.products.forEach(p => {
        if (!countedEans.has(p.ean) && !countedEans.has(p.sap)) {
          rawCollectedItems.push({
            ean: p.ean || "",
            sap: p.sap || "",
            descricao: p.descricao || "",
            quantidade: 0,
            setor: "-",
            area: "-",
            lote: "",
            validade: "",
            infoExtra: ""
          });
        }
      });
    }

    // Apply consolidation mode
    let consolidatedRows: CollectedRowItem[] = [];

    if (modoExportacao === "consolidado") {
      // Group by EAN / code
      const map = new Map<string, CollectedRowItem>();
      rawCollectedItems.forEach(item => {
        const key = item.ean || item.sap || item.descricao;
        if (!map.has(key)) {
          map.set(key, { ...item });
        } else {
          const existing = map.get(key)!;
          existing.quantidade += item.quantidade;
        }
      });
      consolidatedRows = Array.from(map.values());
    } else if (modoExportacao === "consolidado_setor") {
      // Group by Setor + EAN
      const map = new Map<string, CollectedRowItem>();
      rawCollectedItems.forEach(item => {
        const key = `${item.setor}___${item.ean || item.sap}`;
        if (!map.has(key)) {
          map.set(key, { ...item });
        } else {
          const existing = map.get(key)!;
          existing.quantidade += item.quantidade;
        }
      });
      consolidatedRows = Array.from(map.values());
    } else if (modoExportacao === "consolidado_area") {
      // Group by Setor + Area + EAN
      const map = new Map<string, CollectedRowItem>();
      rawCollectedItems.forEach(item => {
        const key = `${item.setor}___${item.area}___${item.ean || item.sap}`;
        if (!map.has(key)) {
          map.set(key, { ...item });
        } else {
          const existing = map.get(key)!;
          existing.quantidade += item.quantidade;
        }
      });
      consolidatedRows = Array.from(map.values());
    } else if (modoExportacao === "linha_a_linha") {
      // Repeat per quantity (if quantity > 1 and integer)
      rawCollectedItems.forEach(item => {
        const intQty = Math.floor(item.quantidade);
        if (intQty > 1) {
          for (let i = 0; i < intQty; i++) {
            consolidatedRows.push({ ...item, quantidade: 1 });
          }
          const remainder = item.quantidade - intQty;
          if (remainder > 0) {
            consolidatedRows.push({ ...item, quantidade: remainder });
          }
        } else {
          consolidatedRows.push({ ...item });
        }
      });
    }

    // Convert to 2D string matrix
    const headerRow: string[] = activeColumns.map(col => {
      let label = col.label;
      if (separadorTipo === "posicional") {
        return formatValueWithPadding(label, col);
      }
      return label;
    });

    const dataRows: string[][] = consolidatedRows.map(row => {
      return activeColumns.map(col => {
        let rawVal = "";
        switch (col.id) {
          case "ean":
            rawVal = row.ean;
            break;
          case "sap":
            rawVal = row.sap;
            break;
          case "descricao":
            rawVal = row.descricao;
            break;
          case "quantidade":
            rawVal = formatQuantity(row.quantidade);
            break;
          case "setor":
            rawVal = row.setor;
            break;
          case "area":
            rawVal = row.area;
            break;
          case "lote":
            rawVal = row.lote;
            break;
          case "validade":
            rawVal = row.validade;
            break;
          case "infoExtra":
            rawVal = row.infoExtra;
            break;
        }

        return formatValueWithPadding(rawVal, col);
      });
    });

    return { headers: headerRow, rows: dataRows };
  }

  // Get delimiter character
  function getDelimiter(): string {
    switch (separadorTipo) {
      case "virgula":
        return ",";
      case "ponto_virgula":
        return ";";
      case "tabulacao":
        return "\t";
      case "personalizado":
        return separadorPersonalizado || ";";
      case "posicional":
        return ""; // No delimiter for fixed width
    }
  }

  // Export TXT
  function handleExportTXT() {
    const { headers, rows } = generateExportRows();
    const delimiter = getDelimiter();
    const lines: string[] = [];

    // Header logic
    if (cabecalhoTipo === "personalizado" && cabecalhoPersonalizadoTexto.trim()) {
      lines.push(cabecalhoPersonalizadoTexto.trim());
    } else if (cabecalhoTipo === "colunas" && headers.length > 0) {
      lines.push(headers.join(delimiter));
    }

    // Data rows with optional prefix
    rows.forEach(r => {
      const lineContent = r.join(delimiter);
      lines.push((caractereInicioLinha || "") + lineContent);
    });

    const fileContent = lines.join("\r\n");
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (inventory.nome || "resultado").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.href = url;
    link.download = `RESULTADO_${safeName}_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Export CSV (Excel compatible with UTF-8 BOM)
  function handleExportCSV() {
    const { headers, rows } = generateExportRows();
    const delimiter = separadorTipo === "posicional" ? ";" : getDelimiter();
    const lines: string[] = [];

    // Header logic
    if (cabecalhoTipo === "personalizado" && cabecalhoPersonalizadoTexto.trim()) {
      lines.push(cabecalhoPersonalizadoTexto.trim());
    } else if (cabecalhoTipo === "colunas" && headers.length > 0) {
      lines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(delimiter));
    }

    // Data rows
    rows.forEach(r => {
      const rowText = r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(delimiter);
      lines.push((caractereInicioLinha || "") + rowText);
    });

    // Add BOM for Excel UTF-8 compatibility
    const BOM = "\uFEFF";
    const fileContent = BOM + lines.join("\r\n");
    const blob = new Blob([fileContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (inventory.nome || "resultado").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.href = url;
    link.download = `RESULTADO_${safeName}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col text-slate-800 font-sans border border-slate-200">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Gerar Resultado — <span className="font-extrabold uppercase">{inventory.nome}</span>
            {inventory.filial && <span className="font-normal text-slate-500 text-sm ml-1.5">- {inventory.filial}</span>}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="px-6 py-5 overflow-y-auto space-y-6 text-xs sm:text-sm">
          
          {/* SUCCESS MESSAGE */}
          {layoutSavedMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{layoutSavedMessage}</span>
            </div>
          )}

          {/* PRE-SAVED LAYOUTS SELECTOR (IF ANY EXIST) */}
          {savedLayouts.length > 0 && (
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                <Bookmark className="w-4 h-4 text-blue-600" />
                <span>Carregar Layout Salvo:</span>
              </div>
              <div className="flex items-center gap-2 flex-1 sm:max-w-xs">
                <select
                  value={selectedLayoutId}
                  onChange={e => handleApplyLayout(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-blue-500"
                >
                  <option value="">Selecione um layout...</option>
                  {savedLayouts.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                {selectedLayoutId && (
                  <button
                    onClick={e => handleDeleteLayout(selectedLayoutId, e)}
                    className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded transition-colors"
                    title="Excluir este layout"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 1. MODO DE EXPORTAÇÃO */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-slate-900 text-sm">1. Modo de Exportação</h3>
            <div className="space-y-2 pl-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                <input
                  type="radio"
                  name="modoExportacao"
                  value="consolidado"
                  checked={modoExportacao === "consolidado"}
                  onChange={() => setModoExportacao("consolidado")}
                  className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span>Consolidado (soma por código)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                <input
                  type="radio"
                  name="modoExportacao"
                  value="consolidado_setor"
                  checked={modoExportacao === "consolidado_setor"}
                  onChange={() => setModoExportacao("consolidado_setor")}
                  className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span>Consolidado por Setor</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                <input
                  type="radio"
                  name="modoExportacao"
                  value="consolidado_area"
                  checked={modoExportacao === "consolidado_area"}
                  onChange={() => setModoExportacao("consolidado_area")}
                  className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span>Consolidado por Área (setor + código)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                <input
                  type="radio"
                  name="modoExportacao"
                  value="linha_a_linha"
                  checked={modoExportacao === "linha_a_linha"}
                  onChange={() => setModoExportacao("linha_a_linha")}
                  className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span>Linha a Linha (repete conforme quantidade)</span>
              </label>
            </div>
          </div>

          {/* 2. SEPARADOR */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-slate-900 text-sm">2. Separador</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 pl-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                <input
                  type="radio"
                  name="separadorTipo"
                  value="virgula"
                  checked={separadorTipo === "virgula"}
                  onChange={() => setSeparadorTipo("virgula")}
                  className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span>Vírgula (,)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                <input
                  type="radio"
                  name="separadorTipo"
                  value="ponto_virgula"
                  checked={separadorTipo === "ponto_virgula"}
                  onChange={() => setSeparadorTipo("ponto_virgula")}
                  className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span>Ponto e Vírgula (;)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                <input
                  type="radio"
                  name="separadorTipo"
                  value="tabulacao"
                  checked={separadorTipo === "tabulacao"}
                  onChange={() => setSeparadorTipo("tabulacao")}
                  className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span>Tabulação</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                <input
                  type="radio"
                  name="separadorTipo"
                  value="posicional"
                  checked={separadorTipo === "posicional"}
                  onChange={() => setSeparadorTipo("posicional")}
                  className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span>Qtde de Caracteres</span>
              </label>

              <div className="flex items-center gap-2.5 sm:col-span-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700 shrink-0">
                  <input
                    type="radio"
                    name="separadorTipo"
                    value="personalizado"
                    checked={separadorTipo === "personalizado"}
                    onChange={() => setSeparadorTipo("personalizado")}
                    className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span>Personalizado</span>
                </label>
                {separadorTipo === "personalizado" && (
                  <input
                    type="text"
                    value={separadorPersonalizado}
                    onChange={e => setSeparadorPersonalizado(e.target.value)}
                    placeholder="Ex: |"
                    maxLength={5}
                    className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold focus:outline-blue-500"
                  />
                )}
              </div>
            </div>
          </div>

          {/* 3. DADOS A EXPORTAR */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-slate-900 text-sm">3. Dados a Exportar</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-semibold text-[11px] sm:text-xs border-b border-slate-200">
                    <th className="py-2.5 px-3 w-10 text-center"></th>
                    <th className="py-2.5 px-3">Coluna</th>
                    <th className="py-2.5 px-3 w-18 text-center">Ordem</th>
                    <th className="py-2.5 px-3 w-20 text-center">Tamanho</th>
                    <th className="py-2.5 px-3 w-24 text-center">Complementar</th>
                    <th className="py-2.5 px-3 w-28 text-center">Alinhamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {colunas.map((col, index) => (
                    <tr key={col.id} className={col.checked ? "bg-white hover:bg-slate-50/60" : "bg-slate-50/40 text-slate-400"}>
                      {/* CHECKBOX */}
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={col.checked}
                          onChange={() => handleToggleColumn(index)}
                          className="w-4 h-4 text-blue-600 rounded accent-blue-600 cursor-pointer"
                        />
                      </td>

                      {/* NOME DA COLUNA */}
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {col.label}
                      </td>

                      {/* ORDEM */}
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={col.ordem}
                          onChange={e => handleColumnFieldChange(index, "ordem", e.target.value)}
                          disabled={!col.checked}
                          className="w-14 text-center bg-white border border-slate-200 rounded p-1 text-xs font-bold disabled:bg-slate-100 disabled:text-slate-300 focus:outline-blue-500"
                        />
                      </td>

                      {/* TAMANHO */}
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          max="255"
                          value={col.tamanho}
                          onChange={e => handleColumnFieldChange(index, "tamanho", e.target.value)}
                          disabled={!col.checked}
                          placeholder=""
                          className="w-16 text-center bg-white border border-slate-200 rounded p-1 text-xs disabled:bg-slate-100 disabled:text-slate-300 focus:outline-blue-500"
                        />
                      </td>

                      {/* COMPLEMENTAR */}
                      <td className="py-2 px-3 text-center">
                        <input
                          type="text"
                          maxLength={1}
                          value={col.complementar}
                          onChange={e => handleColumnFieldChange(index, "complementar", e.target.value)}
                          disabled={!col.checked}
                          placeholder=""
                          className="w-16 text-center bg-white border border-slate-200 rounded p-1 text-xs disabled:bg-slate-100 disabled:text-slate-300 focus:outline-blue-500"
                        />
                      </td>

                      {/* ALINHAMENTO */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <label className={`flex items-center gap-1 cursor-pointer select-none text-[11px] ${!col.checked ? "text-slate-300" : "text-slate-700"}`}>
                            <input
                              type="radio"
                              name={`alin_${col.id}`}
                              value="Esq"
                              checked={col.alinhamento === "Esq"}
                              onChange={() => handleColumnFieldChange(index, "alinhamento", "Esq")}
                              disabled={!col.checked}
                              className="w-3.5 h-3.5 text-blue-600 accent-blue-600 cursor-pointer"
                            />
                            <span>Esq</span>
                          </label>

                          <label className={`flex items-center gap-1 cursor-pointer select-none text-[11px] ${!col.checked ? "text-slate-300" : "text-slate-700"}`}>
                            <input
                              type="radio"
                              name={`alin_${col.id}`}
                              value="Dir"
                              checked={col.alinhamento === "Dir"}
                              onChange={() => handleColumnFieldChange(index, "alinhamento", "Dir")}
                              disabled={!col.checked}
                              className="w-3.5 h-3.5 text-blue-600 accent-blue-600 cursor-pointer"
                            />
                            <span>Dir</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. OPÇÕES */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">4. Opções</h3>

            {/* Cabeçalho */}
            <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                <input
                  type="radio"
                  name="cabecalhoTipo"
                  value="personalizado"
                  checked={cabecalhoTipo === "personalizado"}
                  onChange={() => setCabecalhoTipo("personalizado")}
                  className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span>Cabeçalho personalizado</span>
              </label>
              {cabecalhoTipo === "personalizado" && (
                <div className="pl-6 pt-1">
                  <input
                    type="text"
                    value={cabecalhoPersonalizadoTexto}
                    onChange={e => setCabecalhoPersonalizadoTexto(e.target.value)}
                    placeholder="Ex: EAN;COD_INTERNO;DESCRICAO;QUANTIDADE"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-mono focus:outline-blue-500"
                  />
                </div>
              )}

              <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                <input
                  type="radio"
                  name="cabecalhoTipo"
                  value="colunas"
                  checked={cabecalhoTipo === "colunas"}
                  onChange={() => setCabecalhoTipo("colunas")}
                  className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span>Exibir nome das colunas como cabeçalho</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                <input
                  type="radio"
                  name="cabecalhoTipo"
                  value="sem_cabecalho"
                  checked={cabecalhoTipo === "sem_cabecalho"}
                  onChange={() => setCabecalhoTipo("sem_cabecalho")}
                  className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span>Sem cabeçalho</span>
              </label>
            </div>

            {/* Caractere no início de cada linha */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700 text-xs">
                Caractere no início de cada linha
              </label>
              <input
                type="text"
                value={caractereInicioLinha}
                onChange={e => setCaractereInicioLinha(e.target.value)}
                placeholder="Ex: #"
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Configuração da Quantidade */}
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700 text-xs">
                Configuração da Quantidade
              </label>
              <div className="space-y-1.5 pl-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                  <input
                    type="radio"
                    name="configQuantidade"
                    value="fracionado"
                    checked={configQuantidade === "fracionado"}
                    onChange={() => setConfigQuantidade("fracionado")}
                    className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span>Decimal somente se fracionado</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                  <input
                    type="radio"
                    name="configQuantidade"
                    value="sempre_decimal"
                    checked={configQuantidade === "sempre_decimal"}
                    onChange={() => setConfigQuantidade("sempre_decimal")}
                    className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span>Sempre com decimal</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700">
                  <input
                    type="radio"
                    name="configQuantidade"
                    value="inteiro"
                    checked={configQuantidade === "inteiro"}
                    onChange={() => setConfigQuantidade("inteiro")}
                    className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span>Inteiro</span>
                </label>
              </div>
            </div>

            {/* Separador Decimal & Casas Decimais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700 text-xs">
                  Separador Decimal
                </label>
                <div className="relative">
                  <select
                    value={separadorDecimal}
                    onChange={e => setSeparadorDecimal(e.target.value as "," | ".")}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 appearance-none focus:border-blue-500 focus:outline-hidden font-medium"
                  >
                    <option value=",">Vírgula (,)</option>
                    <option value=".">Ponto (.)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700 text-xs">
                  Casas Decimais
                </label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={casasDecimais}
                  onChange={e => setCasasDecimais(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Adicionar itens da lista que não foram coletados */}
            <div className="pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={adicionarNaoColetados}
                  onChange={e => setAdicionarNaoColetados(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded accent-blue-600 cursor-pointer"
                />
                <span>Adicionar itens da lista que não foram coletados</span>
              </label>
            </div>
          </div>

          {/* 5. SALVAR LAYOUT PARA USO FUTURO */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block font-bold text-slate-900 text-xs">
              Salvar Layout para uso futuro
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nomeLayout}
                onChange={e => setNomeLayout(e.target.value)}
                placeholder="Nome do layout"
                className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:border-blue-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleSaveLayout}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                title="Salvar layout"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold px-6 py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Voltar
          </button>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportTXT}
              className="w-full sm:w-auto bg-[#18181b] hover:bg-black text-white font-bold px-5 py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Exportar TXT</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="w-full sm:w-auto bg-[#16a34a] hover:bg-[#15803d] text-white font-bold px-5 py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel (CSV)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
