const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const idRegex = /id=["']([^"']+)["']/g;
const ids = [];
let m;
while ((m = idRegex.exec(html)) !== null) ids.push(m[1]);
console.log('Total IDs in HTML:', ids.length);
console.log('IDs containing btn/date/sync/chart/whoop/kpi/val/tab:');
const filtered = ids.filter(id =>
  ['btn', 'date', 'sync', 'chart', 'whoop', 'kpi', 'val', 'tab', 'modal', 'card'].some(k => id.toLowerCase().includes(k))
);
console.log(filtered.join(', '));
