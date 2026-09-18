import React, { useState, useEffect, useRef } from "react";
import { Inventory, Sector, Section } from "../types";
import { CheckCircle2, AlertTriangle, Search, RefreshCw, User, ArrowLeft, Hash, ShieldCheck, Wifi, WifiOff, CloudUpload, Clock } from "lucide-react";

interface Props {
  inventory: Inventory;
  onSync: () => void;
  onBackToApp?: () => void;
  isStandalone?: boolean;
}

interface PendingShadowAudit {
  id: string;
  sectorId: string;
  sectionCode: string;
  sectorNome: string;
  auditQuantity: number;
  expectedQuantity: number;
  auditorName: string;
  createdAt: number;
}

export default function ShadowAuditMobile({ inventory: propsInventory, onSync, onBackToApp, isStandalone }: Props) {
  const [inventory, setInventory] = useState<Inventory>(() => {
    try {
      const cached = localStorage.getItem(`invexa_shadow_inventory_${propsInventory.id}`);
      return cached ? JSON.parse(cached) : propsInventory;
    } catch (e) {
      return propsInventory;
    }
  });

  useEffect(() => {
    if (propsInventory && propsInventory.id && propsInventory.sectors && propsInventory.sectors.length > 0) {
      setInventory(propsInventory);
      try {
        localStorage.setItem(`invexa_shadow_inventory_${propsInventory.id}`, JSON.stringify(propsInventory));
      } catch (e) {}
    }
  }, [propsInventory]);

  const [auditorName, setAuditorName] = useState(() => {
    return localStorage.getItem("invexa_shadow_auditor_name") || "";
  });
  const [selectedSectorId, setSelectedSectorId] = useState<string>("");
  const [selectedSectionCode, setSelectedSectionCode] = useState<string>("");
  const [auditQuantityInput, setAuditQuantityInput] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cache offline de recontagens pendentes
  const [pendingAudits, setPendingAudits] = useState<PendingShadowAudit[]>(() => {
    try {
      const raw = localStorage.getItem(`invexa_shadow_pending_${inventory.id}`);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const [isOnline, setIsOnline] = useState<boolean>(() => 
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [syncingQueue, setSyncingQueue] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Quick section search / filter
  const [searchSectionQuery, setSearchSectionQuery] = useState("");

  useEffect(() => {
    localStorage.setItem("invexa_shadow_auditor_name", auditorName);
  }, [auditorName]);

  // Salva a lista de pendentes no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`invexa_shadow_pending_${inventory.id}`, JSON.stringify(pendingAudits));
    } catch (e) {
      console.error("Erro ao salvar cache de recontagens pendentes:", e);
    }
  }, [pendingAudits, inventory.id]);

  const syncPendingAuditsRef = useRef(handleSyncPending);
  useEffect(() => {
    syncPendingAuditsRef.current = handleSyncPending;
  }, [handleSyncPending]);

  // Monitora conectividade online/offline
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      if (syncPendingAuditsRef.current) {
        syncPendingAuditsRef.current();
      }
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    // Attempt to sync on mount if online
    if (navigator.onLine) {
       syncPendingAuditsRef.current();
    }
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sincroniza recontagens que foram salvas no cache
  async function handleSyncPending() {
    if (syncingQueue || pendingAudits.length === 0) return;
    setSyncingQueue(true);
    setSyncFeedback(null);

    const remaining: PendingShadowAudit[] = [...pendingAudits];
    let sentCount = 0;

    for (let i = 0; i < pendingAudits.length; i++) {
      const item = pendingAudits[i];
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(`/api/inventories/${inventory.id}/shadow-audit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            sectorId: item.sectorId,
            sectionCode: item.sectionCode,
            auditQuantity: item.auditQuantity,
            expectedQuantity: item.expectedQuantity,
            auditorName: item.auditorName
          })
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          // Sucesso: remove o item do cache de pendentes
          const idx = remaining.findIndex(r => r.id === item.id);
          if (idx !== -1) {
            remaining.splice(idx, 1);
          }
          sentCount++;
        } else {
          // Servidor recusou ou deu erro: interrompe e mantém o restante no cache
          break;
        }
      } catch (err) {
        // Dispositivo ficou offline ou caiu a conexão: interrompe e mantém para reenvio
        break;
      }
    }

    setPendingAudits(remaining);
    try {
      localStorage.setItem(`invexa_shadow_pending_${inventory.id}`, JSON.stringify(remaining));
    } catch (e) {}

    if (sentCount > 0) {
      onSync();
    }

    if (remaining.length > 0) {
      setSyncFeedback(`${remaining.length} recontagem(ns) mantida(s) no cache para reenvio.`);
    } else {
      setSyncFeedback("Todas as recontagens do cache foram sincronizadas com sucesso!");
      setTimeout(() => setSyncFeedback(null), 3500);
    }

    setSyncingQueue(false);
  }

  // Combine all sections of all sectors into a single list
  interface EnhancedSection extends Section {
    sectorId: string;
    sectorNome: string;
  }

  const allSections: EnhancedSection[] = [];
  (inventory?.sectors || []).forEach(sector => {
    (sector.sections || []).forEach(section => {
      allSections.push({
        ...section,
        sectorId: sector.id,
        sectorNome: sector.nome
      });
    });
  });

  // Sort sections numerically/alphanumerically
  allSections.sort((a, b) => {
    const numA = parseInt(a.code, 10);
    const numB = parseInt(b.code, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return String(a.code).localeCompare(String(b.code));
  });

  const filteredSections = allSections.filter(s => {
    if (!searchSectionQuery.trim()) return true;
    return s.code.includes(searchSectionQuery.trim());
  });

  const currentSection = allSections.find(s => s.code === selectedSectionCode && s.sectorId === selectedSectorId);

  async function handleSubmitAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!auditorName.trim()) {
      setErrorMessage("Por favor, preencha o seu nome ou identificação do auditor no topo.");
      return;
    }
    if (!selectedSectionCode || !selectedSectorId) {
      setErrorMessage("Por favor, selecione ou informe uma seção.");
      return;
    }
    if (auditQuantityInput === "" || isNaN(Number(auditQuantityInput))) {
      setErrorMessage("Por favor, informe a quantidade física recontada (use 0 se estiver vazia).");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    let expectedQuantity = 0;
    if (currentSection && currentSection.contagens && currentSection.contagens.length > 0) {
      if (inventory.compara) {
        const lastCount = currentSection.contagens[currentSection.contagens.length - 1];
        expectedQuantity = (lastCount?.items || []).reduce((sum, it) => sum + (Number(it.quantidade) || 0), 0);
      } else {
        expectedQuantity = currentSection.contagens.reduce((sum, c) => 
          sum + (c.items || []).reduce((itSum, it) => itSum + (Number(it.quantidade) || 0), 0), 0
        );
      }
    }

    const currentSectorNome = allSections.find(s => s.code === selectedSectionCode && s.sectorId === selectedSectorId)?.sectorNome || "";
    const auditQty = Number(auditQuantityInput);

    // Função de contingência offline: salva no cache local e libera a próxima seção
    const saveToLocalCache = () => {
      const newItem: PendingShadowAudit = {
        id: `${selectedSectorId}_${selectedSectionCode}_${Date.now()}`,
        sectorId: selectedSectorId,
        sectionCode: selectedSectionCode,
        sectorNome: currentSectorNome,
        auditQuantity: auditQty,
        expectedQuantity,
        auditorName: auditorName.trim() || "Auditor Sombra / Cliente",
        createdAt: Date.now()
      };
      setPendingAudits(prev => {
        const filtered = prev.filter(p => !(p.sectionCode === selectedSectionCode && p.sectorId === selectedSectorId));
        const updated = [...filtered, newItem];
        try {
          localStorage.setItem(`invexa_shadow_pending_${inventory.id}`, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      // Libera imediatamente a próxima seção sem travar o usuário
      setAuditQuantityInput("");
      setSelectedSectionCode("");
    };

    // Se estiver explicitamente offline, salva no cache e libera imediatamente
    if (!navigator.onLine) {
      saveToLocalCache();
      setSubmitting(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`/api/inventories/${inventory.id}/shadow-audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          sectorId: selectedSectorId,
          sectionCode: selectedSectionCode,
          auditQuantity: auditQty,
          expectedQuantity: expectedQuantity,
          auditorName: auditorName.trim() || "Auditor Sombra / Cliente"
        })
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        // Envio online bem sucedido: limpa qualquer cópia em cache dessa seção e libera a próxima
        setPendingAudits(prev => prev.filter(p => !(p.sectionCode === selectedSectionCode && p.sectorId === selectedSectorId)));
        setAuditQuantityInput("");
        setSelectedSectionCode(""); // Retorna para a grade imediatamente
        onSync();
      } else {
        // Falha no envio: armazena no cache para reenvio e libera a próxima seção
        saveToLocalCache();
      }
    } catch (err: any) {
      // Se deu timeout ou desconectou durante o envio: armazena no cache para reenvio e libera a próxima seção
      saveToLocalCache();
    } finally {
      setSubmitting(false);
    }
  }

  // Count summary stats across all sectors combined
  const totalSections = allSections.length;
  const auditedSections = allSections.filter(s => !!s.shadowAudit).length;
  const matchedSections = allSections.filter(s => s.shadowAudit && !s.shadowAudit.divergente).length;
  const divergentSections = allSections.filter(s => s.shadowAudit && s.shadowAudit.divergente).length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col items-center p-3 sm:p-6 pb-20 selection:bg-amber-500 selection:text-slate-900">
      
      {/* Outer Max-Width Card for Mobile Experience */}
      <div className="w-full max-w-lg space-y-4">
        
        {/* Header bar */}
        <header className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 font-black">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-amber-400 uppercase">Compara via Link</span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  Sombra
                </span>
                {/* Conexão indicador */}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 border ${
                  isOnline 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                    : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                }`}>
                  {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  <span>{isOnline ? "Online" : "Offline"}</span>
                </span>
              </div>
              <h1 className="text-base font-extrabold text-white leading-tight mt-0.5">
                {inventory.nome}
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">Filial: {inventory.filial || "01"}</p>
            </div>
          </div>

          {onBackToApp && !isStandalone && (
            <button
              onClick={onBackToApp}
              className="px-3 py-1.5 bg-slate-700/80 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl border border-slate-600 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Painel</span>
            </button>
          )}
        </header>

        {/* Banner de Sincronização de Cache Offline */}
        {pendingAudits.length > 0 && (
          <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border border-blue-500/40 rounded-2xl p-3.5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  {pendingAudits.length} {pendingAudits.length === 1 ? "recontagem no cache" : "recontagens no cache"}
                </span>
                <span className="text-[11px] text-blue-200">
                  {isOnline ? "Conexão disponível para envio." : "Salvas offline. Envie quando reconectar."}
                </span>
              </div>
            </div>

            {isOnline && (
              <button
                type="button"
                onClick={handleSyncPending}
                disabled={syncingQueue}
                className="w-full sm:w-auto px-3.5 py-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                {syncingQueue ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>Enviar Recontagens</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {syncFeedback && (
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-200 text-center font-medium">
            {syncFeedback}
          </div>
        )}

        {/* Auditor ID input */}
        <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 space-y-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-amber-400" />
            <span>Identificação do Auditor / Funcionário do Cliente:</span>
          </label>
          <input
            type="text"
            placeholder="Seu nome ou crachá (ex: Carlos - Auditor Cliente)"
            value={auditorName}
            onChange={e => setAuditorName(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition font-medium"
          />
        </div>

        {/* Status Summary & Guidelines */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 text-xs space-y-2 text-slate-300">
          <div className="flex items-center justify-between font-bold text-slate-200">
            <span>Resumo Geral das Seções:</span>
            <span className="font-mono text-amber-400">{auditedSections}/{totalSections} auditadas</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-2 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400 shrink-0"></div>
              <div>
                <span className="text-[10px] text-yellow-300 font-bold block">Idênticas (Amarelo)</span>
                <span className="text-sm font-black text-yellow-400 font-mono">{matchedSections}</span>
              </div>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500 shrink-0"></div>
              <div>
                <span className="text-[10px] text-rose-300 font-bold block">Divergentes (Vermelho)</span>
                <span className="text-sm font-black text-rose-400 font-mono">{divergentSections}</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
            💡 <em>Esta ferramenta é permanente e atua como contagem sombra pelo cliente. Todas as alterações refletem instantaneamente no painel operacional central.</em>
          </p>
        </div>

        {/* Audit Form / Interactive Workflow */}
        <form onSubmit={handleSubmitAudit} className="w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
          {!auditorName.trim() ? (
            /* Identification Required Block */
            <div className="space-y-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500 animate-pulse">
                <User className="w-8 h-8 stroke-[2]" />
              </div>
              <div className="space-y-1.5 px-2">
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">Identificação Obrigatória</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Por favor, preencha o seu nome ou crachá no campo <strong>Identificação do Auditor</strong> no topo para liberar a auditoria e as seções.
                </p>
              </div>
            </div>
          ) : !selectedSectionCode ? (
            /* STEP 1: Select Section Grid View */
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-amber-400" />
                  <span>Escolha uma Seção para Recontar:</span>
                </label>
              </div>

              {/* Quick search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar número da seção..."
                  value={searchSectionQuery}
                  onChange={e => setSearchSectionQuery(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Grid of Section buttons */}
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-80 overflow-y-auto p-1 bg-slate-900/60 rounded-xl border border-slate-700/60">
                {filteredSections.length === 0 ? (
                  <div className="col-span-full py-6 text-center text-xs text-slate-500 italic">
                    Nenhuma seção encontrada.
                  </div>
                ) : (
                  filteredSections.map(s => {
                    const isSelected = selectedSectionCode === s.code && selectedSectorId === s.sectorId;
                    const isAuditedMatch = s.shadowAudit && !s.shadowAudit.divergente;
                    const isAuditedDivergent = s.shadowAudit && s.shadowAudit.divergente;
                    const pendingItem = pendingAudits.find(p => p.sectionCode === s.code && p.sectorId === s.sectorId);

                    let btnBg = "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700";
                    if (isSelected) {
                      btnBg = "bg-amber-500 text-slate-950 border-amber-400 font-black ring-2 ring-amber-300 shadow-md";
                    } else if (pendingItem) {
                      btnBg = "bg-blue-600 text-white border-blue-400 font-black";
                    } else if (isAuditedMatch) {
                      btnBg = "bg-yellow-400 text-yellow-950 border-yellow-500 font-black";
                    } else if (isAuditedDivergent) {
                      btnBg = "bg-rose-600 text-white border-rose-700 font-black";
                    } else if (s.status === "CONTADO") {
                      btnBg = "bg-emerald-700/60 text-emerald-100 border-emerald-600/80";
                    }

                    return (
                      <button
                        key={`${s.code}-${s.sectorId}`}
                        type="button"
                        onClick={() => {
                          setSelectedSectionCode(s.code);
                          setSelectedSectorId(s.sectorId);
                          if (pendingItem) {
                            setAuditQuantityInput(String(pendingItem.auditQuantity));
                          } else {
                            setAuditQuantityInput(s.shadowAudit ? String(s.shadowAudit.auditQuantity) : "");
                          }
                          setErrorMessage(null);
                        }}
                        className={`aspect-square flex flex-col items-center justify-center p-1 rounded-lg border text-xs font-bold transition cursor-pointer ${btnBg}`}
                      >
                        <span className="leading-none text-xs sm:text-sm font-mono">{s.code}</span>
                        <span className="text-[7px] text-slate-400 opacity-80 uppercase mt-0.5 max-w-[50px] truncate">{s.sectorNome}</span>
                        {pendingItem ? (
                          <span className="text-[8px] bg-blue-950/80 text-blue-200 px-1 rounded font-mono mt-0.5">
                            {pendingItem.auditQuantity}pç (Cache)
                          </span>
                        ) : s.shadowAudit ? (
                          <span className="text-[8px] opacity-90 font-mono mt-0.5">
                            {s.shadowAudit.auditQuantity}pç
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="text-center text-[10px] text-slate-400 italic">
                💡 Toque em qualquer seção acima para preencher sua quantidade de auditoria.
              </div>
            </div>
          ) : (
            /* STEP 2: Selected Section Count & Submit View */
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
              
              {/* Back and active details header */}
              <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Setor: {allSections.find(s => s.code === selectedSectionCode && s.sectorId === selectedSectorId)?.sectorNome || ""}</span>
                  <h3 className="text-lg font-black text-white flex items-center gap-1.5 mt-0.5">
                    <span className="text-amber-400">Seção {selectedSectionCode}</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSectionCode("");
                    setErrorMessage(null);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-lg border border-slate-700 transition"
                >
                  ← Voltar
                </button>
              </div>

              {/* Quantity input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider text-center">
                  Informe a Quantidade Física (Peças):
                </label>
                
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={auditQuantityInput}
                  onChange={e => setAuditQuantityInput(e.target.value)}
                  className="w-full bg-slate-900 border-2 border-amber-500/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 rounded-xl px-4 py-3.5 text-3xl font-black text-white text-center font-mono outline-none shadow-inner"
                  autoFocus
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit / Action Button */}
              <button
                type="submit"
                disabled={submitting || auditQuantityInput === ""}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 uppercase tracking-wide"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Salvando Recontagem...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    <span>{isOnline ? "Salvar e Enviar Recontagem" : "Salvar no Cache (Offline)"}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>

      </div>
    </div>
  );
}

