import fs from "fs";
let source = fs.readFileSync("src/components/Dashboard.tsx", "utf8");

const oldStr = `  // Force mark section as CONFERIDO_OK
  async function executeForceConferidoOk(sectorId: string, sectionCode: string) {
    try {
      const res = await fetch(\`/api/inventories/\${inventory.id}/manage-section\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId, sectionCode, action: "conferido_ok" })
      });
      if (res.ok) {
        setSelectedSection(null);
        onSync();
      }
    } catch(e) {}
  }`;

const newStr = oldStr + `

  async function executeForceCount1(sectorId: string, sectionCode: string) {
    try {
      const res = await fetch(\`/api/inventories/\${inventory.id}/manage-section\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId, sectionCode, action: "force_count_1" })
      });
      if (res.ok) {
        setSelectedSection(null);
        onSync();
      }
    } catch(e) {}
  }

  async function executeForceCount2(sectorId: string, sectionCode: string) {
    try {
      const res = await fetch(\`/api/inventories/\${inventory.id}/manage-section\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId, sectionCode, action: "force_count_2" })
      });
      if (res.ok) {
        setSelectedSection(null);
        onSync();
      }
    } catch(e) {}
  }

  async function executeReleaseThirdCount(sectorId: string, sectionCode: string) {
    try {
      const res = await fetch(\`/api/inventories/\${inventory.id}/manage-section\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId, sectionCode, action: "release_third_count" })
      });
      if (res.ok) {
        setSelectedSection(null);
        onSync();
      }
    } catch(e) {}
  }`;

if (source.includes(oldStr)) {
  source = source.replace(oldStr, newStr);
  fs.writeFileSync("src/components/Dashboard.tsx", source);
  console.log("Success funcs 1");
} else {
  console.log("oldStr not found");
}
