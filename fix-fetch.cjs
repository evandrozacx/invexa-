const fs = require('fs');
const glob = require('glob'); // Need to find files, or just specify manually

const files = [
  "src/components/InventoriesPanel.tsx",
  "src/components/SettingsPanel.tsx",
  "src/components/ReportsPanel.tsx",
  "src/components/CollectorSimulator.tsx",
  "src/components/ProductAddressImport.tsx",
  "src/components/Dashboard.tsx",
  "src/components/ShadowAuditMobile.tsx",
  "src/App.tsx"
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('fetch(') || content.includes('fetch (')) {
    // replace fetch with apiFetch
    content = content.replace(/\bfetch\s*\(/g, 'apiFetch(');
    
    // add import at the top
    const importPath = file === 'src/App.tsx' ? './lib/apiInterceptor' : '../lib/apiInterceptor';
    const importStmt = `import { apiFetch } from "${importPath}";\n`;
    
    // insert after first import
    const lines = content.split('\n');
    let insertIdx = 0;
    while(insertIdx < lines.length && lines[insertIdx].startsWith('import')) {
      insertIdx++;
    }
    lines.splice(insertIdx, 0, importStmt);
    
    fs.writeFileSync(file, lines.join('\n'));
    console.log('Fixed', file);
  }
}
