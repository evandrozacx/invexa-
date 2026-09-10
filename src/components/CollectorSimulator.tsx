import React, { useState, useEffect, useRef } from "react";
import { Operator, Device, Inventory, Product, Address, ColetaItem, PalletCount } from "../types";
import { Play, Check, Send, AlertTriangle, ShieldCheck, Barcode, Calendar, Layers, FileText, User, Smartphone, RefreshCw, Volume2, Lock, ArrowLeft, Search, Power, Trash2 } from "lucide-react";


interface Props {
  db: {
    operators: Operator[];
    devices: Device[];
    inventories: Inventory[];
  };
  onSync: () => void;
}

export default function CollectorSimulator({ db, onSync }: Props) {
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [collectorNumber, setCollectorNumber] = useState<string>(() => localStorage.getItem("collectorNumber") || "10");
  const [password, setPassword] = useState<string>("");

  useEffect(() => {
    localStorage.setItem("collectorNumber", collectorNumber);
  }, [collectorNumber]);
  const [isLogged, setIsLogged] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [activeInventoryId, setActiveInventoryId] = useState<string>("");
  const [selectedSectorId, setSelectedSectorId] = useState<string>("");
  const [sectionCode, setSectionCode] = useState("");
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  
  const [hasConfirmedInventory, setHasConfirmedInventory] = useState(false);
  const [isSelectingInventory, setIsSelectingInventory] = useState(false);
  const [sectionFilterQuery, setSectionFilterQuery] = useState("");

  // Scanned items in current section
  const [scannedItems, setScannedItems] = useState<any[]>([]);

  // Current inputs
  const [barcodeInput, setBarcodeInput] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [multiplier, setMultiplier] = useState(false);
  
  // Lot/Validade inputs
  const [lote, setLote] = useState("");
  const [validade, setValidade] = useState("");

  // Extra Info fields (up to 4 fields, max 30 characters each)
  const [extraInfos, setExtraInfos] = useState<string[]>(["", "", "", ""]);

  // Pallet inputs
  const [pallets, setPallets] = useState<number>(0);
  const [layers, setLayers] = useState<number>(0);
  const [boxes, setBoxes] = useState<number>(0);

  // UI state for sound/vibe simulation
  const [beep, setBeep] = useState<"success" | "error" | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncingOffline, setSyncingOffline] = useState(false);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      processOfflineQueue();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const processOfflineQueue = async () => {
    const queueStr = localStorage.getItem("offlineCollectQueue");
    if (!queueStr) return;
    
    let queue: { id: string, payload: any }[] = [];
    try {
      queue = JSON.parse(queueStr);
    } catch(e) {
      return;
    }

    if (queue.length === 0) return;
    setSyncingOffline(true);

    const remainingQueue = [];
    for (const item of queue) {
      try {
        const res = await fetch("/api/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload)
        });
        if (!res.ok) {
           // Se for erro do cliente (ex: bloqueado por regras de negócio), descarta para não travar a fila
           if (res.status >= 400 && res.status < 500) {
             console.warn(`Coleta offline descartada (Erro ${res.status})`, await res.text());
           } else {
             remainingQueue.push(item);
           }
        }
      } catch (err) {
        remainingQueue.push(item);
      }
    }

    localStorage.setItem("offlineCollectQueue", JSON.stringify(remainingQueue));
    setSyncingOffline(false);
    
    if (remainingQueue.length === 0) {
      setSuccessMsg("Dados sincronizados com sucesso!");
      triggerBeep("success");
      onSync();
    }
  };

  // Focus barcode input after scanning successfully
  useEffect(() => {
    if (isSectionOpen && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [isSectionOpen, scannedItems]);

  const [androidDialog, setAndroidDialog] = useState<{
    title?: string;
    message: string;
    onConfirm: (val?: string) => void;
    onCancel?: () => void;
    showInput?: boolean;
    inputValue?: string;
  } | null>(null);

  const [collectorProducts, setCollectorProducts] = useState<Product[]>([]);
  const [collectorAddresses, setCollectorAddresses] = useState<Address[]>([]);

  const activeInventory = db.inventories.find(i => i.id === activeInventoryId);
  const currentOperator = db.operators.find(o => o.id === selectedOperator);

  // Fetch products and addresses catalogue for collector when inventory changes
  useEffect(() => {
    if (!activeInventoryId) return;
    let isCancelled = false;
    Promise.all([
      fetch(`/api/inventories/${activeInventoryId}/products`).then(res => res.ok ? res.json() : null),
      fetch(`/api/inventories/${activeInventoryId}/addresses`).then(res => res.ok ? res.json() : null)
    ]).then(([prodData, addrData]) => {
      if (!isCancelled) {
        if (prodData?.products) setCollectorProducts(prodData.products);
        if (addrData?.addresses) setCollectorAddresses(addrData.addresses);
      }
    }).catch(e => console.error("Error loading collector data:", e));

    return () => { isCancelled = true; };
  }, [activeInventoryId]);

  // Combined products and addresses source
  const availableProducts = collectorProducts.length > 0 
    ? collectorProducts 
    : (activeInventory?.products && activeInventory.products.length > 0 ? activeInventory.products : []);

  const availableAddresses = collectorAddresses.length > 0
    ? collectorAddresses
    : (activeInventory?.addresses && activeInventory.addresses.length > 0 ? activeInventory.addresses : []);

  // Initialize defaults
  useEffect(() => {
    if (db.devices.length > 0 && !selectedDevice) {
      setSelectedDevice(db.devices[0].id);
    }
    if (db.inventories.length > 0 && !activeInventoryId) {
      const active = db.inventories.find(i => i.status === "EM_ANDAMENTO") || db.inventories[0];
      setActiveInventoryId(active.id);
    }
  }, [db]);

  // Handle inventory change -> reset sector
  useEffect(() => {
    if (activeInventory && activeInventory.sectors.length > 0) {
      setSelectedSectorId(activeInventory.sectors[0].id);
    }
  }, [activeInventoryId]);

  function triggerBeep(type: "success" | "error") {
    setBeep(type);
    setTimeout(() => setBeep(null), 800);
  }

  function handleLogin() {
    setErrorMsg("");
    if (!selectedOperator) {
      setErrorMsg("Selecione um operador.");
      triggerBeep("error");
      return;
    }
    const op = db.operators.find(o => o.id === selectedOperator);
    if (!op) return;

    if (password === op.senhaPreenchedores) {
      setIsLogged(true);
      setErrorMsg("");
      triggerBeep("success");
    } else {
      setErrorMsg("Senha incorreta (padrão: 6 últimos dígitos do CPF).");
      triggerBeep("error");
    }
  }

  function handleLogout() {
    setIsLogged(false);
    setPassword("");
    setIsSectionOpen(false);
    setScannedItems([]);
    setHasConfirmedInventory(false);
  }

  function handleOpenSection() {
    setErrorMsg("");
    setSuccessMsg("");
    if (!sectionCode.trim()) {
      setErrorMsg("Informe o código da Seção/Endereço.");
      triggerBeep("error");
      return;
    }

    if (!activeInventory) return;

    // Check if inventory has Address verification (Page 6 - Inventário com Endereço)
    if (activeInventory.tipoContagem === "ENDERECO") {
      const addrExists = availableAddresses.some(
        a => (a.codigo || "").toUpperCase() === sectionCode.trim().toUpperCase()
      );
      if (!addrExists) {
        setErrorMsg("Este endereço não consta no arquivo de endereços do cliente.");
        triggerBeep("error");
        return;
      }
    }

    setIsSectionOpen(true);
    setScannedItems([]);
    triggerBeep("success");
  }

  function handleSelectSection(secCode: string, sectId: string) {
    setErrorMsg("");
    setSuccessMsg("");
    setSelectedSectorId(sectId);
    setSectionCode(secCode);
    
    if (!activeInventory) return;

    // Check if inventory has Address verification (Page 6 - Inventário com Endereço)
    if (activeInventory.tipoContagem === "ENDERECO") {
      const addrExists = availableAddresses.some(
        a => (a.codigo || "").toUpperCase() === secCode.trim().toUpperCase()
      );
      if (!addrExists) {
        setErrorMsg("Este endereço não consta no arquivo de endereços do cliente.");
        triggerBeep("error");
        return;
      }
    }

    setIsSectionOpen(true);
    setScannedItems([]);
    triggerBeep("success");
  }

  function executeAddBarcode(searchedEan: string, matchedProduct: Product | undefined) {
    // Check Multiplier authorization (Page 6 - Inventário normal fechado com ou sem multiplicador)
    if (multiplier && activeInventory?.tipoContagem === "NORMAL_FECHADA_SEM_MULT") {
      setErrorMsg("Uso do multiplicador desabilitado para este tipo de inventário.");
      triggerBeep("error");
      setMultiplier(false);
      return;
    }

    // Compute quantities based on Pallets setup (Page 8 - Imagem 7.1)
    let finalQty = multiplier ? quantity : 1;
    let computedPallet: PalletCount | undefined = undefined;

    if (activeInventory && activeInventory.coletaPallets !== "NAO" && pallets > 0) {
      // In a real scenario, we read items per pallet from product or setting, but for high fidelity:
      // Let's assume a default multiplier of 100 per pallet or 10 per box
      const unitsPerPallet = 100;
      const unitsPerBox = 10;
      
      let totalPalletQty = 0;
      if (activeInventory.coletaPallets === "SIMPLIFICADO") {
        totalPalletQty = (pallets * unitsPerPallet) + finalQty;
        computedPallet = { pallets, qty: totalPalletQty };
      } else if (activeInventory.coletaPallets === "DETALHADO") {
        totalPalletQty = (pallets * unitsPerPallet) + (layers * unitsPerBox * 4) + (boxes * unitsPerBox) + finalQty;
        computedPallet = { pallets, layers, boxes, qty: totalPalletQty };
      }
      finalQty = totalPalletQty;
    }

    const newItem = {
      ean: matchedProduct?.ean || searchedEan,
      sap: matchedProduct?.sap || "DESCONHECIDO",
      descricao: matchedProduct?.descricao || "PRODUTO NÃO CADASTRADO",
      quantidade: finalQty,
      lote: lote ? lote.toUpperCase() : undefined,
      validade: validade || undefined,
      infoExtra: activeInventory?.tipoContagem === "INFO_EXTRA" ? extraInfos.filter(val => val.trim() !== "") : undefined,
      pallet: computedPallet,
      timestamp: new Date().toISOString(),
      operatorId: selectedOperator,
      operatorName: currentOperator?.nomeCompleto || "COLETOR"
    };

    setScannedItems([newItem, ...scannedItems]);
    
    // Reset inputs
    setBarcodeInput("");
    setQuantity(1);
    setLote("");
    setValidade("");
    setExtraInfos(["", "", "", ""]);
    setPallets(0);
    setLayers(0);
    setBoxes(0);
    triggerBeep("success");
  }

  function handleAddBarcode() {
    setErrorMsg("");
    setSuccessMsg("");
    if (!barcodeInput.trim()) return;

    if (!activeInventory) return;

    const searchedEan = barcodeInput.trim();
    const cleanSearched = searchedEan.replace(/^0+/, "");
    // Search in product file
    const matchedProduct = availableProducts.find(p => {
      const pEan = (p.ean || "").trim();
      const pSap = (p.sap || "").trim();
      return (
        pEan === searchedEan || 
        pSap === searchedEan || 
        (cleanSearched && (pEan.replace(/^0+/, "") === cleanSearched || pSap.replace(/^0+/, "") === cleanSearched))
      );
    });

    // Permissão de Coleta Check (Page 7 - Imagem 7)
    if (!matchedProduct) {
      if (activeInventory.permissaoColeta === "SOMENTE_CARREGADOS") {
        setErrorMsg(`Alerta: Código ${searchedEan} não encontrado no arquivo de produtos!`);
        triggerBeep("error");
        return;
      } else if (activeInventory.permissaoColeta === "CARREGADOS_CONFIRMA") {
        setAndroidDialog({
          title: "Produto Desconhecido",
          message: `O produto "${searchedEan}" não foi encontrado no arquivo de produtos. Confirmar coleta avulsa deste item?`,
          onConfirm: () => {
            executeAddBarcode(searchedEan, undefined);
          },
          onCancel: () => {
            setBarcodeInput("");
          }
        });
        return;
      }
    }

    executeAddBarcode(searchedEan, matchedProduct);
  }

  // Quick action: Simulate scan of a random or selected database product
  function handleSimulateProductClick(prod: Product) {
    setBarcodeInput(prod.ean);
  }

  function handleRemoveItem(index: number) {
    const updated = [...scannedItems];
    updated.splice(index, 1);
    setScannedItems(updated);
    triggerBeep("success");
  }

  async function handleTransmitSection() {
    if (!activeInventory || !selectedSectorId) return;
    setErrorMsg("");
    setSuccessMsg("");

    const transmitPayload = async () => {
      const payload = {
        inventoryId: activeInventoryId,
        sectorId: selectedSectorId,
        sectionCode: sectionCode.trim().toUpperCase(),
        operatorId: selectedOperator,
        operatorName: currentOperator?.nomeCompleto || "COLETOR",
        collectorNumber: collectorNumber,
        items: scannedItems,
        startTime: new Date(Date.now() - 300000).toISOString(), // Simulated 5 mins duration
        endTime: new Date().toISOString()
      };

      const handleOfflineSave = () => {
        const queueStr = localStorage.getItem("offlineCollectQueue");
        const queue = queueStr ? JSON.parse(queueStr) : [];
        queue.push({ id: Date.now().toString(), payload });
        localStorage.setItem("offlineCollectQueue", JSON.stringify(queue));
        
        setSuccessMsg(`Modo offline ativo: Seção ${sectionCode} salva localmente e será transmitida quando a conexão retornar!`);
        triggerBeep("success");
        setScannedItems([]);
        setIsSectionOpen(false);
        setSectionCode("");
      };

      if (!navigator.onLine) {
        handleOfflineSave();
        return;
      }

      try {
        const res = await fetch("/api/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          setSuccessMsg(`Seção ${sectionCode} transmitida com sucesso para a API!`);
          triggerBeep("success");
          setScannedItems([]);
          setIsSectionOpen(false);
          setSectionCode("");
          onSync(); // Update main dashboard
        } else {
          const errData = await res.json();
          setErrorMsg(errData.error || "Erro ao transmitir contagem.");
          triggerBeep("error");
        }
      } catch (err) {
        handleOfflineSave();
      }
    };

    // Confrontation verification for closed counts (Page 6 - Inventário normal com contagem fechada)
    if (activeInventory.tipoContagem.startsWith("NORMAL_FECHADA")) {
      setAndroidDialog({
        title: "Confronto de Seção",
        message: "CONFRONTO OBRIGATÓRIO:\nInforme o TOTAL de peças contadas nesta seção para validação:",
        showInput: true,
        inputValue: "",
        onConfirm: (userCountInput) => {
          const parsedUserQty = parseInt(userCountInput || "") || 0;
          const actualQty = scannedItems.reduce((acc, it) => acc + it.quantidade, 0);

          if (parsedUserQty !== actualQty) {
            triggerBeep("error");
            setAndroidDialog({
              title: "Divergência de Fechamento",
              message: `A quantidade informada (${parsedUserQty}) difere da quantidade total apurada no coletor (${actualQty}). Deseja tentar informar novamente?`,
              onConfirm: () => {
                setAndroidDialog({
                  title: "Digitar Novamente",
                  message: "Digite novamente a QUANTIDADE TOTAL de peças:",
                  showInput: true,
                  inputValue: "",
                  onConfirm: (userCountInput2) => {
                    const parsedUserQty2 = parseInt(userCountInput2 || "") || 0;
                    if (parsedUserQty2 === actualQty) {
                      setSuccessMsg("Fechamento validado com sucesso!");
                      triggerBeep("success");
                      transmitPayload();
                    } else {
                      setErrorMsg("Divergência persistente: A contagem desta seção foi APAGADA. Refaça a coleta.");
                      setScannedItems([]);
                      setIsSectionOpen(false);
                      triggerBeep("error");
                    }
                  },
                  onCancel: () => {
                    setScannedItems([]);
                    setIsSectionOpen(false);
                  }
                });
              },
              onCancel: () => {
                setScannedItems([]);
                setIsSectionOpen(false);
              }
            });
          } else {
            setSuccessMsg("Seção validada e encerrada!");
            triggerBeep("success");
            transmitPayload();
          }
        },
        onCancel: () => {}
      });
    } else {
      transmitPayload();
    }
  }

  return (
    <div className="bg-slate-900 border-4 border-slate-700 rounded-[3rem] p-6 max-w-sm mx-auto shadow-2xl relative overflow-hidden" style={{ minHeight: "650px" }}>
      {/* Phone Speaker & Camera Bezel */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-6 bg-slate-700 rounded-b-xl z-20 flex justify-center items-center">
        <div className="w-16 h-1.5 bg-slate-900 rounded-full mr-2"></div>
        <div className="w-2.5 h-2.5 bg-slate-900 rounded-full"></div>
      </div>

      {/* Screen area */}
      <div className="bg-slate-950 text-slate-100 rounded-[2rem] p-4 flex flex-col justify-between h-full pt-6 relative overflow-hidden" style={{ minHeight: "590px" }}>
        
        {/* Large Collector Number Display (Floating background or header) */}
        <div className="absolute top-8 right-6 opacity-10 pointer-events-none select-none">
          <span className="text-8xl font-black italic tracking-tighter">#{collectorNumber}</span>
        </div>
        
        {/* Beep notification indicator overlay */}
        {beep === "error" && (
          <div className="absolute inset-0 z-50 flex items-center justify-center opacity-90 transition-opacity bg-rose-600/90">
            <div className="text-center p-4">
              <AlertTriangle className="w-16 h-16 mx-auto animate-bounce" />
              <span className="font-bold text-xl block mt-2">ERRO / ALERTA</span>
            </div>
          </div>
        )}
        {beep === "success" && (
          <div className="absolute top-0 inset-x-0 z-50 h-2 bg-emerald-500 animate-pulse pointer-events-none"></div>
        )}

        {/* Android Native-Like Material Dialog Overlay */}
        {androidDialog && (
          <div className="absolute inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-3.5 w-full shadow-2xl">
              <span className="font-bold text-xs text-cyan-400 font-mono tracking-wider block uppercase">
                {androidDialog.title}
              </span>
              <p className="text-[11px] text-slate-300 leading-normal whitespace-pre-line font-sans">
                {androidDialog.message}
              </p>
              
              {androidDialog.showInput && (
                <input
                  type="text"
                  value={androidDialog.inputValue || ""}
                  onChange={(e) => setAndroidDialog({ ...androidDialog, inputValue: e.target.value })}
                  placeholder="Digite o total..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none font-mono text-center focus:border-cyan-500 transition-colors"
                  autoFocus
                />
              )}
              
              <div className="flex justify-end gap-2 text-[11px] pt-1.5 font-mono">
                {androidDialog.onCancel && (
                  <button
                    onClick={() => {
                      const cancel = androidDialog.onCancel;
                      setAndroidDialog(null);
                      if (cancel) cancel();
                    }}
                    className="text-slate-400 hover:text-white px-3 py-1.5 font-bold uppercase transition-colors"
                  >
                    CANCELAR
                  </button>
                )}
                <button
                  onClick={() => {
                    const confirm = androidDialog.onConfirm;
                    const val = androidDialog.inputValue;
                    setAndroidDialog(null);
                    confirm(val);
                  }}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-4 py-1.5 rounded-lg uppercase transition-colors"
                >
                  CONFIRMAR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="border-b border-slate-800 pb-2 mb-2 flex justify-between items-center text-xs text-slate-400">
          <div className="flex items-center gap-1 font-mono">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>COLETOR #{collectorNumber}</span>
          </div>
          <div className="flex items-center gap-1">
            {syncingOffline ? (
              <>
                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-amber-400 font-bold">SINCRONIZANDO</span>
              </>
            ) : isOffline ? (
              <>
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span className="text-red-500 font-bold">OFFLINE</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>API ONLINE</span>
              </>
            )}
          </div>
        </div>

        {/* MAIN BODY SCROLLER */}
        <div className="flex-1 overflow-y-auto pr-1 text-sm">
          {!hasConfirmedInventory ? (
            /* FIRST SCREEN: SELECT INVENTORY */
            <div className="space-y-5 pt-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Smartphone className="w-8 h-8 text-cyan-400 animate-pulse" />
                </div>
                <h3 className="font-mono text-cyan-400 font-bold tracking-wider text-lg">INVEXA COLLECTOR</h3>
                <p className="text-xs text-slate-400 mt-1">Selecione o inventário em andamento para iniciar os trabalhos</p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setIsSelectingInventory(true)}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 transition-all active:scale-95 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-slate-950 font-mono shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  <Search className="w-4 h-4 stroke-[2.5]" />
                  SELECIONAR INVENTÁRIO
                </button>

                {/* Simulated Device Info */}
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-[9px] text-slate-500 font-mono block uppercase">Informações do Coletor:</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-500 block text-[8px] uppercase font-mono">Nº COLETOR:</span>
                      <input
                        type="text"
                        value={collectorNumber}
                        onChange={(e) => setCollectorNumber(e.target.value)}
                        className="bg-slate-950 border border-cyan-500/30 rounded px-2 py-1 text-cyan-400 font-black text-sm outline-none w-full text-center"
                        placeholder="Ex: 10"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[8px] uppercase font-mono">Dispositivo:</span>
                      <select
                        value={selectedDevice}
                        onChange={(e) => setSelectedDevice(e.target.value)}
                        className="bg-slate-950 border border-slate-850 rounded px-1.5 py-1.5 text-slate-300 outline-none w-full h-[28px] mt-0.5"
                      >
                        {db.devices.map(d => (
                          <option key={d.id} value={d.id}>{d.nomeFantasia}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* INVENTORY SELECTOR POP-UP / BOTTOM SHEET */}
              {isSelectingInventory && (
                <div className="absolute inset-x-0 bottom-0 top-12 bg-slate-950/95 z-40 flex flex-col p-4 animate-fade-in border-t border-slate-850 rounded-t-[1.5rem]">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-850 mb-3">
                    <span className="font-bold text-xs text-cyan-400 font-mono">SELECIONE O INVENTÁRIO</span>
                    <button
                      onClick={() => setIsSelectingInventory(false)}
                      className="text-slate-500 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>

                  {/* List of active inventories */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {db.inventories.filter(i => i.status === "EM_ANDAMENTO").length === 0 ? (
                      <div className="text-center py-6 text-slate-500 space-y-2">
                        <p className="text-xs italic">Nenhum inventário ativo "EM ANDAMENTO" encontrado.</p>
                        <p className="text-[10px] text-slate-400">
                          Ative um inventário no painel de mapeamento para selecioná-lo aqui.
                        </p>
                        {/* Simulation bypass to start anyway */}
                        <div className="pt-4 border-t border-slate-900 mt-4">
                          <span className="text-[9px] text-slate-600 block uppercase mb-1.5">Forçar Simulação (Todos):</span>
                          <div className="space-y-1.5">
                            {db.inventories.map(inv => (
                              <button
                                key={inv.id}
                                onClick={() => {
                                  setActiveInventoryId(inv.id);
                                  setHasConfirmedInventory(true);
                                  setIsSelectingInventory(false);
                                  triggerBeep("success");
                                }}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-left p-2 rounded text-[10px] text-slate-300 font-mono flex justify-between items-center cursor-pointer"
                              >
                                <span>{inv.nome}</span>
                                <span className="bg-slate-800 text-[8px] text-cyan-400 px-1 py-0.5 rounded font-sans uppercase font-bold">{inv.status}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      db.inventories
                        .filter(i => i.status === "EM_ANDAMENTO")
                        .map(inv => (
                          <button
                            key={inv.id}
                            onClick={() => {
                              setActiveInventoryId(inv.id);
                              setHasConfirmedInventory(true);
                              setIsSelectingInventory(false);
                              triggerBeep("success");
                            }}
                            className="w-full bg-slate-900 hover:bg-slate-850 hover:border-cyan-500/50 text-left p-3 rounded-xl border border-slate-800 transition-all flex flex-col gap-1 active:scale-98 cursor-pointer"
                          >
                            <div className="flex justify-between items-start w-full">
                              <span className="font-bold text-slate-200 text-xs truncate max-w-[170px]">
                                {inv.nome}
                              </span>
                              <span className="bg-emerald-500/15 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                                EM ANDAMENTO
                              </span>
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-500 font-mono w-full">
                              <span>Filial: {inv.filial}</span>
                              <span>Data: {(inv.dataExecucao || "").split("-").reverse().join("/")}</span>
                            </div>
                            <div className="text-[8px] text-cyan-400 font-mono uppercase bg-cyan-950/20 px-1.5 py-0.5 rounded w-max mt-1">
                              Contagem: {(inv.tipoContagem || "").replace(/_/g, " ")}
                            </div>
                          </button>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : !isLogged ? (
            /* SECOND SCREEN: PASSWORD & CREDENTIALS */
            <div className="space-y-4 pt-2">
              <button
                onClick={() => setHasConfirmedInventory(false)}
                className="text-slate-400 hover:text-white text-xs font-mono flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
                Trocar Inventário
              </button>

              <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-3 text-center">
                <span className="text-[9px] text-cyan-400 font-mono font-bold tracking-widest block uppercase">
                  Inventário Selecionado:
                </span>
                <span className="font-bold text-slate-100 text-sm block truncate mt-0.5 uppercase">
                  {activeInventory?.nome}
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">
                  Filial: {activeInventory?.filial}
                </span>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Operador/Colaborador</label>
                  <select
                    value={selectedOperator}
                    onChange={(e) => setSelectedOperator(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-500 outline-none"
                  >
                    <option value="">Selecione seu nome...</option>
                    {db.operators.map(o => (
                      <option key={o.id} value={o.id}>{o.nomeCompleto}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Senha do Operador (6 dígitos)</label>
                  <div className="relative">
                    <input
                      type="password"
                      maxLength={6}
                      placeholder="Últimos 6 dígitos do CPF"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-cyan-500 outline-none tracking-widest text-center font-mono font-bold"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1 leading-normal">
                    *Senha padrão: Os 6 últimos dígitos do CPF cadastrado do operador.
                  </div>
                </div>

                <button
                  onClick={handleLogin}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 active:scale-98 transition-all py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 text-slate-950 font-mono mt-3 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  ACESSAR COLETOR
                </button>
              </div>
            </div>
          ) : (
            /* LOGGED IN / AVAILABLE SECTIONS */
            <div className="space-y-3">
              {/* Operator info bar */}
              <div className="bg-slate-900 p-2.5 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500 text-[8px] font-mono uppercase block">OPERADOR LOGADO:</span>
                  <span className="font-bold text-cyan-400 flex items-center gap-1">
                    <User className="w-3 h-3 inline text-cyan-500" /> {currentOperator?.nomeCompleto}
                  </span>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="text-slate-400 hover:text-rose-400 text-[10px] font-bold bg-slate-950/40 px-2 py-1 rounded border border-slate-800 transition-colors flex items-center gap-0.5 cursor-pointer"
                >
                  <Power className="w-3 h-3 text-rose-500" /> Sair
                </button>
              </div>

              {/* Select Active Inventory & Sector */}
              {!isSectionOpen && (
                <div className="space-y-3">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex justify-between items-center">
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-500 text-[8px] font-mono block">INVENTÁRIO TRABALHANDO:</span>
                      <span className="font-bold text-slate-300 text-[11px] block truncate uppercase font-mono">
                        {activeInventory?.nome}
                      </span>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-400 font-mono font-bold text-[8px] px-1.5 py-0.5 rounded border border-emerald-900/30 shrink-0">
                      CONECTADO
                    </span>
                  </div>

                  {/* Manual input code bypass */}
                  <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-mono">DIGITAR SEÇÃO MANUALMENTE:</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Ex: 2392"
                        value={sectionCode}
                        onChange={(e) => setSectionCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleOpenSection()}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs outline-none font-mono font-bold uppercase text-center focus:border-cyan-500"
                      />
                      <button
                        onClick={handleOpenSection}
                        className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3 rounded-lg text-xs font-mono cursor-pointer"
                      >
                        ABRIR
                      </button>
                    </div>
                  </div>

                  {/* Available Sections Title */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs px-1 text-slate-400">
                      <span className="font-mono text-[10px] uppercase tracking-wider">SEÇÕES DISPONÍVEIS:</span>
                      <span className="text-[9px] font-mono text-slate-500">Clique para abrir</span>
                    </div>

                    {/* Section filter query search bar */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar seção por código..."
                        value={sectionFilterQuery}
                        onChange={e => setSectionFilterQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-7 pr-3 py-1.5 text-slate-300 text-xs outline-none focus:border-cyan-500/60 transition-colors placeholder-slate-600"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-600 absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  {/* Scrollable list of available sections */}
                  <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                    {activeInventory?.sectors.flatMap(sector => 
                      sector.sections.map(sec => ({ ...sec, sectorId: sector.id, sectorName: sector.nome, sectorTipo: sector.tipo }))
                    ).filter(s => !sectionFilterQuery.trim() || s.code.includes(sectionFilterQuery.trim())).length === 0 ? (
                      <div className="text-center py-8 text-slate-600 italic text-xs border border-dashed border-slate-800 rounded-lg">
                        Nenhuma seção correspondente encontrada.
                      </div>
                    ) : (
                      activeInventory?.sectors.flatMap(sector => 
                        sector.sections.map(sec => ({ ...sec, sectorId: sector.id, sectorName: sector.nome, sectorTipo: sector.tipo }))
                      )
                      .filter(s => !sectionFilterQuery.trim() || s.code.includes(sectionFilterQuery.trim()))
                      .map(sec => {
                        const statusColors: Record<string, string> = {
                          NAO_INICIADO: "bg-slate-900 border-slate-800 hover:border-slate-700",
                          EM_ANDAMENTO: "bg-amber-950/20 border-amber-800/40 hover:border-amber-700/60",
                          CONTADO: "bg-emerald-950/20 border-emerald-800/40 hover:border-emerald-700/60",
                          DIVERGENTE: "bg-rose-950/20 border-rose-800/40 hover:border-rose-700/60",
                          CONFERIDO_OK: "bg-yellow-950/30 border-yellow-800/50 hover:border-yellow-700/60"
                        };

                        const statusLabels: Record<string, string> = {
                          NAO_INICIADO: "Disponível",
                          EM_ANDAMENTO: "Em Digitação",
                          CONTADO: "Contado",
                          DIVERGENTE: "Divergente",
                          CONFERIDO_OK: "Fechado"
                        };

                        const statusBadgeColors: Record<string, string> = {
                          NAO_INICIADO: "text-slate-400 bg-slate-950",
                          EM_ANDAMENTO: "text-amber-400 bg-amber-950/80",
                          CONTADO: "text-emerald-400 bg-emerald-950/80",
                          DIVERGENTE: "text-rose-400 bg-rose-950/80",
                          CONFERIDO_OK: "text-yellow-400 bg-yellow-950/80"
                        };

                        return (
                          <button
                            key={sec.code}
                            onClick={() => handleSelectSection(sec.code, sec.sectorId)}
                            className={`w-full text-left p-2.5 rounded-xl border transition-all flex justify-between items-center active:scale-98 cursor-pointer ${statusColors[sec.status] || "bg-slate-900 border-slate-800"}`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono font-extrabold text-white text-xs">
                                Seção #{sec.code}
                              </span>
                              <span className="text-[8px] text-slate-500 font-mono uppercase truncate max-w-[140px]">
                                {sec.sectorName} ({sec.sectorTipo})
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full ${statusBadgeColors[sec.status] || "text-slate-400 bg-slate-950"}`}>
                                {statusLabels[sec.status] || sec.status}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ACTIVE COUNT IN PROGRESS PANEL */}
              {isSectionOpen && activeInventory && (
                <div className="space-y-3 bg-slate-900/40 p-2.5 rounded border border-cyan-950">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                    <span className="text-xs text-slate-400 font-mono">
                      SEÇÃO: <b className="text-cyan-400 font-bold text-sm font-mono">{sectionCode.toUpperCase()}</b>
                    </span>
                    <button
                      onClick={() => setIsSectionOpen(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-200"
                    >
                      Trocar Seção
                    </button>
                  </div>

                  {/* Mode badge information */}
                  <div className="text-[10px] bg-slate-950 px-2 py-1 rounded text-slate-400 border border-slate-800 flex justify-between items-center font-mono">
                    <span>CONTAGEM: <b>{(activeInventory.tipoContagem || "").replace(/_/g, " ")}</b></span>
                    {activeInventory.compara && <span className="text-amber-400 font-bold">COMPARA</span>}
                  </div>

                  {/* Lot / Expiration requirements */}
                  {activeInventory.tipoContagem === "LOTE_VALIDADE" && (
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2 rounded border border-slate-800">
                      <div>
                        <label className="text-[9px] text-slate-400 flex items-center gap-0.5">
                          <FileText className="w-2.5 h-2.5 text-cyan-400" /> LOTE (CAIXA ALTA)
                        </label>
                        <input
                          type="text"
                          placeholder="LOTE123"
                          value={lote}
                          onChange={(e) => setLote(e.target.value.toUpperCase())}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs outline-none uppercase font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5 text-cyan-400" /> VALIDADO
                        </label>
                        <input
                          type="date"
                          value={validade}
                          onChange={(e) => setValidade(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-200 text-xs outline-none font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Extra Info requirements (up to 4 text fields max 30 char each) */}
                  {activeInventory.tipoContagem === "INFO_EXTRA" && (
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1.5">
                      <span className="text-[9px] text-slate-400 font-mono block">CAMPOS INFO EXTRA (EX: IMEI/CHIP):</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {extraInfos.map((val, idx) => (
                          <input
                            key={idx}
                            type="text"
                            maxLength={30}
                            placeholder={`Info Extra ${idx + 1}`}
                            value={val || ""}
                            onChange={(e) => {
                              const updated = [...extraInfos];
                              updated[idx] = e.target.value.toUpperCase();
                              setExtraInfos(updated);
                            }}
                            className="bg-slate-900 border border-slate-800 rounded p-1 text-slate-200 text-[10px] outline-none font-mono uppercase"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pallet config requirements */}
                  {activeInventory.coletaPallets !== "NAO" && (
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1.5">
                      <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                        <Layers className="w-3 h-3 text-cyan-400" /> COLETA DE PALLET ({activeInventory.coletaPallets})
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="text-[8px] text-slate-500 block">Pallets Qtd</label>
                          <input
                            type="number"
                            min={0}
                            value={pallets}
                            onChange={(e) => setPallets(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-slate-900 border border-slate-850 rounded p-1 text-slate-200 text-[11px] text-center outline-none font-mono"
                          />
                        </div>
                        {activeInventory.coletaPallets === "DETALHADO" && (
                          <>
                            <div>
                              <label className="text-[8px] text-slate-500 block">Camadas</label>
                              <input
                                type="number"
                                min={0}
                                value={layers}
                                onChange={(e) => setLayers(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full bg-slate-900 border border-slate-850 rounded p-1 text-slate-200 text-[11px] text-center outline-none font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] text-slate-500 block">Caixas</label>
                              <input
                                type="number"
                                min={0}
                                value={boxes}
                                onChange={(e) => setBoxes(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full bg-slate-900 border border-slate-850 rounded p-1 text-slate-200 text-[11px] text-center outline-none font-mono"
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <p className="text-[8px] text-cyan-400 italic font-mono">
                        *Multiplica Pallet = +100 unidades; Caixa = +10 unidades
                      </p>
                    </div>
                  )}

                  {/* Core scanner & input line */}
                  <div className="space-y-2 pt-1.5">
                    <div className="flex gap-1.5">
                      <div className="flex-1 relative">
                        <input
                          ref={barcodeInputRef}
                          type="text"
                          placeholder="Bipe Código (EAN ou SAP) - Aperte ENTER"
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddBarcode()}
                          className="w-full bg-slate-900 border border-slate-750 rounded pl-7 pr-2 py-1.5 text-slate-200 text-xs outline-none font-mono"
                        />
                        <Barcode className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2.5" />
                      </div>
                    </div>

                    {/* Multiplier panel */}
                    <div className="flex items-center justify-between bg-slate-900/50 p-1.5 rounded border border-slate-800 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-400">
                        <input
                          type="checkbox"
                          checked={multiplier}
                          onChange={(e) => {
                            if (activeInventory.tipoContagem === "NORMAL_FECHADA_SEM_MULT") {
                              setErrorMsg("Uso do multiplicador desabilitado para este tipo de inventário.");
                              triggerBeep("error");
                              return;
                            }
                            setMultiplier(e.target.checked);
                          }}
                          className="accent-cyan-500 rounded"
                        />
                        <span>Multiplicador</span>
                      </label>

                      {multiplier && (
                        <div className="flex items-center gap-1 font-mono">
                          <span className="text-[10px] text-slate-500">Qtd:</span>
                          <input
                            type="number"
                            min={1}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-12 bg-slate-950 border border-slate-800 rounded text-center text-cyan-400 font-bold px-1 py-0.5 text-xs outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Quick Demo Assist - Let user quickly click to simulate scanned database products */}
                    <div className="bg-slate-950 p-2 rounded border border-slate-850 space-y-1">
                      <div className="text-[9px] text-slate-400 font-mono flex justify-between items-center">
                        <span>SIMULAR LEITURA DE PRODUTO:</span>
                        <span className="text-[8px] text-slate-500">Clique para autocompletar</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1 max-h-24 overflow-y-auto pr-1">
                        {availableProducts.slice(0, 5).map((p, idx) => (
                          <button
                            key={`${p.ean}-${idx}`}
                            onClick={() => handleSimulateProductClick(p)}
                            className="bg-slate-900 hover:bg-slate-800 text-left p-1 rounded text-[9px] text-slate-300 flex justify-between font-mono border border-slate-800/40"
                          >
                            <span className="truncate max-w-[140px] font-sans">{p.descricao}</span>
                            <span className="text-cyan-500 font-bold">{p.ean}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Scanned Items list in Current Section */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono flex justify-between">
                      <span>BIPES NESTA SEÇÃO ({scannedItems.length})</span>
                      <span>Total Peças: {scannedItems.reduce((acc, it) => acc + it.quantidade, 0)}</span>
                    </span>
                    
                    <div className="bg-slate-950 p-1.5 rounded border border-slate-850 max-h-36 overflow-y-auto space-y-1 text-[10px] font-mono">
                      {scannedItems.length === 0 ? (
                        <div className="text-center text-slate-600 py-3 italic">Nenhum item bipado ainda.</div>
                      ) : (
                        scannedItems.map((it, idx) => (
                          <div key={idx} className="bg-slate-900 p-1.5 rounded border border-slate-800 flex justify-between items-center relative">
                            <div>
                              <span className="text-cyan-400 font-bold">{it.ean}</span>
                              <span className="text-slate-400 truncate block max-w-[150px] font-sans text-[9px]">
                                {it.descricao}
                              </span>
                              {it.lote && (
                                <span className="text-[8px] text-amber-500 block">Lote: {it.lote} | Venc: {it.validade}</span>
                              )}
                              {it.pallet && (
                                <span className="text-[8px] text-purple-400 block mt-0.5">
                                  {it.pallet.pallets > 0 && `Pallets: ${it.pallet.pallets}`} 
                                  {it.pallet.layers !== undefined && ` | Lastros: ${it.pallet.layers}`} 
                                  {it.pallet.boxes !== undefined && ` | Caixas: ${it.pallet.boxes}`} 
                                  {` | Qtd Pallet: ${it.pallet.qty}`}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-950 text-emerald-400 font-bold px-1.5 py-0.5 rounded text-[11px]">
                                x{it.quantidade}
                              </span>
                              <button 
                                onClick={() => handleRemoveItem(idx)}
                                className="bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 p-1 rounded transition-colors"
                                title="Remover item"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Send Count */}
                  <button
                    onClick={handleTransmitSection}
                    disabled={scannedItems.length === 0}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors py-2 rounded text-slate-950 font-bold text-xs flex items-center justify-center gap-1 font-mono uppercase"
                  >
                    <Send className="w-3.5 h-3.5 fill-current" /> TRANSMITIR COLETA
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FEEDBACK STATUS */}
        {(errorMsg || successMsg) && (
          <div className="my-2 text-[10px] p-2 rounded font-mono border">
            {errorMsg && (
              <div className="text-rose-400 flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="text-emerald-400 flex items-start gap-1">
                <Check className="w-3 h-3 flex-shrink-0 mt-0.5 text-emerald-500" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Home Screen indicator / Back button */}
        <div className="pt-2 text-center text-[10px] text-slate-500 font-mono border-t border-slate-900">
          Invexa Colector v2.1 • Android Simulator
        </div>
      </div>
    </div>
  );
}
