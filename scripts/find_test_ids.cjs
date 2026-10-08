const fs = require('fs');
const path = require('path');
const scriptsDir = './scripts';
const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
for (const file of files) {
  const content = fs.readFileSync(path.join(scriptsDir, file), 'utf8');
  const ids = [];
  const re = /id=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    ids.push(m[1]);
  }
  if (ids.length > 0) {
    console.log(file, '->', ids);
  }
}
