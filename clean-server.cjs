const fs = require('fs');

const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

// We just need to delete anything referencing 'getLocalDb', 'saveLocalDb', 'initDb', 'pool', 'useMysql'
const startInit = content.indexOf('// ----------------------------------------------------');
const endInit = content.indexOf('async function getInventory(id: string)');

if (startInit !== -1 && endInit !== -1) {
  content = content.slice(0, startInit) + content.slice(endInit);
}

fs.writeFileSync(file, content);
