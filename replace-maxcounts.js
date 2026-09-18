import fs from "fs";

let source = fs.readFileSync("server.ts", "utf8");

const oldStr = `      const isMaxCountsReached = compara 
        ? (section.contagens && section.contagens.length >= 2) 
        : (section.finalizado && section.contagens && section.contagens.length > 0);`;

const newStr = `      const isMaxCountsReached = compara 
        ? (section.contagens && section.contagens.length >= 2 && section.finalizado) 
        : (section.finalizado && section.contagens && section.contagens.length > 0);`;

if (source.includes(oldStr)) {
  source = source.replace(oldStr, newStr);
  fs.writeFileSync("server.ts", source);
  console.log("Success maxcounts");
} else {
  console.log("oldStr not found for maxcounts");
}
