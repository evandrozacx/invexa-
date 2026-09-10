const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const cleanFunc = `
// Helper to recursively remove undefined values before saving to Firestore
function stripUndefined(obj: any): any {
  if (obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined).filter(v => v !== undefined);
  } else if (obj !== null && typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = stripUndefined(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
}
`;

content = content.replace('async function saveInventory(inv: any) {', cleanFunc + '\nasync function saveInventory(inv: any) {\n  inv = stripUndefined(inv);');

content = content.replace('console.error("Firebase saveInventory error:", err);', 'console.error("Firebase saveInventory error:", err);\n    throw err;');

fs.writeFileSync('server.ts', content);
