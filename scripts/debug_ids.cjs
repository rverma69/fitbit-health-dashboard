const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/app.js', 'utf8');

const idRegex = /id=["']([^"']+)["']/g;
const idsInHtml = new Set();
let match;
while ((match = idRegex.exec(html)) !== null) idsInHtml.add(match[1]);

const getByIdRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
const setTextRegex = /setText\(['"]([^'"]+)['"]/g;
const animateCountUpRegex = /animateCountUp\(['"]([^'"]+)['"]/g;

const missing = new Set();
while ((match = getByIdRegex.exec(js)) !== null) { if (!idsInHtml.has(match[1])) missing.add(match[1]); }
while ((match = setTextRegex.exec(js)) !== null) { if (!idsInHtml.has(match[1])) missing.add(match[1]); }
while ((match = animateCountUpRegex.exec(js)) !== null) { if (!idsInHtml.has(match[1])) missing.add(match[1]); }

console.log('Total missing IDs:', missing.size);
const lines = js.split('\n');
const missingByFunc = {};
let currentFunc = 'top-level';
lines.forEach((l, i) => {
  const fnMatch = l.match(/function\s+([a-zA-Z0-9_]+)/);
  if (fnMatch) currentFunc = fnMatch[1];
  for (const m of missing) {
    if (l.includes(m)) {
      if (!missingByFunc[currentFunc]) missingByFunc[currentFunc] = new Set();
      missingByFunc[currentFunc].add(m + ' (line ' + (i+1) + ')');
    }
  }
});
for (const [fn, items] of Object.entries(missingByFunc)) {
  console.log(`\nFunction: ${fn} (${items.size} missing):`);
  console.log([...items].slice(0, 10).join('\n'));
}
