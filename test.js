import fs from "fs";
let source = fs.readFileSync("src/components/Dashboard.tsx", "utf8");

const oldStr = `  // Force mark section as CONFERIDO_OK
  async function executeForceConferidoOk(sectorId: string, sectionCode: string) {`;
console.log(source.indexOf(oldStr));
