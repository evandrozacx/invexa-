import React, { useState, useRef } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle, ArrowLeft, ArchiveRestore, Info } from "lucide-react";

interface Props {
  onSync: () => void;
  setActiveTab: (tab: "inventories" | "dashboard" | "imports" | "reports" | "settings" | "simulator" | "restore") => void;
}

export default function BackupRestorePanel({ onSync, setActiveTab }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.inventory) {
          throw new Error("Arquivo inválido: formato de backup não reconhecido.");
        }
        setParsedData(json);
      } catch (err: any) {
        setError(err.message || "Erro ao ler arquivo JSON.");
        setParsedData(null);
      }
    };
    reader.readAsText(selected);
  };

  const handleRestore = async () => {
    if (!parsedData) return;
    setIsRestoring(true);
    setError("");
    try {
      const res = await fetch("/api/inventories/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedData)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || "Falha ao restaurar.");
      }
      
      onSync();
      setActiveTab("inventories");
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="w-full font-sans antialiased bg-slate-50 min-h-screen p-6 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
              <ArchiveRestore className="w-7 h-7 text-indigo-600" />
              Restaurar Inventário
            </h2>
            <p className="text-slate-500 mt-1 font-medium text-sm">
              Importe um arquivo de backup (.json) para restaurar um inventário completo.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          
          {!parsedData ? (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".json" 
                className="hidden" 
                onChange={handleFileChange}
              />
              <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-1">Selecione o arquivo de Backup</h3>
              <p className="text-slate-500 text-sm">Clique para procurar ou arraste o arquivo .json aqui</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                <div>
                  <h3 className="text-emerald-900 font-bold text-lg">Arquivo lido com sucesso</h3>
                  <p className="text-emerald-700 text-sm">{file?.name}</p>
                </div>
                <button 
                  onClick={() => { setParsedData(null); setFile(null); }}
                  className="ml-auto text-sm font-bold text-emerald-700 hover:text-emerald-900 px-3 py-1.5 bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                >
                  Trocar Arquivo
                </button>
              </div>

              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs border-b border-slate-200 pb-2">
                  Resumo do Inventário a Restaurar
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-slate-500 text-xs">Nome / Cliente</span>
                    <span className="font-bold text-slate-700">{parsedData.inventory.nome}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-xs">Filial</span>
                    <span className="font-bold text-slate-700">{parsedData.inventory.filial || "-"}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-xs">Produtos</span>
                    <span className="font-bold text-slate-700">{parsedData.products?.length || parsedData.inventory.totalProductsCount || 0} itens</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-xs">Setores Mapeados</span>
                    <span className="font-bold text-slate-700">{(parsedData.inventory.sectors || []).length} setores</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <strong>Importante:</strong> O inventário será restaurado como um <span className="underline">Novo Inventário</span> (receberá um novo ID) com a tag <strong>(Restaurado)</strong> no nome, para não substituir nenhum dado ativo atual.
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isRestoring ? (
                    <span>RESTAURANDO...</span>
                  ) : (
                    <>
                      <ArchiveRestore className="w-5 h-5" />
                      <span>RESTAURAR AGORA</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm font-semibold">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
