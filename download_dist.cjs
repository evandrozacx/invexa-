const fs = require('fs');
const path = require('path');

if (!fs.existsSync('dist_export')) fs.mkdirSync('dist_export');
if (!fs.existsSync('dist_export/assets')) fs.mkdirSync('dist_export/assets');

const cssFiles = fs.readdirSync('dist/assets').filter(f => f.endsWith('.css'));
const jsFiles = fs.readdirSync('dist/assets').filter(f => f.endsWith('.js'));

fs.copyFileSync('dist/server.cjs', 'dist_export/server.cjs');
fs.copyFileSync('dist/index.html', 'dist_export/index.html');
fs.copyFileSync('dist/sw.js', 'dist_export/sw.js');
const workboxFile = fs.readdirSync('dist').find(f => f.startsWith('workbox-') && f.endsWith('.js'));
if (workboxFile) fs.copyFileSync('dist/' + workboxFile, 'dist_export/' + workboxFile);

if (cssFiles.length > 0) fs.copyFileSync('dist/assets/' + cssFiles[0], 'dist_export/assets/' + cssFiles[0]);
if (jsFiles.length > 0) fs.copyFileSync('dist/assets/' + jsFiles[0], 'dist_export/assets/' + jsFiles[0]);

let reconstructScript = "const fs = require('fs');\nconst path = require('path');\nfunction write(filename, base64) {\n  const filepath = path.join(__dirname, 'dist', filename);\n  const dir = path.dirname(filepath);\n  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });\n  fs.writeFileSync(filepath, Buffer.from(base64, 'base64'));\n}\nconsole.log('Criando arquivos na pasta dist...');\n";

function addFileToScript(srcFilename, destFilename) {
  const content = fs.readFileSync('dist_export/' + srcFilename);
  const base64 = content.toString('base64');
  reconstructScript += "write('" + destFilename + "', '" + base64 + "');\n";
}

addFileToScript('server.cjs', 'server.cjs');
addFileToScript('index.html', 'index.html');
addFileToScript('sw.js', 'sw.js');
if (workboxFile) addFileToScript(workboxFile, workboxFile);
if (cssFiles.length > 0) addFileToScript('assets/' + cssFiles[0], 'assets/' + cssFiles[0]);
if (jsFiles.length > 0) addFileToScript('assets/' + jsFiles[0], 'assets/' + jsFiles[0]);

reconstructScript += "console.log('✅ Arquivos extraidos com sucesso na pasta dist!');\n";

fs.writeFileSync('invexa_update.cjs', reconstructScript);
console.log('invexa_update.cjs created successfully');
