const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/app.js', 'utf8');

const idRegex = /id=["']([^"']+)["']/g;
const idsInHtml = new Set();
let match;
while ((match = idRegex.exec(html)) !== null) idsInHtml.add(match[1]);

const lines = js.split('\n');

let currentFn = 'top-level';
let fnMap = {};

lines.forEach((l, i) => {
  const fnMatch = l.match(/function\s+([a-zA-Z0-9_]+)/) || l.match(/window\.([a-zA-Z0-9_]+)\s*=/);
  if (fnMatch) {
    currentFn = fnMatch[1];
    fnMap[currentFn] = { start: i + 1, missing: [], present: [] };
  }
  const getByIdRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
  const setTextRegex = /setText\(['"]([^'"]+)['"]/g;
  const animateCountUpRegex = /animateCountUp\(['"]([^'"]+)['"]/g;
  
  while ((match = getByIdRegex.exec(l)) !== null) {
    const id = match[1];
    if (!fnMap[currentFn]) fnMap[currentFn] = { start: i + 1, missing: [], present: [] };
    if (idsInHtml.has(id)) fnMap[currentFn].present.push(id);
    else fnMap[currentFn].missing.push(id);
  }
  while ((match = setTextRegex.exec(l)) !== null) {
    const id = match[1];
    if (!fnMap[currentFn]) fnMap[currentFn] = { start: i + 1, missing: [], present: [] };
    if (idsInHtml.has(id)) fnMap[currentFn].present.push(id);
    else fnMap[currentFn].missing.push(id);
  }
  while ((match = animateCountUpRegex.exec(l)) !== null) {
    const id = match[1];
    if (!fnMap[currentFn]) fnMap[currentFn] = { start: i + 1, missing: [], present: [] };
    if (idsInHtml.has(id)) fnMap[currentFn].present.push(id);
    else fnMap[currentFn].missing.push(id);
  }
});

for (const [fn, info] of Object.entries(fnMap)) {
  if (info.missing.length > 0 || info.present.length > 0) {
    console.log(`\nFunction ${fn} (starts L${info.start}):`);
    console.log(`  Present (${info.present.length}): ${[...new Set(info.present)].join(', ')}`);
    console.log(`  MISSING (${info.missing.length}): ${[...new Set(info.missing)].join(', ')}`);
  }
}
