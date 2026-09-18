const fs = require('fs');
let code = fs.readFileSync('src/components/InventoriesPanel.tsx', 'utf8');

// Insert the handler function before handleStartCreate
const handlerCode = `
  async function handleExportBackup(inv: Inventory) {
    setActiveDropdownId(null);
    try {
      triggerFeedback("success", "Gerando backup, aguarde...");
      const res = await fetch(\`/api/inventories/\${inv.id}/backup\`);
      if (!res.ok) throw new Error("Falha ao gerar backup");
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`BACKUP_\${inv.nome.replace(/\\s+/g, '_').toUpperCase()}_\${new Date().toISOString().split('T')[0]}.json\`;
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
`;
code = code.replace("  function handleStartCreate() {", handlerCode);

// Add the button in the dropdown menu
const dropdownButtonCode = `
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
`;
code = code.replace("                                <button\n                                  onClick={() => {\n                                    setActiveDropdownId(null);\n                                    handleStartEdit(inv);", dropdownButtonCode + "                                    setActiveDropdownId(null);\n                                    handleStartEdit(inv);");

fs.writeFileSync('src/components/InventoriesPanel.tsx', code);
