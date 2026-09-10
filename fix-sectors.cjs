const fs = require('fs');

const file = 'src/lib/apiInterceptor.ts';
let content = fs.readFileSync(file, 'utf8');

const targetBlockStart = 'if (url.match(/^\\/api\\/inventories\\/[^\\/]+\\/sectors$/) && method === "POST") {';

const replacement = `      if (url.match(/^\\/api\\/inventories\\/[^\\/]+\\/sectors$/) && method === "POST") {
        const id = url.split("/")[3];
        const { action, sectorId, nome, nomeStart, numeroStart, numeroEnd, rangeStart, rangeEnd } = body;
        const snap = await getDoc(doc(db, "inventories", id));
        if (!snap.exists()) return createResponse({ error: "Not found" }, 404);
        const inv = snap.data() as Inventory;

        if (action === "delete_sector") {
          inv.sectors = inv.sectors.filter((s: any) => s.id !== sectorId);
        } else if (action === "save_sector" || action === "rename_sector") {
          if (sectorId) {
            const existing = inv.sectors.find((s: any) => s.id === sectorId);
            if (existing) {
              const newName = (nome || nomeStart || "").trim().toUpperCase();
              if (newName) existing.nome = newName;
              if (numeroStart !== undefined && numeroStart !== "") existing.numero = numeroStart;
            }
          } else {
            const nStart = numeroStart ? parseInt(numeroStart) : null;
            const nEnd = numeroEnd ? parseInt(numeroEnd) : nStart;
            const sStartNum = parseInt(rangeStart) || 0;
            const sEndNum = parseInt(rangeEnd) || 0;

            if (nStart !== null && nEnd !== null) {
              for (let n = nStart; n <= nEnd; n++) {
                const generatedSections: any[] = [];
                for (let idx = sStartNum; idx <= sEndNum; idx++) {
                  generatedSections.push({ code: String(idx).padStart(4, "0"), status: "NAO_INICIADO", contagens: [], finalizado: false });
                }
                const currentName = (nStart === nEnd) ? nomeStart : \`\${nomeStart} \${n}\`;
                inv.sectors.push({
                  id: "sec_" + Date.now() + "_" + n,
                  nome: (currentName || "").toUpperCase(),
                  numero: String(n),
                  rangeStart,
                  rangeEnd,
                  sections: generatedSections
                });
              }
            } else {
              const generatedSections: any[] = [];
              for (let idx = sStartNum; idx <= sEndNum; idx++) {
                generatedSections.push({ code: String(idx).padStart(4, "0"), status: "NAO_INICIADO", contagens: [], finalizado: false });
              }
              inv.sectors.push({
                id: "sec_" + Date.now() + "_single",
                nome: (nomeStart || "").toUpperCase(),
                numero: "",
                rangeStart,
                rangeEnd,
                sections: generatedSections
              });
            }
          }
        }
        await setDoc(doc(db, "inventories", id), inv);
        return createResponse({ success: true });
      }`;

const lines = content.split('\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('if (url.match(/^\\/api\\/inventories\\/[^\\/]+\\/sectors$/) && method === "POST") {')) {
    startIdx = i;
    // find closing brace at same indent
    let braceCount = 1;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].includes('{')) braceCount += (lines[j].match(/{/g) || []).length;
      if (lines[j].includes('}')) braceCount -= (lines[j].match(/}/g) || []).length;
      if (braceCount === 0) {
        endIdx = j;
        break;
      }
    }
    break;
  }
}

if (startIdx !== -1 && endIdx !== -1) {
  lines.splice(startIdx, endIdx - startIdx + 1, replacement);
  fs.writeFileSync(file, lines.join('\n'));
  console.log('Replaced');
} else {
  console.log('Not found');
}
