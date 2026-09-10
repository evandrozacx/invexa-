fetch('http://localhost:3000/api/inventories/inv_1788351812007')
  .then(r => r.json())
  .then(data => {
    const section = data.sectors[0].sections.find(s => s.code === '0002');
    console.log(JSON.stringify(section, null, 2));
  });
