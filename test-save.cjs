const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  'await setDoc(doc(db, "inventories", inv.id), inv);',
  'await setDoc(doc(db, "inventories", inv.id), inv);\n    console.log("Firebase saved successfully:", inv.id);'
);
fs.writeFileSync('server.ts', content);
