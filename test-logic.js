const fs = require('fs');
const source = fs.readFileSync('server.ts', 'utf8');

// Find the compare block
const match = source.match(/if \(section\.contagens\.length >= 2\) \{([\s\S]*?)else \{\s*section\.status = "DIVERGENTE";\s*\}\s*\}/);
console.log(match ? "Found match" : "No match");
