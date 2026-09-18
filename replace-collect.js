import fs from "fs";

let source = fs.readFileSync("server.ts", "utf8");

const oldBlock = `      if (section.contagens.length >= 2) {
        const c1 = section.contagens[0];
        const c2 = novaContagem;
        
        const map1: Record<string, number> = {};
        (c1.items || []).forEach((it: any) => {
          const raw = String(it.ean || it.barcode || it.codigoBarras || it.codBarras || it.sap || "").trim();
          const key = raw.replace(/^0+/, "") || raw || "ITEM";
          map1[key] = (map1[key] || 0) + Math.max(0, Number(it.quantidade) || 0);
        });
        
        const map2: Record<string, number> = {};
        (c2.items || []).forEach((it: any) => {
          const raw = String(it.ean || it.barcode || it.codigoBarras || it.codBarras || it.sap || "").trim();
          const key = raw.replace(/^0+/, "") || raw || "ITEM";
          map2[key] = (map2[key] || 0) + Math.max(0, Number(it.quantidade) || 0);
        });
        
        const total1 = Object.values(map1).reduce((a, b) => a + b, 0);
        const total2 = Object.values(map2).reduce((a, b) => a + b, 0);
        
        let isMatch = (total1 === total2 && total1 > 0);
        if (isMatch) {
          const keys1 = Object.keys(map1);
          const keys2 = Object.keys(map2);
          if (keys1.length !== keys2.length) {
            isMatch = false;
          } else {
            for (const key of keys1) {
              if (map1[key] !== map2[key]) {
                isMatch = false;
                break;
              }
            }
          }
        }
        
        section.status = isMatch ? "CONFERIDO_OK" : "DIVERGENTE";
      } else {
        section.status = "CONTADO";
      }`;

const newBlock = `      if (section.contagens.length >= 2) {
        const cLatest = novaContagem;
        const mapLatest: Record<string, number> = {};
        (cLatest.items || []).forEach((it: any) => {
          const raw = String(it.ean || it.barcode || it.codigoBarras || it.codBarras || it.sap || "").trim();
          const key = raw.replace(/^0+/, "") || raw || "ITEM";
          mapLatest[key] = (mapLatest[key] || 0) + Math.max(0, Number(it.quantidade) || 0);
        });
        const totalLatest = Object.values(mapLatest).reduce((a, b) => a + b, 0);
        const keysLatest = Object.keys(mapLatest);

        let matchFound = false;

        // Compara com todas as contagens anteriores
        for (let i = 0; i < section.contagens.length - 1; i++) {
          const cPrev = section.contagens[i];
          const mapPrev: Record<string, number> = {};
          (cPrev.items || []).forEach((it: any) => {
            const raw = String(it.ean || it.barcode || it.codigoBarras || it.codBarras || it.sap || "").trim();
            const key = raw.replace(/^0+/, "") || raw || "ITEM";
            mapPrev[key] = (mapPrev[key] || 0) + Math.max(0, Number(it.quantidade) || 0);
          });
          const totalPrev = Object.values(mapPrev).reduce((a, b) => a + b, 0);
          
          let isMatch = (totalPrev === totalLatest && totalLatest > 0);
          if (isMatch) {
            const keysPrev = Object.keys(mapPrev);
            if (keysPrev.length !== keysLatest.length) {
              isMatch = false;
            } else {
              for (const key of keysPrev) {
                if (mapPrev[key] !== mapLatest[key]) {
                  isMatch = false;
                  break;
                }
              }
            }
          }

          if (isMatch) {
            matchFound = true;
            break; // Se achou um match, não precisa olhar os outros
          }
        }
        
        section.status = matchFound ? "CONFERIDO_OK" : "DIVERGENTE";
      } else {
        section.status = "CONTADO";
      }`;

if (source.includes(oldBlock)) {
  source = source.replace(oldBlock, newBlock);
  fs.writeFileSync("server.ts", source);
  console.log("Success");
} else {
  console.log("Block not found");
}
