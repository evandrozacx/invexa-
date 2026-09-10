import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import CollectorSimulator from "./components/CollectorSimulator";
import ProductAddressImport from "./components/ProductAddressImport";
import ReportsPanel from "./components/ReportsPanel";
import SettingsPanel from "./components/SettingsPanel";
import InventoriesPanel from "./components/InventoriesPanel";
import ShadowAuditMobile from "./components/ShadowAuditMobile";
import { Company, Operator, Device, Inventory } from "./types";
import { ListFilter, Smartphone, RefreshCw, Layers, Database, Shield, FileText, Settings, Sliders, LayoutGrid, RotateCcw, ShieldCheck } from "lucide-react";
import { useDb } from "./lib/useDb";


export default function App() {
  const { db, loading: dbLoading } = useDb();
  
  const [activeTab, setActiveTab] = useState<"inventories" | "dashboard" | "simulator" | "imports" | "reports" | "settings" | "sombra">(() => {
    try {
      const saved = localStorage.getItem("invexa_active_tab");
      if (saved && ["inventories", "dashboard", "simulator", "imports", "reports", "settings", "sombra"].includes(saved)) {
        return saved as any;
      }
    } catch (e) {
      console.error(e);
    }
    return "inventories";
  });
  const [showCollectorSplit, setShowCollectorSplit] = useState(true); // Split screen for awesome interactive demo

  // Standalone Shadow Audit Link check
  const [standaloneSombraId, setStandaloneSombraId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("sombra") || params.get("audit") || params.get("comparaLink");
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [activeInventoryId, setActiveInventoryId] = useState<string>(() => {
    try {
      return localStorage.getItem("invexa_active_inventory_id") || "";
    } catch (e) {
      return "";
    }
  });
  const [editInventoryId, setEditInventoryId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("invexa_active_tab", activeTab);
    } catch (e) {
      console.error(e);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeInventoryId) {
      try {
        localStorage.setItem("invexa_active_inventory_id", activeInventoryId);
      } catch (e) {
        console.error(e);
      }
    }
  }, [activeInventoryId]);

  function handleEditInventoryFromDashboard(id: string) {
    setEditInventoryId(id);
    setActiveTab("inventories");
  }

  // Handle active inventory selection dynamically
  useEffect(() => {
    if (!dbLoading && db.inventories.length > 0) {
      const savedInventoryId = localStorage.getItem("invexa_active_inventory_id") || activeInventoryId;
      const inventoryExists = db.inventories.some((i: Inventory) => i.id === savedInventoryId);
      if (savedInventoryId && inventoryExists) {
        setActiveInventoryId(savedInventoryId);
      } else {
        const active = db.inventories.find((i: Inventory) => i.status === "EM_ANDAMENTO") || db.inventories[0];
        setActiveInventoryId(active.id);
      }
      setLoading(false);
    } else if (!dbLoading) {
      setLoading(false);
    }
  }, [dbLoading, db.inventories]);

  async function syncState() {}

  // Reset database back to default rich PDF mock values
  async function resetDatabase() {
    if (!window.confirm("Deseja restaurar as configurações originais do sistema? Todas as contagens de teste serão reiniciadas para as faixas originais do PDF.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (res.ok) {
        await syncState();
        alert("Sistema restaurado com sucesso!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Initial effect removed as useDb handles it natively

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans space-y-3 p-6 text-center">
        <RefreshCw className="w-10 h-10 text-cyan-600 animate-spin" />
        <span className="text-sm font-semibold text-slate-600 font-mono">CONECTANDO À API ROBUSTA DO CENTRALIZADOR INVEXA...</span>
      </div>
    );
  }

  if (errorMsg || !db) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center font-sans p-6 text-center space-y-4 text-white">
        <div className="bg-slate-800 text-slate-100 p-8 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-700">
          <Database className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Conectando ao Centralizador</h2>
          <p className="text-sm font-medium mb-4 text-slate-300">{errorMsg || "Não foi possível carregar os dados do servidor."}</p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button 
              onClick={() => { setLoading(true); syncState(); }}
              className="flex-1 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-cyan-500/20 text-sm"
            >
              Tentar Novamente
            </button>
            <button 
              onClick={resetDatabase}
              className="flex-1 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition border border-slate-600 text-sm"
            >
              Restaurar Dados
            </button>
          </div>
        </div>
      </div>
    );
  }

  const emptyInventory: Inventory = {
    id: "",
    nome: "NENHUM INVENTÁRIO SELECIONADO",
    filial: "---",
    dataExecucao: "",
    dataEdicao: "",
    status: "PLANEJADO",
    tipoContagem: "NORMAL_FECHADA_SEM_MULT",
    coletaPallets: "NAO",
    permissaoColeta: "SOMENTE_CARREGADOS",
    compara: false,
    coordenador: "",
    gerente: "",
    inicioEstoque: "",
    terminoEstoque: "",
    inicioLoja: "",
    terminoLoja: "",
    inicioDivergencia: "",
    terminoDivergencia: "",
    products: [],
    addresses: [],
    sectors: []
  };

  const activeInventory = (db.inventories && db.inventories.length > 0)
    ? (db.inventories.find(i => i.id === activeInventoryId) || db.inventories[0])
    : emptyInventory;

  // Render standalone shadow audit mobile screen directly if accessed via permanent link
  if (standaloneSombraId) {
    const sombraInventory = (db.inventories || []).find(i => i.id === standaloneSombraId) || activeInventory;
    return (
      <ShadowAuditMobile
        inventory={sombraInventory}
        onSync={syncState}
        onBackToApp={() => {
          setStandaloneSombraId(null);
          try {
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (e) {}
        }}
        isStandalone={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-900 antialiased">
      
      {usingFallback && (
        <div className="fixed top-0 left-0 w-full bg-amber-500/10 backdrop-blur-md text-amber-900 text-xs font-medium text-center py-2 px-4 shadow-2xs z-[9999] flex flex-col sm:flex-row items-center justify-center gap-2 border-b border-amber-500/20">
          <span className="flex items-center gap-1.5 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <strong>Modo de Demonstração Local:</strong> Dados temporários salvos na memória do navegador.
          </span>
          <span className="text-amber-800/80">
            Para persistência permanente via MySQL, configure <span className="font-mono bg-amber-500/20 px-1.5 py-0.5 rounded text-[11px]">MYSQL_URI</span> nas configurações.
          </span>
        </div>
      )}

      {/* 1. DESKTOP SIDEBAR NAVIGATION */}
      <aside className="hidden lg:flex lg:w-64 bg-slate-950 border-r border-slate-800/80 flex-col justify-between text-white h-screen sticky top-0 z-30">
        <div className="flex-1 flex flex-col py-6 px-4 space-y-6 overflow-y-auto">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 text-white font-black p-2.5 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Layers className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight block text-white leading-none">INVEXA</span>
              <span className="text-[10px] text-indigo-400 font-semibold block tracking-wider uppercase leading-none mt-1">Enterprise Core</span>
            </div>
          </div>

          {/* Active Inventory Switcher in Sidebar */}
          {db.inventories.length > 0 && (
            <div className="px-1">
              <div className="bg-slate-900/90 border border-slate-800/80 p-2.5 rounded-xl text-xs space-y-1 hover:border-slate-700 transition-colors">
                <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">Inventário Ativo</span>
                <select
                  value={activeInventoryId}
                  onChange={(e) => setActiveInventoryId(e.target.value)}
                  className="w-full bg-transparent text-indigo-300 font-bold outline-none cursor-pointer text-xs truncate"
                >
                  {db.inventories.map(inv => (
                    <option key={inv.id} value={inv.id} className="bg-slate-900 text-white">
                      {inv.nome} ({inv.filial})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 tracking-wider block px-2 pb-2 uppercase">Menu Principal</span>
            
            <button
              onClick={() => setActiveTab("inventories")}
              className={`w-full px-3 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-3 ${
                activeTab === "inventories" 
                  ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/30" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
              }`}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span>Configurar Inventários</span>
            </button>

            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full px-3 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-3 ${
                activeTab === "dashboard" 
                  ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/30" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
              }`}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              <span>Painel de Mapeamento</span>
            </button>

            <button
              onClick={() => setActiveTab("imports")}
              className={`w-full px-3 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-3 ${
                activeTab === "imports" 
                  ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/30" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
              }`}
            >
              <Database className="w-4 h-4 shrink-0" />
              <span>Importar Bases (.CSV)</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full px-3 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-3 ${
                activeTab === "settings" 
                  ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/30" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Configurações Sistema</span>
            </button>
            
            <button
              onClick={() => setActiveTab("simulator")}
              className={`w-full px-3 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-3 ${
                activeTab === "simulator" 
                  ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/30" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Simulador Terminal</span>
            </button>

            <button
              onClick={() => setActiveTab("sombra")}
              className={`w-full px-3 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-3 ${
                activeTab === "sombra" 
                  ? "bg-amber-600 text-white font-bold shadow-sm shadow-amber-600/30" 
                  : "text-amber-400/80 hover:text-amber-300 hover:bg-slate-900/80"
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Compara via Link (Sombra)</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-4 border-t border-slate-900 bg-slate-950 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-300">API Central v2.4</span>
          </div>
          <div className="text-[10px] text-slate-500 leading-tight">
            PPBrasil • Mesquita • EMDS
          </div>
        </div>
      </aside>

      {/* 2. MOBILE TOP NAVIGATION & TAB BAR */}
      <header className="lg:hidden bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-cyan-500 text-slate-950 font-black px-2.5 py-1 rounded-lg tracking-tighter text-sm flex items-center gap-1 font-mono">
              <Layers className="w-4 h-4" />
              <span>INVEXA</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Quick Active Inventory dropdown on Mobile */}
            {db.inventories.length > 0 && (
              <select
                value={activeInventoryId}
                onChange={(e) => setActiveInventoryId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-cyan-400 font-bold font-mono outline-none max-w-[120px] truncate"
              >
                {db.inventories.map(inv => (
                  <option key={inv.id} value={inv.id} className="bg-slate-900 text-white">
                    {inv.filial}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setShowCollectorSplit(!showCollectorSplit)}
              className={`p-1.5 rounded transition-all ${
                showCollectorSplit ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-800 text-slate-400"
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </button>

            <button
              onClick={resetDatabase}
              className="bg-slate-800 text-slate-400 p-1.5 rounded"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Scroller */}
        <div className="bg-slate-950/50 border-t border-slate-900 overflow-x-auto flex gap-1 px-2 py-1">
          <button
            onClick={() => setActiveTab("inventories")}
            className={`px-3 py-1.5 text-[11px] font-semibold tracking-wider rounded-md whitespace-nowrap ${
              activeTab === "inventories" ? "bg-cyan-500/10 text-cyan-400 font-bold" : "text-slate-400"
            }`}
          >
            Inventários
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-3 py-1.5 text-[11px] font-semibold tracking-wider rounded-md whitespace-nowrap ${
              activeTab === "dashboard" ? "bg-cyan-500/10 text-cyan-400 font-bold" : "text-slate-400"
            }`}
          >
            Mapeamento
          </button>
          <button
            onClick={() => setActiveTab("imports")}
            className={`px-3 py-1.5 text-[11px] font-semibold tracking-wider rounded-md whitespace-nowrap ${
              activeTab === "imports" ? "bg-cyan-500/10 text-cyan-400 font-bold" : "text-slate-400"
            }`}
          >
            Importação
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-3 py-1.5 text-[11px] font-semibold tracking-wider rounded-md whitespace-nowrap ${
              activeTab === "settings" ? "bg-cyan-500/10 text-cyan-400 font-bold" : "text-slate-400"
            }`}
          >
            Configuração
          </button>
          <button
            onClick={() => setActiveTab("simulator")}
            className={`px-3 py-1.5 text-[11px] font-semibold tracking-wider rounded-md whitespace-nowrap ${
              activeTab === "simulator" ? "bg-cyan-500/10 text-cyan-400 font-bold" : "text-slate-400"
            }`}
          >
            Terminal
          </button>
        </div>
      </header>

      {/* 3. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        
        {/* DESKTOP CONTENT HEADER */}
        <header className="hidden lg:flex bg-white border-b border-slate-200 h-16 items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase font-mono">
              {activeTab === "inventories" && "Controle e Parâmetros de Inventários"}
              {activeTab === "dashboard" && "Painel de Mapeamento & Auditoria"}
              {activeTab === "imports" && "Mapeamento & Importação de Arquivos"}
              {activeTab === "reports" && "Relatórios & Resultados em Tempo Real"}
              {activeTab === "settings" && "Configurações do Sistema"}
              {activeTab === "simulator" && "Simulador de Terminal Coletor"}
            </h1>
            <div className="h-4 w-px bg-slate-300"></div>
            <span className="text-xs text-slate-500 font-sans">
              Filial: <b className="font-bold text-slate-700">{activeInventory.filial}</b>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCollectorSplit(!showCollectorSplit)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showCollectorSplit 
                  ? "bg-blue-50 text-blue-600 border-blue-200/60 shadow-2xs" 
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <Smartphone className="w-4 h-4 text-blue-500" />
              <span>Coletor Lado a Lado</span>
            </button>

            <button
              onClick={resetDatabase}
              title="Restaurar banco de dados original"
              className="bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 p-2 rounded-lg transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* WORKSPACE VIEWPORTS */}
        <main className="flex-1 p-4 lg:p-6">
          <div className={`grid grid-cols-1 ${showCollectorSplit ? "lg:grid-cols-4" : ""} gap-6`}>
            
            {/* VIEWPORT CONTROLLER */}
            <div className={`${showCollectorSplit ? "lg:col-span-3" : "w-full"}`}>
              {activeTab === "inventories" && (
                <InventoriesPanel
                  inventories={db.inventories}
                  activeInventoryId={activeInventoryId}
                  setActiveInventoryId={setActiveInventoryId}
                  onSync={syncState}
                  setActiveTab={setActiveTab}
                  editInventoryId={editInventoryId}
                  clearEditInventoryId={() => setEditInventoryId(null)}
                />
              )}
              {activeTab === "dashboard" && (
                <Dashboard 
                  inventory={activeInventory} 
                  operators={db.operators} 
                  onSync={syncState} 
                  setActiveTab={setActiveTab} 
                  onEditInventory={() => handleEditInventoryFromDashboard(activeInventory.id)}
                />
              )}
              {activeTab === "imports" && (
                <ProductAddressImport 
                  inventory={activeInventory} 
                  inventories={db.inventories}
                  setActiveInventoryId={setActiveInventoryId}
                  onSync={syncState} 
                />
              )}
              {activeTab === "reports" && (
                <ReportsPanel inventory={activeInventory} operators={db.operators} onSync={syncState} />
              )}
              {activeTab === "settings" && (
                <SettingsPanel
                  companies={db.companies}
                  operators={db.operators}
                  devices={db.devices}
                  inventories={db.inventories}
                  activeInventoryId={activeInventoryId}
                  setActiveInventoryId={setActiveInventoryId}
                  onSync={syncState}
                />
              )}
              {activeTab === "simulator" && (
                <div className="bg-slate-900/5 p-6 rounded-2xl border border-slate-200">
                  <h3 className="text-center font-bold text-slate-800 text-sm mb-4">Simulador de Terminal Coletor</h3>
                  <CollectorSimulator db={db} onSync={syncState} />
                </div>
              )}
              {activeTab === "sombra" && (
                <div className="rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl">
                  <ShadowAuditMobile
                    inventory={activeInventory}
                    onSync={syncState}
                    onBackToApp={() => setActiveTab("dashboard")}
                  />
                </div>
              )}
            </div>

            {/* SPLIT SCREEN ACTIVE SIMULATOR PANEL */}
            {showCollectorSplit && (
              <div className="hidden lg:block lg:col-span-1 space-y-4">
                <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-xl shadow-3xs space-y-2">
                  <span className="text-[10px] font-extrabold text-blue-800 font-mono block tracking-wider uppercase">VISUALIZADOR DUPLO / API CENTRAL:</span>
                  <p className="text-[11px] text-blue-950/80 leading-relaxed font-sans">
                    Este painel simula um terminal Android real conectado à rede. Ao bipar e transmitir abaixo, a grade de mapeamento atualiza <b>imediatamente</b> na sua tela!
                  </p>
                </div>
                <CollectorSimulator db={db} onSync={syncState} />
              </div>
            )}

          </div>
        </main>

        {/* FOOTER */}
        <footer className="bg-white border-t border-slate-200 text-slate-400 py-4 text-center text-[11px] font-mono mt-auto">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>Invexa Web System • PPBrasil / Mesquita / EMDS</span>
            <span>Sincronizado via HTTPS • API Central v2.4</span>
          </div>
        </footer>

      </div>

    </div>
  );
}
