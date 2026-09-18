const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regexWrite = /const fullBaseData = \{\n\s+\.\.\.baseSummary,\n\s+products: cleaned\n\s+\};\n\s+\/\/ Save final combined base file to disk\n\s+await fs\.writeFile\(path\.join\(BASES_DIR, \`\$\{baseId\}\.json\`\), JSON\.stringify\(fullBaseData\), "utf8"\);/g;

const replacement = `// Use streaming to avoid JSON.stringify OOM on huge files
    const outPath = path.join(BASES_DIR, \`\${baseId}.json\`);
    await new Promise((resolve, reject) => {
      const writeStream = fsSync.createWriteStream(outPath, "utf8");
      writeStream.on("error", reject);
      writeStream.on("finish", resolve);
      
      const summaryStr = JSON.stringify(baseSummary);
      // Remove trailing } and add products array start
      writeStream.write(summaryStr.slice(0, -1) + ',"products":[');
      
      let first = true;
      let i = 0;
      
      function writeNext() {
        let ok = true;
        while (i < cleaned.length && ok) {
          if (!first) {
            ok = writeStream.write("," + JSON.stringify(cleaned[i]));
          } else {
            ok = writeStream.write(JSON.stringify(cleaned[i]));
            first = false;
          }
          i++;
        }
        if (i < cleaned.length) {
          // Had to stop early! Write some more once it drains
          writeStream.once('drain', writeNext);
        } else {
          writeStream.write("]}");
          writeStream.end();
        }
      }
      writeNext();
    });
`;

code = code.replace(regexWrite, replacement);
fs.writeFileSync('server.ts', code);
