const fs = require('fs');
let code = fs.readFileSync('src/components/ProductAddressImport.tsx', 'utf8');

code = code.replace(/const maxPolls = 60; \/\/ Up to 2\.5 minutes/g, 'const maxPolls = 240; // Up to 10 minutes');

fs.writeFileSync('src/components/ProductAddressImport.tsx', code);
