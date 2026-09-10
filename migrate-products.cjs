const fs = require('fs');
fetch('http://localhost:3000/api/db').then(r => r.json()).then(async data => {
  console.log("Migration started...");
});
