const fs = require('fs');
let code = fs.readFileSync('src/components/InventoriesPanel.tsx', 'utf8');

// Replace table start
const oldTableStart = `      {/* THE TABULAR LIST */}
      <div className="w-full px-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 tracking-wide">
              <th className="py-4 px-2 w-[28%] font-normal">Nome</th>
              <th className="py-4 px-2 w-[14%] font-normal">Filial</th>
              <th className="py-4 px-2 text-center w-[14%] font-normal">Data de execução</th>
              <th className="py-4 px-2 text-center w-[16%] font-normal">Editado em</th>
              <th className="py-4 px-2 text-center w-[14%] font-normal">Status</th>
              <th className="py-4 px-2 text-center w-[14%] font-normal"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-600">`;

const newTableStart = `      {/* THE TABULAR LIST */}
      <div className="w-full px-6 pb-8">
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/80 text-xs font-semibold text-slate-700 tracking-wide">
                <th className="py-3.5 px-4 w-[28%]">Nome</th>
                <th className="py-3.5 px-3 w-[14%]">Filial</th>
                <th className="py-3.5 px-3 text-center w-[14%]">Data de execução</th>
                <th className="py-3.5 px-3 text-center w-[16%]">Editado em</th>
                <th className="py-3.5 px-3 text-center w-[14%]">Status</th>
                <th className="py-3.5 px-4 text-center w-[14%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/75 text-xs text-slate-600">`;

code = code.replace(oldTableStart, newTableStart);

// Replace mapping and tr
const oldMap = `filteredInventories.map((inv) => {`;
const newMap = `filteredInventories.map((inv, index) => {`;
code = code.replace(oldMap, newMap);

const oldTr = `                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">`;

const newTr = `                const isEven = index % 2 === 0;
                return (
                  <tr 
                    key={inv.id} 
                    className={\`transition-colors \${isEven ? "bg-white" : "bg-[#f8fafc]"} hover:bg-sky-50/60\`}
                  >`;

code = code.replace(oldTr, newTr);

// Update padding in tds
code = code.replace(
  `                    {/* NOME */}\n                    <td className="py-4 px-2">\n                      <span className="uppercase text-slate-700 font-medium">`,
  `                    {/* NOME */}\n                    <td className="py-3.5 px-4">\n                      <span className="uppercase text-slate-800 font-semibold tracking-tight">`
);

code = code.replace(
  `                    {/* FILIAL */}\n                    <td className="py-4 px-2">\n                      <span className="uppercase text-slate-600">`,
  `                    {/* FILIAL */}\n                    <td className="py-3.5 px-3">\n                      <span className="uppercase text-slate-600 font-medium">`
);

code = code.replace(
  `                    {/* DATA DE EXECUÇÃO */}\n                    <td className="py-4 px-2 text-center">`,
  `                    {/* DATA DE EXECUÇÃO */}\n                    <td className="py-3.5 px-3 text-center">`
);

code = code.replace(
  `                    {/* EDITADO EM */}\n                    <td className="py-4 px-2 text-center">`,
  `                    {/* EDITADO EM */}\n                    <td className="py-3.5 px-3 text-center">`
);

code = code.replace(
  `                    {/* STATUS */}\n                    <td className="py-4 px-2">`,
  `                    {/* STATUS */}\n                    <td className="py-3.5 px-3">`
);

code = code.replace(
  `                    {/* OPÇÕES */}\n                    <td className="py-4 px-2 relative">`,
  `                    {/* OPÇÕES */}\n                    <td className="py-3.5 px-4 relative">`
);

// Close the extra div at the end of the table
const oldTableEnd = `          </tbody>
        </table>
      </div>`;

const newTableEnd = `          </tbody>
          </table>
        </div>
      </div>`;

code = code.replace(oldTableEnd, newTableEnd);

fs.writeFileSync('src/components/InventoriesPanel.tsx', code);
console.log('Zebra table successfully patched!');
