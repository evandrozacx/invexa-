import React, { useState, useEffect, useMemo } from "react";
import { Inventory, SavedProductBase } from "../types";
import { 
  X, Search, CheckCircle, AlertTriangle, RefreshCw, 
  ArrowDownCircle, FileSpreadsheet, Package, Layers, 
  Trash2, ExternalLink, Database, Calendar, Tag, Check
} from "lucide-react";

interface Props {
  inventory: Inventory;
  isOpen: boolean;
  onClose: () => void;
  onSync: () => void;
  onNavigateToImports?: () => void;
}

export default function InventoryProductsModal({
  inventory,
  isOpen,
  onClose,
  onSync,
  onNavigateToImports
}: Props) {
  const [savedBases, setSavedBases] = useState<SavedProductBase[]>([]);
  const [isLoadingBases, setIsLoadingBases] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [applyingBaseId, setApplyingBaseId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmApplyBase, setConfirmApplyBase] = useState<SavedProductBase | null>(null);
  const [confirmClearModal, setConfirmClearModal] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [applyProgress, setApplyProgress] = useState<{ percent: number; stepText: string } | null>(null);

  // Fetch saved bases from API
  const fetchBases = async () => {
    setIsLoadingBases(true);
    try {
      const res = await fetch("/api/imported-bases");
      if (res.ok) {
        const data = await res.json();
        setSavedBases(Array.isArray(data) ? data : (data.bases || []));
      }
    } catch (err) {
      console.error("Erro ao buscar bases salvas:", err);
    } finally {
      setIsLoadingBases(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBases();
      setNotification(null);
      setSearchQuery("");
      setConfirmApplyBase(null);
      setConfirmClearModal(false);
    }
  }, [isOpen]);

  // Filter saved bases by clientName or fileName
  const filteredBases = useMemo(() => {
    if (!searchQuery.trim()) return savedBases;
    const q = searchQuery.toLowerCase();
    return savedBases.filter(b => 
      (b.clientName && b.clientName.toLowerCase().includes(q)) ||
      (b.fileName && b.fileName.toLowerCase().includes(q))
    );
  }, [savedBases, searchQuery]);

  // Apply a saved base to this inventory
  const handleApplyBase = async (base: SavedProductBase) => {
    setApplyingBaseId(base.id);
    setNotification(null);
    setApplyProgress({ percent: 15, stepText: `Carregando dados da base "${base.clientName}" (${base.totalProducts?.toLocaleString("pt-BR")} itens)...` });

    const timer = setInterval(() => {
      setApplyProgress(prev => {
        if (!prev) return { percent: 20, stepText: "Processando produtos no servidor..." };
        if (prev.percent < 85) {
          const nextPercent = prev.percent + (prev.percent < 50 ? 15 : 8);
          let nextText = prev.stepText;
          if (nextPercent > 40 && nextPercent <= 70) {
            nextText = `Vinculando produtos e inserindo no catálogo do inventário...`;
          } else if (nextPercent > 70) {
            nextText = "Consolidando totais de estoque e departamentos...";
          }
          return { percent: nextPercent, stepText: nextText };
        }
        return prev;
      });
    }, 350);

    try {
      const res = await fetch(`/api/inventories/${inventory.id}/apply-base/${base.id}`, {
        method: "POST"
      });
      clearInterval(timer);
      setApplyProgress({ percent: 95, stepText: "Atualizando inventário e finalizando vínculo..." });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        if (res.status === 404) {
          throw new Error("O endpoint da API não foi encontrado (404). O arquivo server.js ou dist/server.cjs precisa ser atualizado e o PM2 reiniciado.");
        } else {
          throw new Error(`Resposta inesperada do servidor (${res.status}): Verifique se o servidor backend foi reiniciado.`);
        }
      }

      if (res.ok && data.success) {
        inventory.totalProductsCount = data.count || base.totalProducts;
        inventory.clientBaseName = base.clientName;
        if (data.totalEstoque !== undefined) inventory.totalEstoque = data.totalEstoque;
        if (data.totalPrecoCusto !== undefined) inventory.totalPrecoCusto = data.totalPrecoCusto;

        setApplyProgress({ percent: 100, stepText: "Base vinculada com sucesso!" });

        setNotification({
          type: "success",
          text: `Base do cliente "${base.clientName}" com ${(data.count || base.totalProducts)?.toLocaleString("pt-BR")} produtos vinculada com sucesso ao inventário!`
        });
        setConfirmApplyBase(null);
        window.dispatchEvent(new Event("invexa-db-updated"));
        await onSync();

        setTimeout(() => {
          setApplyProgress(null);
        }, 800);
      } else {
        setApplyProgress(null);
        setNotification({
          type: "error",
          text: data.error || "Falha ao vincular a base de produtos ao inventário."
        });
      }
    } catch (err: any) {
      clearInterval(timer);
      setApplyProgress(null);
      setNotification({
        type: "error",
        text: err.message || "Erro de conexão ao vincular a base de produtos."
      });
    } finally {
      setApplyingBaseId(null);
    }
  };

  // Clear products from this inventory
  const handleClearProducts = async () => {
    setIsClearing(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/inventories/${inventory.id}/products`, {
        method: "DELETE"
      });
      if (res.ok) {
        setNotification({
          type: "success",
          text: "Produtos do inventário foram removidos com sucesso."
        });
        setConfirmClearModal(false);
        await onSync();
      } else {
        setNotification({
          type: "error",
          text: "Falha ao limpar os produtos do inventário."
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        text: err.message || "Erro de conexão ao remover produtos."
      });
    } finally {
      setIsClearing(false);
    }
  };

  if (!isOpen) return null;

  const currentProductsCount = inventory.totalProductsCount || (inventory.products ? inventory.products.length : 0);
  const currentEstoque = inventory.totalEstoque || 0;
  const isLinked = currentProductsCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Produtos do Inventário
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Vincular Base
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Inventário: <strong className="text-slate-200">{inventory.nome}</strong> {inventory.filial ? `(${inventory.filial})` : ""}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FEEDBACK BANNER */}
        {notification && (
          <div className={`px-6 py-3 border-b flex items-center justify-between gap-3 text-xs font-medium ${
            notification.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
              : "bg-red-50 text-red-800 border-red-200"
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{notification.text}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* CURRENT INVENTORY STATUS */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isLinked ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-amber-400 ring-4 ring-amber-100"}`} />
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Status no Inventário
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {isLinked ? (
                    <span>
                      {inventory.clientBaseName ? (
                        <>Base vinculada: <strong className="text-blue-700 font-bold">{inventory.clientBaseName}</strong></>
                      ) : (
                        "Base de produtos carregada"
                      )}
                      {" — "}
                      <span className="text-slate-600 font-normal">
                        {currentProductsCount.toLocaleString("pt-BR")} itens cadastrados
                        {currentEstoque > 0 && ` (${currentEstoque.toLocaleString("pt-BR")} peças)`}
                      </span>
                    </span>
                  ) : (
                    <span className="text-amber-700">Nenhuma base de produtos vinculada a este inventário</span>
                  )}
                </span>
              </div>
            </div>

            {isLinked && (
              <button
                onClick={() => setConfirmClearModal(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                title="Remover produtos deste inventário"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Desvincular / Limpar</span>
              </button>
            )}
          </div>

          {/* PROGRESS BAR WHILE APPLYING BASE */}
          {applyProgress && (
            <div className="mt-3.5 p-3.5 rounded-xl bg-blue-50 border border-blue-200 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-950 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Vinculando Base de Produtos...</span>
                </span>
                <span className="font-mono font-extrabold text-blue-700">{applyProgress.percent}%</span>
              </div>
              <div className="w-full bg-blue-200/70 rounded-full h-2.5 overflow-hidden shadow-inner">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${applyProgress.percent}%` }}
                />
              </div>
              <p className="text-[11px] text-blue-800 font-medium">
                {applyProgress.stepText}
              </p>
            </div>
          )}
        </div>

        {/* MAIN BODY: BASES LIST */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Selecione a Base do Cliente
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Escolha o arquivo salvo no menu "Importar Bases" para puxar para dentro deste inventário.
              </p>
            </div>

            <button
              onClick={fetchBases}
              disabled={isLoadingBases}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBases ? "animate-spin text-blue-600" : ""}`} />
              <span>Atualizar Lista</span>
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome do cliente ou arquivo..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* LIST OF BASES */}
          {isLoadingBases ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Carregando bases de clientes salvas...</p>
            </div>
          ) : savedBases.length === 0 ? (
            /* EMPTY STATE: NO BASES SAVED YET */
            <div className="py-10 px-6 rounded-2xl border-2 border-dashed border-slate-200 text-center bg-slate-50/50 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="max-w-md">
                <h4 className="text-sm font-bold text-slate-800">
                  Nenhuma base de produtos salva encontrada
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Para puxar produtos para este inventário, você precisa primeiro importar e salvar os arquivos dos seus clientes no menu lateral <strong>Importar Bases</strong>.
                </p>
              </div>

              {onNavigateToImports && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToImports();
                  }}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-600/20 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ir para Importar Bases</span>
                </button>
              )}
            </div>
          ) : filteredBases.length === 0 ? (
            /* NO RESULTS FOR SEARCH */
            <div className="py-8 text-center text-slate-500 text-xs">
              Nenhuma base encontrada para o termo "<strong>{searchQuery}</strong>".
            </div>
          ) : (
            /* BASES CARDS */
            <div className="grid grid-cols-1 gap-3">
              {filteredBases.map((base) => {
                const isCurrentlyActive = inventory.clientBaseName === base.clientName;
                const isApplyingThis = applyingBaseId === base.id;

                return (
                  <div
                    key={base.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCurrentlyActive 
                        ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-300" 
                        : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 uppercase tracking-wide">
                          Cliente
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900 truncate">
                          {base.clientName}
                        </h4>
                        {isCurrentlyActive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Base Ativa
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-600">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[180px]">{base.fileName}</span>
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">
                          {base.totalProducts?.toLocaleString("pt-BR")} produtos
                        </span>
                        {base.totalEstoque > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600">
                              {base.totalEstoque?.toLocaleString("pt-BR")} peças
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span className="text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(base.importDate).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>

                    {/* ACTION BUTTON: PUXAR PARA ESTE INVENTÁRIO */}
                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => setConfirmApplyBase(base)}
                        disabled={isApplyingThis}
                        className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                          isCurrentlyActive
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
                        }`}
                      >
                        {isApplyingThis ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Puxando...</span>
                          </>
                        ) : isCurrentlyActive ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Recarregar Base</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownCircle className="w-4 h-4" />
                            <span>Puxar para este Inventário</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Total de bases salvas: <strong>{savedBases.length}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>

      {/* CONFIRM APPLY BASE MODAL */}
      {confirmApplyBase && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              <ArrowDownCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Puxar Base para o Inventário?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Você está prestes a carregar a base do cliente <strong className="text-slate-900">{confirmApplyBase.clientName}</strong> com <strong>{confirmApplyBase.totalProducts?.toLocaleString("pt-BR")} produtos</strong> para o inventário <strong>{inventory.nome}</strong>.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 leading-relaxed">
              <strong>Atenção:</strong> Os produtos deste inventário serão atualizados com os itens desta base salva.
            </div>

            {/* Progress inside confirmation dialog if active */}
            {applyProgress && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-900">Progresso do Vínculo</span>
                  <span className="font-mono font-bold text-blue-700">{applyProgress.percent}%</span>
                </div>
                <div className="w-full bg-blue-200/70 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${applyProgress.percent}%` }}
                  />
                </div>
                <p className="text-[10px] text-blue-700 font-medium">
                  {applyProgress.stepText}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmApplyBase(null)}
                disabled={applyingBaseId !== null}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleApplyBase(confirmApplyBase)}
                disabled={applyingBaseId !== null}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {applyingBaseId !== null ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Puxando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirmar e Puxar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CLEAR PRODUCTS MODAL */}
      {confirmClearModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Remover Produtos do Inventário?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tem certeza que deseja desvincular e remover todos os produtos carregados no inventário <strong>{inventory.nome}</strong>?
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmClearModal(false)}
                disabled={isClearing}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearProducts}
                disabled={isClearing}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removendo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sim, Remover</span>
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
