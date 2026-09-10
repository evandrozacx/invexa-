const fs = require('fs');
const file = 'src/lib/apiInterceptor.ts';
let content = fs.readFileSync(file, 'utf8');

const replacement = `      if (url.match(/^\\/api\\/inventories\\/[^\\/]+\\/manage-section$/)) {
        const id = url.split("/")[3];
        const { sectorId, sectionCode, sectionCodes, action, items, operatorId, operatorName } = body;
        const snap = await getDoc(doc(db, "inventories", id));
        if (!snap.exists()) return createResponse({ error: "Not found" }, 404);
        const inv = snap.data() as Inventory;
        const sector = inv.sectors.find((s: any) => s.id === sectorId);
        if (!sector) return createResponse({ error: "Sector not found" }, 404);

        if (action === "delete_multiple" || (action === "delete" && Array.isArray(sectionCodes))) {
          const targets = new Set((sectionCodes || []).map((c: any) => String(c).toUpperCase().trim()));
          sector.sections = sector.sections.filter((s: any) => !targets.has(String(s.code).toUpperCase().trim()));
        } else if (action === "add_multiple" || (action === "add" && Array.isArray(sectionCodes))) {
          const existingCodes = new Set(sector.sections.map((s: any) => String(s.code).toUpperCase().trim()));
          const codesToAdd = (sectionCodes || []).map((c: any) => String(c).trim()).filter(Boolean);
          codesToAdd.forEach((code: any) => {
            const normalized = code.padStart(4, "0");
            if (!existingCodes.has(normalized.toUpperCase()) && !existingCodes.has(code.toUpperCase())) {
              sector.sections.push({
                code: normalized,
                status: "NAO_INICIADO",
                contagens: [],
                finalizado: false
              });
              existingCodes.add(normalized.toUpperCase());
            }
          });
          sector.sections.sort((a: any, b: any) => {
            const numA = parseInt(a.code, 10);
            const numB = parseInt(b.code, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return String(a.code).localeCompare(String(b.code));
          });
        } else {
          let section = sector.sections.find((s: any) => s.code === sectionCode);
          if (!section && action !== "add") return createResponse({ error: "Section not found" }, 404);

          if (action === "clear" || action === "clear_all_counts") {
            if (section) {
              section.contagens = [];
              section.status = "NAO_INICIADO";
              section.finalizado = false;
              if (section.shadowAudit) section.shadowAudit = undefined;
            }
          } else if (action === "delete") {
            sector.sections = sector.sections.filter((s: any) => s.code !== sectionCode);
          } else if (action === "reopen") {
            if (section) section.finalizado = false;
          } else if (action === "conferido_ok") {
            if (section) section.status = "CONFERIDO_OK";
          } else if (action === "clear_second_count") {
            if (section && section.contagens.length > 1) {
              section.contagens = [section.contagens[0]];
              section.status = "CONTADO";
              section.finalizado = false;
            }
          } else if (action === "save_items") {
            if (section) {
              const manualContagem = {
                operatorId: operatorId || "coordenador",
                operatorName: operatorName || "COORDENADOR",
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                transmitTime: new Date().toISOString(),
                items: items.map((it: any) => ({ ...it, quantidade: Number(it.quantidade) || 0 }))
              };
              section.contagens = [manualContagem];
              section.status = "CONTADO";
              section.finalizado = true;
            }
          } else if (action === "add") {
            if (!section) {
              sector.sections.push({ code: sectionCode, status: "NAO_INICIADO", contagens: [], finalizado: false });
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
  if (lines[i].includes('if (url.match(/^\\/api\\/inventories\\/[^\\/]+\\/manage-section$/)) {')) {
    startIdx = i;
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
  console.log('manage-section replaced successfully');
} else {
  console.log('manage-section block not found');
}
