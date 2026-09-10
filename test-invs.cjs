const fs = require('fs');
fetch('http://localhost:3000/api/inventories').then(r => r.json()).then(data => {
  data.forEach(inv => {
    console.log(inv.id, inv.nome, 'Products:', inv.products?.length || 0);
  });
});
