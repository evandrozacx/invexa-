import React, { useState } from "react";
import { Company, Operator, Device, Inventory } from "../types";
import { Plus, Trash2, Smartphone, Shield, Users, Briefcase, Link, Check, RefreshCw, Calendar, Layers, Sliders, Copy, Code, Terminal, Play, CheckCircle2 } from "lucide-react";


interface Props {
  companies: Company[];
  operators: Operator[];
  devices: Device[];
  inventories: Inventory[];
  activeInventoryId: string;
  setActiveInventoryId: (id: string) => void;
  onSync: () => void;
}

export default function SettingsPanel({ companies, operators, devices, inventories, activeInventoryId, setActiveInventoryId, onSync }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<"inventories" | "companies" | "operators" | "devices" | "debug">("inventories");
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  function copyToClipboard(text: string, fieldId: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2500);
  }

  async function handleSendTestTransmission() {
    setSendingTest(true);
    setTestResult(null);
    try {
      const activeInv = inventories.find(i => i.id === activeInventoryId) || inventories[0];
      const payload = {
        inventoryId: activeInv ? activeInv.id : "ID_DO_INVENTARIO",
        sectionCode: "0001",
        operatorId: "OP01",
        operatorName: "OPERADOR ANDROID TESTE",
        collectorNumber: "01",
        items: [
          {
            ean: "789100000001",
            sap: "100200",
            descricao: "PRODUTO TESTE ANDROID API",
            quantidade: 5.0,
            lote: "LOTE-NATIVO",
            validade: "2027-12-31",
            palete: "PAL01",
            timestamp: new Date().toISOString()
          }
        ]
      };

      const res = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": "DEMO" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setTestResult("Sucesso! O endpoint /api/collect respondeu HTTP 200 e processou o teste com êxito.");
        fetchDebugLogs();
        onSync();
      } else {
        setTestResult(`Erro ${res.status}: ${res.statusText}`);
      }
    } catch (e: any) {
      setTestResult(`Falha na chamada: ${e.message}`);
    } finally {
      setSendingTest(false);
    }
  }

  async function fetchDebugLogs() {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/debug/last-transmissions");
      if (res.ok) {
        const data = await res.json();
        setDebugLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  }

  // Company Form
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);

  // Operator Form
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [operatorCompanyId, setOperatorCompanyId] = useState("");
  const [operatorHierarquia, setOperatorHierarquia] = useState<Operator["hierarquia"]>("Inventariante");

  // Device Form
  const [deviceName, setDeviceName] = useState("");
  const [deviceCompanyId, setDeviceCompanyId] = useState("");

  // Inventory Form
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);
  const [invNome, setInvNome] = useState("");
  const [invFilial, setInvFilial] = useState("");
  const [invData, setInvData] = useState(new Date().toISOString().split("T")[0]);
  const [invTipoContagem, setInvTipoContagem] = useState<Inventory["tipoContagem"]>("NORMAL_FECHADA_COM_MULT");
  const [invColetaPallets, setInvColetaPallets] = useState<Inventory["coletaPallets"]>("SIMPLIFICADO");
  const [invPermissaoColeta, setInvPermissaoColeta] = useState<Inventory["permissaoColeta"]>("SOMENTE_CARREGADOS");
  const [invCompara, setInvCompara] = useState(true);

  const [feedback, setFeedback] = useState("");
  const [confirmDeleteInvId, setConfirmDeleteInvId] = useState<string | null>(null);

  async function handleSaveInventory(e: React.FormEvent) {
    e.preventDefault();
    if (!invNome || !invFilial) return;

    const payload: Partial<Inventory> = {
      id: editingInventoryId || undefined,
      nome: invNome.toUpperCase(),
      filial: invFilial.toUpperCase(),
      dataExecucao: invData,
      tipoContagem: invTipoContagem,
      coletaPallets: invColetaPallets,
      permissaoColeta: invPermissaoColeta,
      compara: invCompara,
      status: editingInventoryId ? undefined : "CRIADO"
    };

    try {
      const res = await fetch("/api/inventories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setFeedback(editingInventoryId ? "Inventário atualizado com sucesso!" : "Novo inventário cadastrado com sucesso!");
        setEditingInventoryId(null);
        setInvNome("");
        setInvFilial("");
        setInvData(new Date().toISOString().split("T")[0]);
        setInvTipoContagem("NORMAL_FECHADA_COM_MULT");
        setInvColetaPallets("SIMPLIFICADO");
        setInvPermissaoColeta("SOMENTE_CARREGADOS");
        setInvCompara(true);
        onSync();
        
        // If it was just created, set as active
        if (!editingInventoryId && data.inventory?.id) {
          setActiveInventoryId(data.inventory.id);
        }
      }
    } catch (err) {
      setFeedback("Erro ao gravar inventário.");
    }
  }

  function handleDeleteInventory(id: string) {
    setConfirmDeleteInvId(id);
  }

  async function executeDeleteInventory(id: string) {
    setConfirmDeleteInvId(null);
    try {
      const res = await fetch(`/api/inventories/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setFeedback("Inventário removido com sucesso.");
        if (activeInventoryId === id) {
          const remaining = inventories.filter(i => i.id !== id);
          if (remaining.length > 0) {
            setActiveInventoryId(remaining[0].id);
          }
        }
        onSync();
      }
    } catch (err) {
      setFeedback("Erro ao remover inventário.");
    }
  }

  function handleStartEditInventory(inv: Inventory) {
    setEditingInventoryId(inv.id);
    setInvNome(inv.nome || "");
    setInvFilial(inv.filial || "");
    setInvData(inv.dataExecucao || "");
    setInvTipoContagem(inv.tipoContagem || "NORMAL_FECHADA_COM_MULT");
    setInvColetaPallets(inv.coletaPallets || "SIMPLIFICADO");
    setInvPermissaoColeta(inv.permissaoColeta || "SOMENTE_CARREGADOS");
    setInvCompara(inv.compara ?? true);
  }

  function handleCancelEdit() {
    setEditingInventoryId(null);
    setInvNome("");
    setInvFilial("");
    setInvData(new Date().toISOString().split("T")[0]);
    setInvTipoContagem("NORMAL_FECHADA_COM_MULT");
    setInvColetaPallets("SIMPLIFICADO");
    setInvPermissaoColeta("SOMENTE_CARREGADOS");
    setInvCompara(true);
  }

  async function handleAddCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!cnpj || !razaoSocial || !nomeFantasia) return;

    const payload = {
      cnpj,
      razaoSocial,
      nomeFantasia: nomeFantasia.toUpperCase(),
      parcerias: selectedPartnerIds
    };

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setFeedback("Empresa cadastrada com sucesso!");
        setCnpj("");
        setRazaoSocial("");
        setNomeFantasia("");
        setSelectedPartnerIds([]);
        onSync();
      }
    } catch (err) {
      setFeedback("Erro ao cadastrar empresa.");
    }
  }

  async function handleAddOperator(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeCompleto || !cpf || !operatorCompanyId) return;

    const payload = {
      nomeCompleto: nomeCompleto.toUpperCase(),
      cpf,
      dataNascimento,
      companyId: operatorCompanyId,
      hierarquia: operatorHierarquia
    };

    try {
      const res = await fetch("/api/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setFeedback("Operador/Colaborador cadastrado!");
        setNomeCompleto("");
        setCpf("");
        setDataNascimento("");
        setOperatorHierarquia("Inventariante");
        onSync();
      }
    } catch (err) {
      setFeedback("Erro ao cadastrar operador.");
    }
  }

  async function handleAddDevice(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceName || !deviceCompanyId) return;

    const payload = {
      nomeFantasia: deviceName.toUpperCase(),
      companyId: deviceCompanyId,
      lastActive: new Date().toISOString()
    };

    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setFeedback("Dispositivo Terminal cadastrado com sucesso!");
        setDeviceName("");
        onSync();
      }
    } catch (err) {
      setFeedback("Erro ao cadastrar terminal.");
    }
  }

  function togglePartner(id: string) {
    if (selectedPartnerIds.includes(id)) {
      setSelectedPartnerIds(selectedPartnerIds.filter(pid => pid !== id));
    } else {
      setSelectedPartnerIds([...selectedPartnerIds, id]);
    }
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">Painel de Configurações do Sistema</h2>
          <p className="text-xs text-slate-500">Cadastre empresas parceiras, operadores coletores e terminais autorizados</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => { setActiveSubTab("inventories"); setFeedback(""); }}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors flex items-center gap-1 ${activeSubTab === "inventories" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"}`}
          >
            <Sliders className="w-3.5 h-3.5" /> Inventários
          </button>
          <button
            onClick={() => { setActiveSubTab("companies"); setFeedback(""); }}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors flex items-center gap-1 ${activeSubTab === "companies" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"}`}
          >
            <Briefcase className="w-3.5 h-3.5" /> Empresas
          </button>
          <button
            onClick={() => { setActiveSubTab("operators"); setFeedback(""); }}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors flex items-center gap-1 ${activeSubTab === "operators" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"}`}
          >
            <Users className="w-3.5 h-3.5" /> Colaboradores
          </button>
          <button
            onClick={() => { setActiveSubTab("devices"); setFeedback(""); }}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors flex items-center gap-1 ${activeSubTab === "devices" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"}`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Dispositivos
          </button>
          <button
            onClick={() => { setActiveSubTab("debug"); setFeedback(""); fetchDebugLogs(); }}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors flex items-center gap-1 ${activeSubTab === "debug" ? "bg-emerald-600 text-white font-bold shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} /> Diagnóstico API
          </button>
        </div>
      </div>

      {feedback && (
        <div className="bg-cyan-50 border border-cyan-100 text-cyan-800 p-3 rounded-lg text-xs font-mono">
          {feedback}
        </div>
      )}

      {/* 0. INVENTORIES SETUP */}
      {activeSubTab === "inventories" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Inventory Form */}
          <form onSubmit={handleSaveInventory} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3.5 text-xs md:col-span-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700 block text-xs">
                {editingInventoryId ? "Editar Configurações" : "Criar Novo Inventário"}
              </span>
              {editingInventoryId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-rose-600 hover:underline font-semibold font-mono"
                >
                  Cancelar
                </button>
              )}
            </div>
            
            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Nome do Inventário (Cliente/Identificação)</label>
              <input
                type="text"
                value={invNome}
                onChange={e => setInvNome(e.target.value)}
                required
                placeholder="Ex: TAMOIO FILIAL 134"
                className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold uppercase"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Filial (Cidade/UF ou Localização)</label>
              <input
                type="text"
                value={invFilial}
                onChange={e => setInvFilial(e.target.value)}
                required
                placeholder="Ex: MESQUITA/RJ"
                className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Data Execução</label>
                <input
                  type="date"
                  value={invData}
                  onChange={e => setInvData(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Dupla Contagem?</label>
                <div className="flex items-center h-8">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invCompara}
                      onChange={e => setInvCompara(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4 border-slate-300"
                    />
                    <span className="text-slate-700 font-medium">Habilitar</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Tipo de Contagem (Parâmetro Operacional)</label>
              <select
                value={invTipoContagem}
                onChange={e => setInvTipoContagem(e.target.value as any)}
                required
                className="w-full bg-white border border-slate-300 rounded p-1.5"
              >
                <option value="NORMAL_FECHADA_COM_MULT">Normal Fechada com Multiplicador</option>
                <option value="NORMAL_FECHADA_SEM_MULT">Normal Fechada sem Multiplicador</option>
                <option value="NORMAL_ABERTA">Normal Aberta</option>
                <option value="ENDERECO">Endereço (Somente Bipar)</option>
                <option value="LOTE_VALIDADE">Lote e Validade</option>
                <option value="INFO_EXTRA">Informações Extras (Até 4 campos)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Coleta de Pallets (Paletização)</label>
              <select
                value={invColetaPallets}
                onChange={e => setInvColetaPallets(e.target.value as any)}
                required
                className="w-full bg-white border border-slate-300 rounded p-1.5"
              >
                <option value="NAO">Não Coletar Pallets</option>
                <option value="SIMPLIFICADO">Coleta Simplificada (Pallets/Camadas/Caixas)</option>
                <option value="DETALHADO">Coleta Detalhada</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Permissão de Coleta (Filtro de Cadastro)</label>
              <select
                value={invPermissaoColeta}
                onChange={e => setInvPermissaoColeta(e.target.value as any)}
                required
                className="w-full bg-white border border-slate-300 rounded p-1.5"
              >
                <option value="SOMENTE_CARREGADOS">Somente Cadastrados no Arquivo de Produtos</option>
                <option value="CARREGADOS_CONFIRMA">Confirmar Coleta Avulsa (Se não Cadastrado)</option>
                <option value="QUALQUER_CODIGO">Qualquer Código (Sem Restrição)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              {editingInventoryId ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
              <span>{editingInventoryId ? "Salvar Alterações" : "Cadastrar e Ativar"}</span>
            </button>
          </form>

          {/* Inventories List */}
          <div className="md:col-span-2 space-y-3">
            <span className="font-bold text-slate-700 text-xs block">Inventários Disponíveis no Servidor Central ({inventories.length})</span>
            
            <div className="grid grid-cols-1 gap-3">
              {inventories.map(inv => {
                const isActive = inv.id === activeInventoryId;
                const sectorsCount = inv.sectors?.length || 0;
                const productsCount = inv.products?.length || 0;
                const addressesCount = inv.addresses?.length || 0;
                
                return (
                  <div
                    key={inv.id}
                    className={`border p-4 rounded-xl transition-all space-y-3.5 bg-white shadow-3xs ${
                      isActive 
                        ? "border-blue-500 ring-2 ring-blue-500/10 bg-blue-50/5" 
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm font-mono tracking-tight uppercase">
                            {inv.nome}
                          </span>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <span>Filial: <b>{inv.filial}</b></span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-[11px] text-slate-600 flex items-center gap-0.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" /> {inv.dataExecucao}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEditInventory(inv)}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-700 p-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold transition-colors cursor-pointer"
                          title="Editar Parâmetros"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteInventory(inv.id)}
                          className="bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg border border-slate-200 hover:border-rose-200 text-xs font-mono transition-colors cursor-pointer"
                          title="Excluir Permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Operational Parameter Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">Tipo Contagem</span>
                        <span className="font-bold text-slate-800">
                          {inv.tipoContagem === "NORMAL_FECHADA_COM_MULT" && "Fechada c/ Mult"}
                          {inv.tipoContagem === "NORMAL_FECHADA_SEM_MULT" && "Fechada s/ Mult"}
                          {inv.tipoContagem === "NORMAL_ABERTA" && "Aberta"}
                          {inv.tipoContagem === "ENDERECO" && "Endereço"}
                          {inv.tipoContagem === "LOTE_VALIDADE" && "Lote & Validade"}
                          {inv.tipoContagem === "INFO_EXTRA" && "Info Extra"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">Paletização</span>
                        <span className="font-bold text-slate-800">
                          {inv.coletaPallets === "NAO" && "Não coletar"}
                          {inv.coletaPallets === "SIMPLIFICADO" && "Simplificada"}
                          {inv.coletaPallets === "DETALHADO" && "Detalhada"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">Restrição Coleta</span>
                        <span className="font-bold text-slate-800">
                          {inv.permissaoColeta === "SOMENTE_CARREGADOS" && "Só cadastrados"}
                          {inv.permissaoColeta === "CARREGADOS_CONFIRMA" && "Alerta p/ avulsas"}
                          {inv.permissaoColeta === "QUALQUER_CODIGO" && "Sem restrições"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">Dupla Contagem</span>
                        <span className={`font-bold ${inv.compara ? "text-cyan-600" : "text-slate-400"}`}>
                          {inv.compara ? "Ativo (Confronto)" : "Inativo"}
                        </span>
                      </div>
                    </div>

                    {/* Data Counts Footer */}
                    <div className="flex items-center justify-between text-[11px] font-mono border-t border-slate-100 pt-2.5">
                      <div className="flex items-center gap-3 text-slate-500">
                        <span>Setores: <b className="text-slate-800 font-bold">{sectorsCount}</b></span>
                        <span>Produtos: <b className="text-slate-800 font-bold">{productsCount}</b></span>
                        <span>Endereços: <b className="text-slate-800 font-bold">{addressesCount}</b></span>
                      </div>

                      {isActive ? (
                        <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> ATIVO AGORA
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveInventoryId(inv.id);
                            setFeedback(`Inventário "${inv.nome}" selecionado como ativo com sucesso!`);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1 rounded-lg text-[10px] cursor-pointer transition-colors"
                        >
                          Definir como Ativo
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 1. COMPANIES SETUP */}
      {activeSubTab === "companies" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Company Form */}
          <form onSubmit={handleAddCompany} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 text-xs md:col-span-1">
            <span className="font-bold text-slate-700 block">Cadastrar Empresa</span>
            
            <div>
              <label className="block text-slate-600 mb-1">Nome Fantasia</label>
              <input type="text" value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)} required placeholder="Ex: INVECO" className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold uppercase" />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Razão Social</label>
              <input type="text" value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} required placeholder="Ex: Inveco Logística Ltda" className="w-full bg-white border border-slate-300 rounded p-1.5" />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">CNPJ</label>
              <input type="text" value={cnpj} onChange={e => setCnpj(e.target.value)} required placeholder="12.345.678/0001-00" className="w-full bg-white border border-slate-300 rounded p-1.5 font-mono" />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Parcerias / Vínculos de Clientes</label>
              <div className="space-y-1 bg-white p-2 rounded border border-slate-300 max-h-24 overflow-y-auto">
                {companies.map(c => (
                  <label key={c.id} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={selectedPartnerIds.includes(c.id)} onChange={() => togglePartner(c.id)} className="rounded" />
                    <span>{c.nomeFantasia}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded text-xs flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" /> Cadastrar Empresa
            </button>
          </form>

          {/* Company List */}
          <div className="md:col-span-2 space-y-2">
            <span className="font-bold text-slate-700 text-xs block">Empresas Cadastradas no Ecossistema Invexa</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {companies.map(c => (
                <div key={c.id} className="bg-white border border-slate-200 p-3 rounded-lg shadow-2xs space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900 font-mono text-xs">{c.nomeFantasia}</span>
                    <span className="bg-slate-100 text-slate-600 text-[9px] px-1.5 py-0.5 rounded font-mono">CNPJ: {c.cnpj}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{c.razaoSocial}</p>
                  
                  {c.parcerias.length > 0 && (
                    <div className="pt-2 flex items-center gap-1 text-[10px] text-slate-400">
                      <Link className="w-3 h-3 text-cyan-600" />
                      <span>Parcerias: {c.parcerias.map(pid => companies.find(comp => comp.id === pid)?.nomeFantasia).join(", ")}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. OPERATORS SETUP */}
      {activeSubTab === "operators" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Operator Form */}
          <form onSubmit={handleAddOperator} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 text-xs md:col-span-1">
            <span className="font-bold text-slate-700 block">Cadastrar Colaborador Coletor</span>
            
            <div>
              <label className="block text-slate-600 mb-1">Nome Completo</label>
              <input type="text" value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} required placeholder="Ex: INGRID SANTOS" className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold uppercase" />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">CPF (Identificação para Login)</label>
              <input type="text" value={cpf} onChange={e => setCpf(e.target.value)} required placeholder="111.111.111-11" className="w-full bg-white border border-slate-300 rounded p-1.5 font-mono" />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Data de Nascimento</label>
              <input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} className="w-full bg-white border border-slate-300 rounded p-1.5 font-mono" />
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Empresa Vinculada</label>
              <select value={operatorCompanyId} onChange={e => setOperatorCompanyId(e.target.value)} required className="w-full bg-white border border-slate-300 rounded p-1.5">
                <option value="">Selecione...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.nomeFantasia}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Nível de Hierarquia</label>
              <select value={operatorHierarquia} onChange={e => setOperatorHierarquia(e.target.value as Operator["hierarquia"])} required className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold">
                <option value="Inventariante">Inventariante</option>
                <option value="Coordenação">Coordenação</option>
                <option value="Supervisão">Supervisão</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <p className="text-[10px] text-cyan-700 italic">
              *A senha de acesso no terminal móvel corresponderá automaticamente aos 6 últimos dígitos do CPF cadastrado.
            </p>

            <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded text-xs flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" /> Cadastrar Operador
            </button>
          </form>

          {/* Operator List */}
          <div className="md:col-span-2 space-y-2">
            <span className="font-bold text-slate-700 text-xs block">Colaboradores Cadastrados ({operators.length})</span>
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold font-mono">
                  <tr>
                    <th className="p-2.5">Nome Completo</th>
                    <th className="p-2.5">CPF</th>
                    <th className="p-2.5">Data Nasc.</th>
                    <th className="p-2.5">Nível</th>
                    <th className="p-2.5">Empresa</th>
                    <th className="p-2.5 text-center">Senha Coletor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                  {operators.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans font-bold text-slate-900">{o.nomeCompleto}</td>
                      <td className="p-2.5">{o.cpf}</td>
                      <td className="p-2.5">{o.dataNascimento || "Não informado"}</td>
                      <td className="p-2.5 font-sans font-semibold text-slate-700">
                        {o.hierarquia || "Inventariante"}
                      </td>
                      <td className="p-2.5 font-sans font-medium text-slate-600">
                        {companies.find(c => c.id === o.companyId)?.nomeFantasia || "Geral"}
                      </td>
                      <td className="p-2.5 text-center text-cyan-600 font-bold bg-cyan-50/40">{o.senhaPreenchedores}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. DEVICES SETUP */}
      {activeSubTab === "devices" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Device Form */}
          <form onSubmit={handleAddDevice} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 text-xs md:col-span-1">
            <span className="font-bold text-slate-700 block">Autorizar Terminal Coletor</span>
            
            <div>
              <label className="block text-slate-600 mb-1">Nome Fantasia do Dispositivo</label>
              <input type="text" value={deviceName} onChange={e => setDeviceName(e.target.value)} required placeholder="Ex: PPBRASIL-003" className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold uppercase font-mono" />
              <span className="text-[9px] text-slate-400 block mt-1">Exemplo: Nome da empresa seguido de número sequencial (Page 28).</span>
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Empresa Credenciada</label>
              <select value={deviceCompanyId} onChange={e => setDeviceCompanyId(e.target.value)} required className="w-full bg-white border border-slate-300 rounded p-1.5">
                <option value="">Selecione...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.nomeFantasia}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded text-xs flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" /> Cadastrar Terminal
            </button>
          </form>

          {/* Device List */}
          <div className="md:col-span-2 space-y-2">
            <span className="font-bold text-slate-700 text-xs block">Terminais Coletores Autorizados ({devices.length})</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {devices.map(d => (
                <div key={d.id} className="bg-white border border-slate-200 p-3 rounded-lg shadow-2xs flex items-center gap-3">
                  <div className="bg-slate-100 p-2.5 rounded-lg text-slate-600">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 text-xs font-mono">{d.nomeFantasia}</span>
                    <p className="text-[10px] text-slate-400 font-mono">ID Único: {d.id}</p>
                    <p className="text-[10px] text-slate-500 font-sans">
                      Empresa: <b>{companies.find(c => c.id === d.companyId)?.nomeFantasia || "Geral"}</b>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. DIAGNÓSTICO E INTEGRAÇÃO ANDROID */}
      {activeSubTab === "debug" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    API Online
                  </span>
                  <h3 className="font-extrabold text-base">Integração com Coletor Android Nativo</h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Todos os endpoints REST estão ativos, com suporte a CORS universal, headers flexíveis e gravação instantânea.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendTestTransmission}
                  disabled={sendingTest}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Play className={`w-3.5 h-3.5 ${sendingTest ? "animate-spin" : ""}`} />
                  {sendingTest ? "Enviando..." : "Simular Coleta Android (Teste)"}
                </button>
                <button
                  onClick={fetchDebugLogs}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
                  Atualizar Logs
                </button>
              </div>
            </div>

            {/* Test Result Message */}
            {testResult && (
              <div className="bg-emerald-950/80 border border-emerald-600/60 p-3 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{testResult}</span>
              </div>
            )}

            {/* Base URL Box */}
            <div className="bg-black/60 border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div className="text-xs font-mono">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">URL Base para Configurar no Android:</span>
                <span className="text-emerald-400 font-bold select-all break-all">{window.location.origin}</span>
              </div>
              <button
                onClick={() => copyToClipboard(window.location.origin, "baseUrl")}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-mono transition-colors self-start sm:self-auto cursor-pointer"
              >
                {copiedField === "baseUrl" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedField === "baseUrl" ? "Copiado!" : "Copiar URL"}
              </button>
            </div>
          </div>

          {/* Endpoints Cheat Sheet */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Code className="w-4 h-4 text-cyan-600" /> Endpoints Disponíveis para o App Android (Retrofit / OkHttp)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="bg-emerald-100 text-emerald-800 font-black text-[10px] px-2 py-0.5 rounded">GET</span>
                  <span className="font-mono font-bold text-slate-800">/api/ping</span>
                </div>
                <p className="text-slate-500 text-[11px]">Teste de conectividade / status do servidor online.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="bg-emerald-100 text-emerald-800 font-black text-[10px] px-2 py-0.5 rounded">GET</span>
                  <span className="font-mono font-bold text-slate-800">/api/collector/init</span>
                </div>
                <p className="text-slate-500 text-[11px]">Inicialização rápida: inventário ativo, contagens, operadores e dispositivos.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="bg-emerald-100 text-emerald-800 font-black text-[10px] px-2 py-0.5 rounded">GET</span>
                  <span className="font-mono font-bold text-slate-800">/api/products</span>
                </div>
                <p className="text-slate-500 text-[11px]">Download de produtos ou busca rápida por <code className="text-cyan-700 font-mono">?ean=...</code> ou <code className="text-cyan-700 font-mono">?sap=...</code></p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="bg-emerald-100 text-emerald-800 font-black text-[10px] px-2 py-0.5 rounded">GET</span>
                  <span className="font-mono font-bold text-slate-800">/api/addresses</span>
                </div>
                <p className="text-slate-500 text-[11px]">Download de endereços ou validação pontual com <code className="text-cyan-700 font-mono">?code=...</code></p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="bg-emerald-100 text-emerald-800 font-black text-[10px] px-2 py-0.5 rounded">GET</span>
                  <span className="font-mono font-bold text-slate-800">/api/operators</span>
                </div>
                <p className="text-slate-500 text-[11px]">Lista completa de operadores cadastrados (pode filtrar por <code className="text-cyan-700 font-mono">?cpf=...</code> ou <code className="text-cyan-700 font-mono">?id=...</code>).</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="bg-amber-600 text-white font-black text-[10px] px-2 py-0.5 rounded">POST</span>
                  <span className="font-mono font-bold text-amber-950">/api/operators/login</span>
                </div>
                <p className="text-amber-900 text-[11px]">Autentica operador e senha (envie <code className="text-amber-800 font-mono">matricula</code> e <code className="text-amber-800 font-mono">senha</code>).</p>
              </div>

              <div className="bg-slate-50 border border-cyan-300 bg-cyan-50/50 p-3 rounded-xl space-y-1 md:col-span-2">
                <div className="flex justify-between items-center">
                  <span className="bg-cyan-600 text-white font-black text-[10px] px-2 py-0.5 rounded">POST</span>
                  <span className="font-mono font-bold text-cyan-950">/api/collect</span>
                </div>
                <p className="text-cyan-900 text-[11px]">Transmissão de leituras coletadas da seção (Responde HTTP 200 OK).</p>
              </div>
            </div>
          </div>

          {/* Transmissions Monitor */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-600" /> Histórico de Transmissões Recebidas em Tempo Real
              </h4>
              <span className="text-xs text-slate-400 font-mono">{debugLogs.length} pacotes registrados</span>
            </div>

            {debugLogs.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
                Nenhuma transmissão registrada nesta sessão.
                <p className="mt-1 text-slate-400">Clique em <b>"Simular Coleta Android"</b> acima ou envie leituras do seu dispositivo para visualizá-las aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {debugLogs.map((log) => (
                  <div key={log.id} className="bg-slate-950 text-slate-100 border border-slate-800 rounded-xl p-4 text-xs font-mono space-y-2 shadow-md">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="font-bold text-emerald-400">
                        [{log.method}] {log.path}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        {new Date(log.timestamp).toLocaleString("pt-BR")}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-slate-900/60 p-2 rounded border border-slate-800/80">
                      <div>Inventário: <b className="text-amber-300">{log.inventoryId || "N/A"}</b></div>
                      <div>Seção: <b className="text-cyan-300">{log.sectionCode || "N/A"}</b></div>
                      <div>Itens Lidos: <b className="text-emerald-300">{log.itemsCount ?? "N/A"}</b></div>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block mb-1">PAYLOAD JSON RECEBIDO:</span>
                      <pre className="bg-black/80 p-3 rounded text-[11px] text-emerald-300 overflow-x-auto max-h-48 scrollbar-thin">
                        {JSON.stringify(log.body, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {confirmDeleteInvId && (
        <div className="fixed inset-0 bg-slate-950/65 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden text-xs animate-scale-up">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <span className="font-extrabold font-mono uppercase tracking-wider text-sm">Excluir Inventário</span>
            </div>
            <div className="p-5">
              <p className="text-slate-600 text-sm">Atenção: Deseja REALMENTE excluir este inventário? Esta ação é irreversível e apagará todas as tabelas de dados, bipes e configurações!</p>
            </div>
            <div className="flex justify-end gap-2.5 p-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setConfirmDeleteInvId(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                CANCELAR
              </button>
              <button
                onClick={() => executeDeleteInventory(confirmDeleteInvId)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                EXCLUIR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
