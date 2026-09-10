const fs = require('fs');
const file = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Insert state
if (!content.includes('const [isSavingSector, setIsSavingSector]')) {
  content = content.replace(
    'const [rangeEnd, setRangeEnd] = useState("");',
    'const [rangeEnd, setRangeEnd] = useState("");\n  const [isSavingSector, setIsSavingSector] = useState(false);'
  );
}

// 2. Wrap handleSaveSector with isSavingSector
const targetFunc = 'async function handleSaveSector(e: React.FormEvent) {';
let newFunc = `  async function handleSaveSector(e: React.FormEvent) {
    e.preventDefault();
    if (isSavingSector) return;
    setIsSavingSector(true);
    try {
      // Se estiver editando um setor existente, apenas altera o NOME do setor
      if (editSectorId) {
        if (!sectorNameStart.trim()) return;
        const payload = {
          action: "save_sector",
          sectorId: editSectorId,
          nomeStart: sectorNameStart.trim().toUpperCase(),
          nome: sectorNameStart.trim().toUpperCase()
        };
        try {
          const res = await apiFetch(\`/api/inventories/\${inventory.id}/sectors\`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            setShowSectorModal(false);
            setEditSectorId(null);
            setSectorNameStart("");
            setSectorNameEnd("");
            setSectorNumStart("");
            setSectorNumEnd("");
            setRangeStart("");
            setRangeEnd("");
            showToast("Nome do setor atualizado com sucesso!");
            onSync();
          }
        } catch (err) {
          setModalDialog({
            title: "Erro ao Salvar",
            message: "Falha do servidor ao salvar o setor. Por favor, tente novamente.",
            onConfirm: () => setModalDialog(null)
          });
        }
        return;
      }

      // Criando NOVO setor
      if (!sectorNameStart || !rangeStart || !rangeEnd) return;
      const payload = {
        action: "save_sector",
        sectorId: undefined,
        nomeStart: sectorNameStart.toUpperCase(),
        nomeEnd: sectorNameEnd.toUpperCase() || sectorNameStart.toUpperCase(),
        numeroStart: sectorNumStart,
        numeroEnd: sectorNumEnd || sectorNumStart,
        rangeStart,
        rangeEnd
      };

      try {
        const res = await apiFetch(\`/api/inventories/\${inventory.id}/sectors\`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setShowSectorModal(false);
          setEditSectorId(null);
          setSectorNameStart("");
          setSectorNameEnd("");
          setSectorNumStart("");
          setSectorNumEnd("");
          setRangeStart("");
          setRangeEnd("");
          showToast("Novo setor e seções criados com sucesso!");
          onSync();
        }
      } catch (err) {
        setModalDialog({
          title: "Erro ao Salvar",
          message: "Falha do servidor ao salvar o setor. Por favor, tente novamente.",
          onConfirm: () => setModalDialog(null)
        });
      }
    } finally {
      setIsSavingSector(false);
    }
  }`;

let startIdx = content.indexOf(targetFunc);
if (startIdx !== -1) {
  let endIdx = content.indexOf('async function executeDeleteSector', startIdx);
  if (endIdx !== -1) {
    content = content.slice(0, startIdx) + newFunc + '\n\n  ' + content.slice(endIdx);
  }
}

// 3. Disable the submit button
// Let's find: <span>{editSectorId ? "Salvar Nome do Setor" : "Salvar Setor e Gerar Seções"}</span>
const buttonSearch = `              <span>{editSectorId ? "Salvar Nome do Setor" : "Salvar Setor e Gerar Seções"}</span>`;
const buttonReplacement = `              <span>{isSavingSector ? "Processando..." : (editSectorId ? "Salvar Nome do Setor" : "Salvar Setor e Gerar Seções")}</span>`;
content = content.replace(buttonSearch, buttonReplacement);

const buttonTagSearch = `<button
              type="submit"`;
const buttonTagReplacement = `<button
              type="submit"
              disabled={isSavingSector}`;
content = content.replace(buttonTagSearch, buttonTagReplacement);

fs.writeFileSync(file, content);
console.log('Fixed button state');
