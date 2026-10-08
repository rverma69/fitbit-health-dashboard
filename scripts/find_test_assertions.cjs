const fs = require('fs');
const path = require('path');

const scripts = fs.readdirSync('scripts').filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
for (const script of scripts) {
  const content = fs.readFileSync(path.join('scripts', script), 'utf8');
  if (content.includes('app.js') || content.includes('index.html') || content.includes('styles.css')) {
    console.log(`=== In ${script} ===`);
    const lines = content.split('\n');
    lines.forEach((l, i) => {
      if (l.includes('app.js') || l.includes('assert') && (l.includes('js.') || l.includes('html.') || l.includes('css.'))) {
        console.log(`  L${i+1}: ${l.trim()}`);
      }
    });
  }
}
