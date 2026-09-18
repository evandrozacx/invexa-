import fs from "fs";
let source = fs.readFileSync("src/components/Dashboard.tsx", "utf8");

const oldStr = `                          <div className="flex gap-2">
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
                          </button>`;

const newStr = `                          <div className="flex gap-2">
                            <button
                              onClick={() => executeForceCount1(selectedSection.sectorId, selectedSection.section.code)}
                              className="flex-1 bg-white hover:bg-slate-100 text-slate-700 font-bold py-1.5 px-2 rounded text-[10px] font-mono border border-slate-300 shadow-sm"
                            >
                              APROVAR 1ª ({tot1} pçs)
                            </button>
                            <button
                              onClick={() => executeForceCount2(selectedSection.sectorId, selectedSection.section.code)}
                              className="flex-1 bg-white hover:bg-slate-100 text-slate-700 font-bold py-1.5 px-2 rounded text-[10px] font-mono border border-slate-300 shadow-sm"
                            >
                              APROVAR 2ª ({tot2} pçs)
                            </button>
                            {selectedSection.section.contagens.length >= 3 && (
                              <button
                                onClick={() => executeForceConferidoOk(selectedSection.sectorId, selectedSection.section.code)}
                                className="flex-1 bg-white hover:bg-slate-100 text-slate-700 font-bold py-1.5 px-2 rounded text-[10px] font-mono border border-slate-300 shadow-sm"
                              >
                                APROVAR 3ª ({(selectedSection.section.contagens[2].items || []).reduce((a: any, b: any) => a + (Number(b.quantidade) || 0), 0)} pçs)
                              </button>
                            )}
                          </div>
                          
                          {selectedSection.section.contagens.length < 3 && (
                            <button
                              onClick={() => executeReleaseThirdCount(selectedSection.sectorId, selectedSection.section.code)}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-2 rounded text-[10px] font-mono border border-blue-800 shadow-sm"
                            >
                              LIBERAR 3ª CONTAGEM (DESEMPATE)
                            </button>
                          )}`;

if (source.includes(oldStr)) {
  source = source.replace(oldStr, newStr);
  fs.writeFileSync("src/components/Dashboard.tsx", source);
  console.log("Success buttons 2");
} else {
  console.log("oldStr not found for buttons 2");
}
