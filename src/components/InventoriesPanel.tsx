import React, { useState } from "react";
import { Inventory, Company, Operator } from "../types";
import { Plus, Trash2, Calendar, Sliders, Check, Copy, Home, Filter, Edit3, AlertTriangle, Users, Info, Settings, ToggleLeft, FolderOpen, FileSpreadsheet, MoreVertical, Download, ChevronDown, Link as LinkIcon, Smartphone, ShieldCheck, QrCode, ExternalLink, Barcode, UserCheck, Search, X } from "lucide-react";
import ExportResultModal from "./ExportResultModal";
import InventoryProductsModal from "./InventoryProductsModal";


interface Props {
  inventories: Inventory[];
  companies?: Company[];
  operators?: Operator[];
  activeInventoryId: string;
  setActiveInventoryId: (id: string) => void;
  onSync: () => void;
  setActiveTab?: (tab: "inventories" | "dashboard" | "imports" | "reports" | "settings" | "simulator" | "restore") => void;
  editInventoryId?: string | null;
  clearEditInventoryId?: () => void;
}

export default function InventoriesPanel({ 
  inventories, 
  companies = [],
  operators = [],
  activeInventoryId, 
  setActiveInventoryId, 
  onSync, 
  setActiveTab,
  editInventoryId,
  clearEditInventoryId
}: Props) {
  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);

  // Modal State for Create Operator
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [opNomeCompleto, setOpNomeCompleto] = useState("");
  const [opCpf, setOpCpf] = useState("");
  const [opDataNascimento, setOpDataNascimento] = useState("");
  const [opCompanyId, setOpCompanyId] = useState(companies[0]?.id || "");
  const [opHierarquia, setOpHierarquia] = useState<Operator["hierarquia"]>("Inventariante");
  const [isSavingOperator, setIsSavingOperator] = useState(false);

  // Modal State for Export Result
  const [selectedExportInventory, setSelectedExportInventory] = useState<Inventory | null>(null);
  const [selectedProductsInventory, setSelectedProductsInventory] = useState<Inventory | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Form States
  const [invNome, setInvNome] = useState("");
  const [invFilial, setInvFilial] = useState("");
  const [invData, setInvData] = useState(new Date().toISOString().split("T")[0]);
  const [invTipoContagem, setInvTipoContagem] = useState<Inventory["tipoContagem"]>("NORMAL_FECHADA_COM_MULT");
  const [invColetaPallets, setInvColetaPallets] = useState<Inventory["coletaPallets"]>("SIMPLIFICADO");
  const [invPermissaoColeta, setInvPermissaoColeta] = useState<Inventory["permissaoColeta"]>("SOMENTE_CARREGADOS");
  const [invCompara, setInvCompara] = useState(true);
  const [invComparaViaLink, setInvComparaViaLink] = useState(false);
  const [invStatus, setInvStatus] = useState<Inventory["status"]>("PLANEJADO");

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);

  // Filter / Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showFilters, setShowFilters] = useState(false);

  // Notifications
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function triggerFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  }

  React.useEffect(() => {
    if (editInventoryId) {
      const invToEdit = inventories.find(i => i.id === editInventoryId);
      if (invToEdit) {
        handleStartEdit(invToEdit);
      }
      if (clearEditInventoryId) {
        clearEditInventoryId();
      }
    }
  }, [editInventoryId, inventories, clearEditInventoryId]);

  // Handle Create or Update
  async function handleSaveInventory(e: React.FormEvent) {
    e.preventDefault();
    if (!invNome.trim() || !invFilial.trim()) {
      triggerFeedback("error", "Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const payload: Partial<Inventory> = {
      id: editingInventoryId || undefined,
      nome: invNome.toUpperCase(),
      filial: invFilial.toUpperCase(),
      dataExecucao: invData,
      tipoContagem: invTipoContagem,
      coletaPallets: invColetaPallets,
      permissaoColeta: invPermissaoColeta,
      compara: invCompara,
      comparaViaLink: invComparaViaLink,
      // Map form status to what backend expects or stores
      status: invStatus
    };

    try {
      const res = await fetch("/api/inventories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        triggerFeedback(
          "success",
          editingInventoryId 
            ? "Inventário atualizado com sucesso!" 
            : "Novo inventário cadastrado com sucesso!"
        );
        handleCloseModal();
        onSync();
        
        // Auto-activate newly created inventory
        if (!editingInventoryId && data.inventory?.id) {
          setActiveInventoryId(data.inventory.id);
        }
      } else {
        const errJson = await res.json().catch(() => null);
        triggerFeedback("error", errJson?.error ? `Erro: ${errJson.error}` : "Erro ao salvar o inventário no servidor.");
      }
    } catch (err: any) {
      triggerFeedback("error", err?.message ? `Falha: ${err.message}` : "Falha de comunicação com o servidor.");
    }
  }

  // Handle duplicate inventory
  function handleDuplicateInventory(inv: Inventory) {
    setConfirmDialog({
      title: "Duplicar Inventário",
      message: `Deseja duplicar o inventário "${inv.nome}"? Uma cópia com os mesmos parâmetros operacionais será criada.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        const payload: Partial<Inventory> = {
          nome: `${inv.nome} (CÓPIA)`,
          filial: inv.filial,
          dataExecucao: inv.dataExecucao,
          tipoContagem: inv.tipoContagem,
          coletaPallets: inv.coletaPallets,
          permissaoColeta: inv.permissaoColeta,
          compara: inv.compara,
          comparaViaLink: inv.comparaViaLink,
          status: "PLANEJADO",
          sectors: [], // start clean
          products: inv.products || [], // copy products catalog if available
          addresses: inv.addresses || [] // copy addresses catalog if available
        };

        try {
          const res = await fetch("/api/inventories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const data = await res.json();
            triggerFeedback("success", "Inventário duplicado com sucesso!");
            onSync();
            if (data.inventory?.id) {
              setActiveInventoryId(data.inventory.id);
            }
          } else {
            triggerFeedback("error", "Falha ao duplicar inventário.");
          }
        } catch (err) {
          triggerFeedback("error", "Erro de rede ao duplicar.");
        }
      }
    });
  }

  // Handle delete
  function handleDeleteInventory(id: string, name: string) {
    setConfirmDialog({
      title: "Excluir Inventário",
      message: `Atenção: Deseja REALMENTE excluir permanentemente o inventário "${name}"?\nEsta ação apagará todas as coletas, bipes, seções e configurações associadas!`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`/api/inventories/${id}`, {
            method: "DELETE"
          });
          if (res.ok) {
            triggerFeedback("success", "Inventário removido com sucesso do servidor.");
            if (activeInventoryId === id) {
              const remaining = inventories.filter(i => i.id !== id);
              if (remaining.length > 0) {
                setActiveInventoryId(remaining[0].id);
              }
            }
            onSync();
          } else {
            triggerFeedback("error", "Não foi possível remover o inventário.");
          }
        } catch (err) {
          triggerFeedback("error", "Erro ao conectar com o servidor.");
        }
      }
    });
  }


  async function handleExportBackup(inv: Inventory) {
    setActiveDropdownId(null);
    try {
      triggerFeedback("success", "Gerando backup, aguarde...");
      const res = await fetch(`/api/inventories/${inv.id}/backup`);
      if (!res.ok) throw new Error("Falha ao gerar backup");
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BACKUP_${inv.nome.replace(/\s+/g, '_').toUpperCase()}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      triggerFeedback("success", "Backup baixado com sucesso!");
    } catch (err: any) {
      triggerFeedback("error", "Erro ao exportar backup.");
    }
  }

  function handleStartCreate() {

    setEditingInventoryId(null);
    setInvNome("");
    setInvFilial("");
    setInvData(new Date().toISOString().split("T")[0]);
    setInvTipoContagem("NORMAL_FECHADA_COM_MULT");
    setInvColetaPallets("SIMPLIFICADO");
    setInvPermissaoColeta("SOMENTE_CARREGADOS");
    setInvCompara(true);
    setInvComparaViaLink(false);
    setInvStatus("PLANEJADO");
    setIsModalOpen(true);
  }

  function handleStartEdit(inv: Inventory) {
    setEditingInventoryId(inv.id);
    setInvNome(inv.nome || "");
    setInvFilial(inv.filial || "");
    setInvData(inv.dataExecucao || "");
    setInvTipoContagem(inv.tipoContagem || "NORMAL_FECHADA_COM_MULT");
    setInvColetaPallets(inv.coletaPallets || "SIMPLIFICADO");
    setInvPermissaoColeta(inv.permissaoColeta || "SOMENTE_CARREGADOS");
    setInvCompara(inv.compara ?? true);
    setInvComparaViaLink(!!inv.comparaViaLink);
    // Support display status mapping
    setInvStatus(inv.status || "PLANEJADO");
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingInventoryId(null);
  }

  function handleStartCreateOperator() {
    setOpNomeCompleto("");
    setOpCpf("");
    setOpDataNascimento("");
    setOpCompanyId(companies[0]?.id || "");
    setOpHierarquia("Inventariante");
    setIsOperatorModalOpen(true);
  }

  function handleCloseOperatorModal() {
    setIsOperatorModalOpen(false);
  }

  async function handleSaveOperator(e: React.FormEvent) {
    e.preventDefault();
    if (!opNomeCompleto.trim()) {
      triggerFeedback("error", "Por favor, digite o Nome Completo do colaborador.");
      return;
    }
    if (!opCpf.trim()) {
      triggerFeedback("error", "Por favor, informe o CPF do colaborador.");
      return;
    }
    if (!opCompanyId && companies.length > 0) {
      triggerFeedback("error", "Por favor, selecione a Empresa Vinculada.");
      return;
    }

    const cleanCpf = opCpf.replace(/\D/g, "");
    const senhaPreenchedores = cleanCpf.length >= 6 ? cleanCpf.slice(-6) : cleanCpf || "123456";

    const payload = {
      nomeCompleto: opNomeCompleto.toUpperCase().trim(),
      cpf: opCpf.trim(),
      dataNascimento: opDataNascimento || "",
      senhaPreenchedores,
      companyId: opCompanyId || (companies[0]?.id || "emp_default"),
      hierarquia: opHierarquia
    };

    setIsSavingOperator(true);
    try {
      const res = await fetch("/api/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        triggerFeedback("success", `Colaborador cadastrado com sucesso! Senha do coletor gerada: ${senhaPreenchedores}`);
        handleCloseOperatorModal();
        onSync();
      } else {
        const errJson = await res.json().catch(() => null);
        triggerFeedback("error", errJson?.error ? `Erro: ${errJson.error}` : "Erro ao cadastrar operador no servidor.");
      }
    } catch (err: any) {
      triggerFeedback("error", `Erro de comunicação: ${err.message || String(err)}`);
    } finally {
      setIsSavingOperator(false);
    }
  }

  // Filter inventories
  const filteredInventories = inventories.filter(inv => {
    const matchesSearch = 
      inv.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.filial.toLowerCase().includes(searchQuery.toLowerCase());
    
    let displayStatus = "EM PLANEJAMENTO";
    if (inv.status === "FINALIZADO") {
      displayStatus = "FINALIZADO";
    } else if (inv.status === "EM_ANDAMENTO") {
      displayStatus = "EM ANDAMENTO";
    } else if (inv.status === "PLANEJADO") {
      displayStatus = "EM PLANEJAMENTO";
    }

    const matchesStatus = statusFilter === "ALL" || displayStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Simple date formatter (YYYY-MM-DD -> DD/MM/YYYY)
  function formatDate(dateStr: string) {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  return (
    <div className="w-full font-sans antialiased text-slate-800 bg-white min-h-screen">
      
      {/* HEADER SECTION - SEARCH BAR AND ACTIONS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
        {/* Pesquisar Inventários */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pesquisar inventários ou filial..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-md pl-9 pr-8 py-2 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleStartCreate}
            className="bg-[#030718] hover:bg-[#0b1437] text-white font-bold px-4 py-2 rounded-md text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer border border-[#1e293b]"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>CRIAR INVENTÁRIO</span>
          </button>
          <button
            onClick={handleStartCreateOperator}
            className="bg-[#030718] hover:bg-[#0b1437] text-white font-bold px-4 py-2 rounded-md text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer border border-[#1e293b]"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>CRIAR OPERADOR</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK STATUS BAR */}
      {feedback && (
        <div className={`mx-6 mb-4 p-3.5 rounded-lg text-xs font-semibold border flex items-center gap-2 animate-fade-in ${
          feedback.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <Info className="w-4 h-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* THE TABULAR LIST */}
      <div className="w-full px-6 pb-28">
        <div className="border border-slate-200 rounded-xl shadow-2xs bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/80 text-xs font-semibold text-slate-700 tracking-wide rounded-t-xl">
                <th className="py-3.5 px-4 w-[28%]">Nome</th>
                <th className="py-3.5 px-3 w-[14%]">Filial</th>
                <th className="py-3.5 px-3 text-center w-[14%]">Data de execução</th>
                <th className="py-3.5 px-3 text-center w-[16%]">Editado em</th>
                <th className="py-3.5 px-3 text-center w-[14%]">Status</th>
                <th className="py-3.5 px-4 text-center w-[14%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/75 text-xs text-slate-600">
            {filteredInventories.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                  {searchQuery ? (
                    <div className="space-y-1">
                      <p>Nenhum inventário encontrado para "{searchQuery}".</p>
                      <button 
                        onClick={() => setSearchQuery("")} 
                        className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        Limpar pesquisa
                      </button>
                    </div>
                  ) : (
                    "Nenhum inventário localizado."
                  )}
                </td>
              </tr>
            ) : (
              filteredInventories.map((inv, index) => {
                let displayStatus = "EM PLANEJAMENTO";
                let statusBg = "bg-slate-500";
                
                if (inv.status === "FINALIZADO") {
                  displayStatus = "FINALIZADO";
                  statusBg = "bg-[#eb4a4a]"; // Redish
                } else if (inv.status === "EM_ANDAMENTO") {
                  displayStatus = "EM ANDAMENTO";
                  statusBg = "bg-[#71b631]"; // Greenish
                } else if (inv.status === "PLANEJADO") {
                  displayStatus = "EM PLANEJAMENTO";
                  statusBg = "bg-amber-500";
                }

                const isEven = index % 2 === 0;
                const isDropdownOpen = activeDropdownId === inv.id;
                const openUpward = index >= filteredInventories.length - 2 && filteredInventories.length >= 3;
                return (
                  <tr 
                    key={inv.id} 
                    className={`transition-colors ${isEven ? "bg-white" : "bg-[#f8fafc]"} ${isDropdownOpen ? "relative z-30" : "relative z-auto"} hover:bg-sky-50/60`}
                  >
                    {/* NOME */}
                    <td className="py-3.5 px-4">
                      <span className="uppercase text-slate-800 font-semibold tracking-tight">
                        {inv.nome}
                      </span>
                    </td>

                    {/* FILIAL */}
                    <td className="py-3.5 px-3">
                      <span className="uppercase text-slate-600 font-medium">
                        {inv.filial || "-"}
                      </span>
                    </td>

                    {/* DATA DE EXECUÇÃO */}
                    <td className="py-3.5 px-3 text-center">
                      {formatDate(inv.dataExecucao)}
                    </td>

                    {/* EDITADO EM */}
                    <td className="py-3.5 px-3 text-center">
                      {inv.dataEdicao ? (() => {
                        const dateObj = new Date(inv.dataEdicao);
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const year = dateObj.getFullYear();
                        const hours = String(dateObj.getHours()).padStart(2, '0');
                        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                        return `${day}/${month}/${year} ${hours}:${minutes}`;
                      })() : (inv.dataExecucao ? `${formatDate(inv.dataExecucao)} 10:15` : "-")}
                    </td>

                    {/* STATUS */}
                    <td className="py-3.5 px-3">
                      <div className="flex justify-center">
                        <span className={`${statusBg} text-white font-bold text-[10px] w-32 py-1.5 rounded-md tracking-wider text-center inline-block`}>
                          {displayStatus}
                        </span>
                      </div>
                    </td>

                    {/* OPÇÕES */}
                    <td className="py-3.5 px-4 relative">
                      <div className="flex justify-center items-center gap-2">
                        {/* BOTÃO DROPDOWN OPÇÕES */}
                        <div className="relative">
                          <button
                            onClick={() => setActiveDropdownId(activeDropdownId === inv.id ? null : inv.id)}
                            className="flex items-center gap-1 text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 px-2.5 py-1 rounded text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                            title="Opções do Inventário"
                          >
                            <span>OPÇÕES</span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          </button>

                          {/* DROPDOWN MENU */}
                          {activeDropdownId === inv.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-40 cursor-default" 
                                onClick={() => setActiveDropdownId(null)}
                              />
                              <div className={`absolute right-0 ${openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"} w-52 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-scale-up text-left`}>
                                <button
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setSelectedProductsInventory(inv);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Barcode className="w-4 h-4 text-sky-600" />
                                  <span>Produtos (CSV / TXT)</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setSelectedExportInventory(inv);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                  <span>Gerar Resultado</span>
                                </button>

                                <div className="border-t border-slate-100 my-1"></div>


                                <button
                                  onClick={() => handleExportBackup(inv)}
                                  className="w-full px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Download className="w-4 h-4 text-indigo-600" />
                                  <span>Exportar Backup</span>
                                </button>
                                
                                <div className="border-t border-slate-100 my-1"></div>

                                <button
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleStartEdit(inv);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Sliders className="w-4 h-4 text-slate-500" />
                                  <span>Alterar Parâmetros</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleDuplicateInventory(inv);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Copy className="w-4 h-4 text-slate-500" />
                                  <span>Duplicar Inventário</span>
                                </button>

                                <div className="border-t border-slate-100 my-1"></div>

                                <button
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleDeleteInventory(inv.id, inv.nome);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-500" />
                                  <span>Excluir Inventário</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setActiveInventoryId(inv.id);
                            if (setActiveTab) {
                              setActiveTab("dashboard");
                            }
                          }}
                          className="flex items-center gap-1.5 text-[#00a8e8] hover:text-[#0096d2] border border-[#00a8e8] hover:border-[#0096d2] px-3 py-1 rounded text-[10px] font-bold bg-white hover:bg-sky-50/50 transition-colors cursor-pointer"
                        >
                          GERENCIAR
                          <FolderOpen className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL DIALOG POPUP FOR CREATING / EDITING PROPERTIES */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/65 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-xs space-y-0 animate-scale-up">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4.5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#00a2e8]" />
                <span className="font-extrabold font-mono uppercase tracking-wider text-sm">
                  {editingInventoryId ? "Alterar Parâmetros" : "Novo Inventário"}
                </span>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white font-mono font-bold text-base bg-slate-800 hover:bg-slate-700 px-2.5 py-0.5 rounded transition-colors"
              >
                ×
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveInventory} className="p-6 space-y-4">
              
              <div className="space-y-3.5">
                
                {/* Identification */}
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Nome do Inventário (Cliente / Razão Social)</label>
                  <input
                    type="text"
                    value={invNome}
                    onChange={e => setInvNome(e.target.value)}
                    required
                    placeholder="Ex: TMO 193 - SÃO GONÇALO"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 font-bold uppercase transition-all"
                  />
                </div>

                {/* Filial */}
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Filial / Localização</label>
                  <input
                    type="text"
                    value={invFilial}
                    onChange={e => setInvFilial(e.target.value)}
                    required
                    placeholder="Ex: SÃO GONÇALO/RJ"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 font-bold uppercase transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {/* Execution date */}
                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">Data Execução</label>
                    <input
                      type="date"
                      value={invData}
                      onChange={e => setInvData(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 font-mono transition-all"
                    />
                  </div>

                  {/* Status selection for display */}
                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">Status do Planejamento</label>
                    <select
                      value={invStatus}
                      onChange={e => setInvStatus(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 font-bold transition-all"
                    >
                      <option value="PLANEJADO">EM PLANEJAMENTO</option>
                      <option value="EM_ANDAMENTO">EM ANDAMENTO</option>
                      <option value="FINALIZADO">FINALIZADO</option>
                    </select>
                  </div>
                </div>

                {/* Parameter sliders / checkboxes */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <span className="font-bold text-slate-700 block border-b border-slate-200 pb-1.5 uppercase text-[10px] tracking-wider">
                    Configuração Operacional
                  </span>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-bold">Dupla Contagem / Confronto:</span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invCompara}
                        onChange={e => setInvCompara(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300"
                      />
                      <span className="text-slate-700 font-bold">Habilitar Comparação</span>
                    </label>
                  </div>

                  {/* Compara via Link (Auditoria Sombra pelos clientes) */}
                  <div className="border-t border-slate-200/80 pt-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-slate-800 font-bold block flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-amber-500" />
                          <span>Compara via Link</span>
                        </span>
                        <span className="text-[10.5px] text-slate-500 font-medium">
                          Auditoria sombra manual via link no celular pelos funcionários dos clientes
                        </span>
                      </div>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={invComparaViaLink}
                          onChange={e => setInvComparaViaLink(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 border-slate-300"
                        />
                        <span className="text-amber-800 font-bold text-xs">Ativar Link</span>
                      </label>
                    </div>

                    {/* Permanent link box ready to copy */}
                    {invComparaViaLink && (
                      <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                            <LinkIcon className="w-3.5 h-3.5 text-amber-600" />
                            Link Permanente de Recontagem:
                          </span>
                          <span className="text-[10px] bg-amber-200/80 text-amber-900 font-mono px-1.5 py-0.5 rounded font-bold">
                            Pronto para celular
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            readOnly
                            value={typeof window !== "undefined" ? `${window.location.origin}/?sombra=${editingInventoryId || activeInventoryId || "inv_demo"}` : ""}
                            className="flex-1 bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-700 select-all outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const url = `${window.location.origin}/?sombra=${editingInventoryId || activeInventoryId || "inv_demo"}`;
                              navigator.clipboard.writeText(url);
                              triggerFeedback("success", "Link copiado com sucesso! Abra no celular.");
                            }}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Link</span>
                          </button>
                        </div>

                        <p className="text-[10.5px] text-amber-800 leading-snug">
                          📱 <strong>Como funciona:</strong> Ao abrir este link, o funcionário do cliente informa a quantidade física recontada na seção. Se a quantidade for idêntica, a seção fica <strong className="text-amber-900">AMARELA (Compara OK)</strong>. Se for diferente, fica <strong className="text-rose-700">VERMELHA</strong>.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1 font-medium">Método de Bipar / Contagem</label>
                    <select
                      value={invTipoContagem}
                      onChange={e => setInvTipoContagem(e.target.value as any)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium"
                    >
                      <option value="NORMAL_FECHADA_COM_MULT">Normal Fechada com Multiplicador</option>
                      <option value="NORMAL_FECHADA_SEM_MULT">Normal Fechada sem Multiplicador</option>
                      <option value="NORMAL_ABERTA">Normal Aberta</option>
                      <option value="ENDERECO">Endereço (Somente Bipar)</option>
                      <option value="LOTE_VALIDADE">Lote e Validade</option>
                      <option value="INFO_EXTRA">Informações Extras (Campos Dinâmicos)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1 font-medium">Controle de Paletes</label>
                    <select
                      value={invColetaPallets}
                      onChange={e => setInvColetaPallets(e.target.value as any)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium"
                    >
                      <option value="NAO">Não Coletar Pallets</option>
                      <option value="SIMPLIFICADO">Coleta Simplificada (Camadas/Caixas/Pallets)</option>
                      <option value="DETALHADO">Coleta Detalhada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1 font-medium">Restrição de Cadastro de EAN</label>
                    <select
                      value={invPermissaoColeta}
                      onChange={e => setInvPermissaoColeta(e.target.value as any)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium"
                    >
                      <option value="SOMENTE_CARREGADOS">Somente produtos previamente cadastrados</option>
                      <option value="CARREGADOS_CONFIRMA">Permitir avulsos mediante confirmação</option>
                      <option value="QUALQUER_CODIGO">Qualquer código (sem restrição de catálogo)</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 font-mono text-xs pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                  <span>SALVAR INVENTÁRIO</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-950/65 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden text-xs animate-scale-up">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <span className="font-extrabold font-mono uppercase tracking-wider text-sm">{confirmDialog.title}</span>
            </div>
            <div className="p-5">
              <p className="text-slate-600 text-sm">{confirmDialog.message}</p>
            </div>
            <div className="flex justify-end gap-2.5 p-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setConfirmDialog(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                CANCELAR
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR NOVO OPERADOR */}
      {isOperatorModalOpen && (
        <div className="fixed inset-0 bg-slate-950/65 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-xs space-y-0 animate-scale-up">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4.5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00a2e8]" />
                <span className="font-extrabold font-mono uppercase tracking-wider text-sm">
                  Cadastrar Novo Operador
                </span>
              </div>
              <button 
                onClick={handleCloseOperatorModal}
                className="text-slate-400 hover:text-white font-mono font-bold text-base bg-slate-800 hover:bg-slate-700 px-2.5 py-0.5 rounded transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveOperator} className="p-6 space-y-4">
              <div className="space-y-3.5">
                
                {/* Nome Completo */}
                <div>
                  <label className="block text-slate-600 mb-1 font-bold">Nome Completo do Colaborador *</label>
                  <input
                    type="text"
                    value={opNomeCompleto}
                    onChange={e => setOpNomeCompleto(e.target.value)}
                    required
                    placeholder="Ex: CARLOS ALBERTO SILVA"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 font-bold uppercase transition-all"
                  />
                </div>

                {/* Grid: CPF & Data Nascimento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">CPF (Login Coletor) *</label>
                    <input
                      type="text"
                      value={opCpf}
                      onChange={e => setOpCpf(e.target.value)}
                      required
                      placeholder="000.000.000-00"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 font-mono font-bold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">Data de Nascimento</label>
                    <input
                      type="date"
                      value={opDataNascimento}
                      onChange={e => setOpDataNascimento(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 font-mono transition-all"
                    />
                  </div>
                </div>

                {/* Grid: Empresa & Hierarquia */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">Empresa Vinculada *</label>
                    <select
                      value={opCompanyId}
                      onChange={e => setOpCompanyId(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 font-bold transition-all"
                    >
                      {companies.length === 0 && (
                        <option value="emp_default">Empresa Matriz Principal</option>
                      )}
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-bold">Nível de Hierarquia *</label>
                    <select
                      value={opHierarquia}
                      onChange={e => setOpHierarquia(e.target.value as Operator["hierarquia"])}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 font-bold transition-all"
                    >
                      <option value="Inventariante">Inventariante</option>
                      <option value="Coordenação">Coordenação</option>
                      <option value="Supervisão">Supervisão</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>

                {/* Notice on PIN */}
                <div className="p-3 bg-cyan-50/60 border border-cyan-100 rounded-xl text-cyan-900 text-[11px] leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Dica de Acesso:</strong> A senha de acesso do operador no terminal móvel corresponderá automaticamente aos <strong>6 últimos dígitos do CPF</strong> cadastrado.
                  </span>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 font-mono text-xs pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseOperatorModal}
                  disabled={isSavingOperator}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={isSavingOperator}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                  <span>{isSavingOperator ? "SALVANDO..." : "CADASTRAR OPERADOR"}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      {/* Export Result Modal */}
      {selectedExportInventory && (
        <ExportResultModal
          inventory={selectedExportInventory}
          isOpen={!!selectedExportInventory}
          onClose={() => setSelectedExportInventory(null)}
        />
      )}

      {/* Inventory Products Modal (Per-inventory CSV/TXT) */}
      {selectedProductsInventory && (
        <InventoryProductsModal
          inventory={selectedProductsInventory}
          isOpen={!!selectedProductsInventory}
          onClose={() => setSelectedProductsInventory(null)}
          onSync={onSync}
        />
      )}
    </div>
  );
}
