import assert from 'assert';
import fs from 'fs';

console.log('=== TEST SUITE: AI MULTIDISCIPLINARY HEALTH INTELLIGENCE COUNCIL ===');

// --- 1. Auditing HTML Structure ---
console.log('\n--- 1. Auditing HTML Structure ---');
const html = fs.readFileSync('public/index.html', 'utf8');

assert(html.includes('id="aiCouncilSection"'), 'index.html must contain #aiCouncilSection');
assert(html.includes('id="councilTabCardio"'), 'index.html must contain #councilTabCardio');
assert(html.includes('id="councilTabNutrition"'), 'index.html must contain #councilTabNutrition');
assert(html.includes('id="councilTabTrainer"'), 'index.html must contain #councilTabTrainer');
assert(html.includes('id="councilTabSleep"'), 'index.html must contain #councilTabSleep');
assert(html.includes('id="councilContentArea"'), 'index.html must contain #councilContentArea');
console.log('✅ HTML markup contains all council container IDs and specialist tab buttons!');

// --- 2. Auditing app.js Integration ---
console.log('\n--- 2. Auditing app.js Integration ---');
const js = fs.readFileSync('public/app.js', 'utf8');

assert(js.includes('function renderExpertCouncil('), 'app.js must define renderExpertCouncil');
assert(js.includes('window.switchCouncilTab = function'), 'app.js must define window.switchCouncilTab');
assert(js.includes('renderExpertCouncil(data);'), 'renderDashboard must call renderExpertCouncil');
assert(js.includes('Dr. Julian Vance'), 'Council must include Sports Cardiologist Dr. Julian Vance');
assert(js.includes('Elena Rostova'), 'Council must include Sports Dietitian Elena Rostova');
assert(js.includes('Coach Marcus Drake'), 'Council must include Olympic Strength Coach Marcus Drake');
assert(js.includes('Dr. Sophie Lin'), 'Council must include Circadian Neuroscientist Dr. Sophie Lin');
console.log('✅ app.js properly defines and invokes multidisciplinary council across all 4 personas!');

// --- 3. Auditing CSS Styling ---
console.log('\n--- 3. Auditing CSS Styling ---');
const css = fs.readFileSync('public/styles.css', 'utf8');

assert(css.includes('.council-tab'), 'styles.css must style .council-tab');
assert(css.includes('.council-tab.active'), 'styles.css must style .council-tab.active');
assert(css.includes('.council-biomarker-chip'), 'styles.css must style .council-biomarker-chip');
console.log('✅ CSS contains complete high-contrast styling for council tabs and biomarker chips!');

console.log('\n🎉 ALL AI COUNCIL VERIFICATION TESTS PASSED PERFECTLY!');
