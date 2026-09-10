import React, { useState, useEffect } from "react";
import { Inventory, Sector, Section } from "../types";
import { CheckCircle2, AlertTriangle, Search, QrCode, RefreshCw, Smartphone, Layers, User, ArrowLeft, Hash, ShieldCheck, History, ExternalLink, Sparkles } from "lucide-react";


interface Props {
  inventory: Inventory;
  onSync: () => void;
  onBackToApp?: () => void;
  isStandalone?: boolean;
}

export default function ShadowAuditMobile({ inventory, onSync, onBackToApp, isStandalone }: Props) {
  const [auditorName, setAuditorName] = useState(() => {
    return localStorage.getItem("invexa_shadow_auditor_name") || "";
  });
  const [selectedSectorId, setSelectedSectorId] = useState<string>("");
  const [selectedSectionCode, setSelectedSectionCode] = useState<string>("");
  const [auditQuantityInput, setAuditQuantityInput] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    isMatch: boolean;
    status: string;
    auditQuantity: number;
    collectedQuantity: number;
    sectorName: string;
    sectionCode: string;
    timestamp: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick section search / filter
  const [searchSectionQuery, setSearchSectionQuery] = useState("");

  useEffect(() => {
    localStorage.setItem("invexa_shadow_auditor_name", auditorName);
  }, [auditorName]);

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

    try {
      const res = await fetch(`/api/inventories/${inventory.id}/shadow-audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectorId: selectedSectorId,
          sectionCode: selectedSectionCode,
          auditQuantity: Number(auditQuantityInput),
          expectedQuantity: expectedQuantity,
          auditorName: auditorName.trim() || "Auditor Sombra / Cliente"
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLastResult({
          success: true,
          isMatch: data.isMatch,
          status: data.status,
          auditQuantity: data.auditQuantity,
          collectedQuantity: data.collectedQuantity,
          sectorName: data.sectorName,
          sectionCode: data.sectionCode,
          timestamp: new Date().toLocaleTimeString()
        });
        setAuditQuantityInput("");
        onSync();
      } else {
        setErrorMessage(data.error || "Erro ao registrar recontagem.");
      }
    } catch (err) {
      setErrorMessage("Erro de comunicação com o servidor.");
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

                    let btnBg = "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700";
                    if (isSelected) {
                      btnBg = "bg-amber-500 text-slate-950 border-amber-400 font-black ring-2 ring-amber-300 shadow-md";
                    } else if (isAuditedMatch) {
                      btnBg = "bg-yellow-400 text-yellow-950 border-yellow-500 font-black";
                    } else if (isAuditedDivergent) {
                      btnBg = "bg-rose-600 text-white border-rose-700 font-black animate-pulse";
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
                          setAuditQuantityInput(s.shadowAudit ? String(s.shadowAudit.auditQuantity) : "");
                          setErrorMessage(null);
                        }}
                        className={`aspect-square flex flex-col items-center justify-center p-1 rounded-lg border text-xs font-bold transition cursor-pointer ${btnBg}`}
                      >
                        <span className="leading-none text-xs sm:text-sm font-mono">{s.code}</span>
                        <span className="text-[7px] text-slate-400 opacity-80 uppercase mt-0.5 max-w-[50px] truncate">{s.sectorNome}</span>
                        {s.shadowAudit && (
                          <span className="text-[8px] opacity-90 font-mono mt-0.5">
                            {s.shadowAudit.auditQuantity}pç
                          </span>
                        )}
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
                    <span>Enviando Recontagem...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    <span>Validar e Enviar para o Painel</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>

        {/* Live Feedback Result Card */}
        {lastResult && (
          <div className={`p-4 sm:p-5 rounded-2xl border shadow-xl animate-in fade-in zoom-in-95 duration-200 ${
            lastResult.isMatch 
              ? "bg-yellow-400 text-yellow-950 border-yellow-500" 
              : "bg-rose-600 text-white border-rose-700"
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                lastResult.isMatch ? "bg-yellow-500/40 text-yellow-950" : "bg-rose-700 text-white"
              }`}>
                {lastResult.isMatch ? (
                  <CheckCircle2 className="w-6 h-6 stroke-[3]" />
                ) : (
                  <AlertTriangle className="w-6 h-6 stroke-[3]" />
                )}
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-tight">
                    {lastResult.isMatch ? "✅ COMPARA OK (QUANTIDADE IDÊNTICA)" : "⚠️ DIVERGÊNCIA DETECTADA"}
                  </h3>
                  <span className="text-[10px] font-mono opacity-80">{lastResult.timestamp}</span>
                </div>

                <p className="text-xs font-semibold leading-snug">
                  {lastResult.isMatch ? (
                    <>
                      A recontagem física de <strong>{lastResult.auditQuantity} peças</strong> na Seção <strong>{lastResult.sectionCode}</strong> confere 100% com a coleta.
                      <span className="block mt-1 font-bold underline">
                        O painel central foi marcado em AMARELO (Compara OK).
                      </span>
                    </>
                  ) : (
                    <>
                      Recontagem física informou <strong>{lastResult.auditQuantity} peças</strong>, mas a equipe registrou <strong>{lastResult.collectedQuantity} peças</strong>.
                      <span className="block mt-1 font-bold underline">
                        O painel central foi marcado em VERMELHO para recontagem.
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
