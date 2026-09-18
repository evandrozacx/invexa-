import fs from "fs";
let source = fs.readFileSync("src/components/Dashboard.tsx", "utf8");

const oldStr = `                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-slate-500 text-[10px] block font-sans">1ª Contagem ({c1.operatorName}):</span>
                          <span className="font-bold text-slate-800 text-sm">{tot1} pçs</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-slate-500 text-[10px] block font-sans">2ª Contagem ({c2.operatorName}):</span>
                          <span className="font-bold text-slate-800 text-sm">{tot2} pçs</span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        {!isConferido && (
                          <button
                            onClick={() => executeForceConferidoOk(selectedSection.sectorId, selectedSection.section.code)}
                            className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-bold py-1.5 px-2 rounded text-[10px] font-mono border border-yellow-600"
                          >
                            FORÇAR COMPARA OK (AMARELO)
                          </button>
                        )}
                        <button
                          onClick={() => executeClearSecondCount(selectedSection.sectorId, selectedSection.section.code)}
                          className="flex-1 bg-white hover:bg-slate-100 text-slate-800 font-bold py-1.5 px-2 rounded text-[10px] font-mono border border-slate-300"
                        >
                          LIBERAR P/ RECONTAGEM (APAGAR 2ª)
                        </button>
                      </div>`;

const newStr = `                      <div className={\`grid \${selectedSection.section.contagens.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-[11px] font-mono\`}>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-slate-500 text-[10px] block font-sans">1ª Contagem ({c1.operatorName}):</span>
                          <span className="font-bold text-slate-800 text-sm">{tot1} pçs</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-slate-500 text-[10px] block font-sans">2ª Contagem ({c2.operatorName}):</span>
                          <span className="font-bold text-slate-800 text-sm">{tot2} pçs</span>
                        </div>
                        {selectedSection.section.contagens.length >= 3 && (
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="text-slate-500 text-[10px] block font-sans">3ª Contagem ({selectedSection.section.contagens[2].operatorName}):</span>
                            <span className="font-bold text-slate-800 text-sm">
                              {Object.values(selectedSection.section.contagens[2].items || []).reduce((a: any, b: any) => a + (Number(b.quantidade) || 0), 0)} pçs
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {!isConferido && (
                        <div className="flex flex-col gap-1.5 pt-1 mt-2">
                          <span className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-wide">Ações do Supervisor:</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => executeForceCount1(selectedSection.sectorId, selectedSection.section.code)}
                              className="flex-1 bg-white hover:bg-slate-100 text-slate-700 font-bold py-1.5 px-2 rounded text-[10px] font-mono border border-slate-300"
                            >
                              APROVAR 1ª ({tot1} pçs)
                            </button>
                            <button
                              onClick={() => executeForceCount2(selectedSection.sectorId, selectedSection.section.code)}
                              className="flex-1 bg-white hover:bg-slate-100 text-slate-700 font-bold py-1.5 px-2 rounded text-[10px] font-mono border border-slate-300"
                            >
                              APROVAR 2ª ({tot2} pçs)
                            </button>
                          </div>
                          
                          <button
                            onClick={() => executeReleaseThirdCount(selectedSection.sectorId, selectedSection.section.code)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-2 rounded text-[10px] font-mono border border-blue-800 shadow-sm"
                          >
                            LIBERAR 3ª CONTAGEM (DESEMPATE)
                          </button>
                        </div>
                      )}`;

if (source.includes(oldStr)) {
  source = source.replace(oldStr, newStr);
  fs.writeFileSync("src/components/Dashboard.tsx", source);
  console.log("Success buttons 1");
} else {
  console.log("oldStr not found for buttons");
}
