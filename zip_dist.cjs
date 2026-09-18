const fs = require('fs');
const archiver = require('archiver');

const output = fs.createWriteStream('dist_v2_2.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function() {
  console.log('Zip file created successfully: dist_v2_2.zip (' + archive.pointer() + ' bytes)');
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// Add the dist folder
archive.directory('dist/', 'dist');

// Add the server.js file
archive.file('server.js', { name: 'server.js' });

archive.finalize();
