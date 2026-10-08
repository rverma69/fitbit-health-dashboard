import assert from 'assert';
import fs from 'fs';

console.log('=== TEST SUITE: BIOLOGICAL AGE & ZERO-HALO AUDIT ===');

// --- 1. Audit Absence of Halos in CSS, HTML, and JS ---
console.log('\n--- 1. Auditing Complete Removal of Halo Effects ---');

const css = fs.readFileSync('public/styles.css', 'utf8');
const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/app.js', 'utf8');

// Check CSS
assert(!css.includes('--green-glow:rgba'), 'CSS must not define diffuse green glow rgba');
assert(!css.includes('--cyan-glow: rgba'), 'CSS must not define diffuse cyan glow rgba');
assert(!css.includes('--red-glow:  rgba'), 'CSS must not define diffuse red glow rgba');
assert(!css.includes('box-shadow: 0 0 12px rgba(0,200,255'), 'Strain fill must not have blurry 12px cyan halo');
assert(!css.includes('.dot-green  { background: var(--green); box-shadow: 0 0'), 'Green dot must not have glow shadow');
assert(!css.includes('.dot-red    { background: var(--red);   box-shadow: 0 0'), 'Red dot must not have glow shadow');
assert(!css.includes('.dot-cyan   { background: var(--cyan);  box-shadow: 0 0'), 'Cyan dot must not have glow shadow');
assert(css.includes('body::before {\n  display: none;\n}'), 'body::before radial-gradient haze must be disabled');
console.log('✅ public/styles.css verified: 0 glow variables, 0 dot halos, 0 background radial haze!');

// Check HTML
assert(!html.includes('blur-[6px]'), 'index.html must not contain ambient blur-[6px] halo');
assert(!html.includes('logoApexGlow'), 'index.html must not contain logoApexGlow filter');
assert(!html.includes('filter="url(#whoopGlowGreen)"'), 'Recovery dial must not have whoopGlowGreen filter');
assert(!html.includes('whoopGlowYellow'), 'index.html must not define neon whoopGlowYellow filter');
assert(!html.includes('capShadow'), 'index.html must not contain capShadow blurry filter');
assert(!html.includes('feDropShadow'), 'index.html must not contain feDropShadow blur filters');
assert(html.includes('stroke="#000000" stroke-width="1.5"'), 'Overlap caps must have razor-sharp physical vector strokes');
assert(!html.includes('shadow-[0_0_6px_#f59e0b]'), 'Demo badge dot must not have glowing box shadow');
assert(!html.includes('shadow-[0_0_6px_#10b981]'), 'Live badge dot must not have glowing box shadow');
assert(!html.includes('box-shadow:0 0 10px rgba(29,185,84,0.5)'), 'Body battery fill must not have glowing box-shadow');
console.log('✅ public/index.html verified: 0 neon filters, 0 blur halos, crisp physical OLED elements!');

// Check JS
assert(!js.includes("recoveryRing.setAttribute('filter', 'url(#whoopGlowGreen)')"), 'app.js must not set whoopGlowGreen filter');
assert(!js.includes("bbBar.style.boxShadow = '0 0 10px"), 'app.js must not apply 10px glowing box shadow to bbBar');
console.log('✅ public/app.js verified: 0 dynamic glow filter injection, 0 battery bar glow!');

// --- 2. Auditing Biological Age DOM IDs ---
console.log('\n--- 2. Auditing Biological Age DOM IDs in HTML & JS ---');

const expectedBioIds = [
  'bioAgeVal',
  'bioChronologicalVal',
  'bioAgeDeltaBadge',
  'bioPaceVal',
  'bioPaceStatus',
  'bioPacePct',
  'bioPaceBar',
  'bioCohortBadge',
  'bioVascularSummary',
  'bioPaceDaysSummary',
  'bioAutonomicVal',
  'bioAutonomicDelta',
  'bioAutonomicStatus',
  'bioCardioVal',
  'bioCardioDelta',
  'bioCardioStatus',
  'bioCellularVal',
  'bioCellularDelta',
  'bioCellularStatus',
  'bioFitnessVal',
  'bioFitnessDelta',
  'bioFitnessStatus',
  'bioLongevitySummary'
];

for (const id of expectedBioIds) {
  assert(html.includes(`id="${id}"`), `index.html must contain id="${id}"`);
  assert(js.includes(`'${id}'`) || js.includes(`"${id}"`), `app.js must reference id="${id}"`);
}
console.log(`✅ All ${expectedBioIds.length} Biological Age DOM IDs exist and are wired up in app.js!`);

// --- 3. Live Server Endpoint Verification for 2026-10-06 ---
console.log('\n--- 3. Testing Live Server Biological Age Output (2026-10-06) ---');

const liveRes = await fetch('http://127.0.0.1:3000/api/dashboard-data?date=2026-10-06');
assert(liveRes.ok, 'Live server request must return 200');
const liveData = await liveRes.json();

assert(liveData.biologicalAge, 'data.biologicalAge must exist');
const bio = liveData.biologicalAge;

assert.strictEqual(bio.status, 'Measured');
assert(typeof bio.chronologicalAge === 'number', 'chronologicalAge must be a number');
assert(typeof bio.biologicalAge === 'number' && bio.biologicalAge > 15 && bio.biologicalAge < 100, 'Biological Age must be between 15 and 100');
assert(typeof bio.ageDelta === 'number', 'Age Delta must be a number');
assert(typeof bio.ageDeltaFormatted === 'string', 'ageDeltaFormatted must be string');
assert(typeof bio.paceOfAging === 'number' && bio.paceOfAging > 0 && bio.paceOfAging < 3.0, 'Pace of aging must be realistic');
assert(typeof bio.paceOfAgingFormatted === 'string', 'paceOfAgingFormatted must be string');
assert(typeof bio.paceOfAgingPct === 'number', 'paceOfAgingPct must be number');
assert(typeof bio.paceStatus === 'string', 'paceStatus must be string');

// Pillars
assert(bio.pillars, 'Pillars must exist');
assert.strictEqual(bio.pillars.autonomic.biomarker, 'HRV RMSSD');
assert(typeof bio.pillars.autonomic.value === 'string');
assert(typeof bio.pillars.autonomic.deltaYears === 'number');

assert.strictEqual(bio.pillars.cardiovascular.biomarker, 'Resting Heart Rate');
assert(typeof bio.pillars.cardiovascular.value === 'string');
assert(typeof bio.pillars.cardiovascular.deltaYears === 'number');

assert.strictEqual(bio.pillars.cellularRestoration.biomarker, 'Sleep Architecture & SWS');
assert(typeof bio.pillars.cellularRestoration.value === 'string');
assert(typeof bio.pillars.cellularRestoration.deltaYears === 'number');

assert.strictEqual(bio.pillars.cardiorespiratory.biomarker, 'Daily AZM & Strain');
assert(typeof bio.pillars.cardiorespiratory.value === 'string');
assert(typeof bio.pillars.cardiorespiratory.deltaYears === 'number');

// WHOOP backward compatibility
assert(liveData.whoop.biologicalAge, 'data.whoop.biologicalAge must exist');
assert(typeof liveData.whoop.biologicalAge.biologicalAge === 'number');

console.log('✅ Live server output matches scientific biological age & pace of aging specifications!');

// --- 4. Historical Date Unrecorded State (2026-10-01) ---
console.log('\n--- 4. Testing Historical Date Graceful Degradation (2026-10-01) ---');

const oldRes = await fetch('http://127.0.0.1:3000/api/dashboard-data?date=2026-10-01');
assert(oldRes.ok, 'Old date query must return 200');
const oldData = await oldRes.json();

assert(oldData.biologicalAge, 'oldData.biologicalAge must exist');
assert.strictEqual(oldData.biologicalAge.status, 'No data');
assert.strictEqual(oldData.biologicalAge.biologicalAge, '--');
assert.strictEqual(oldData.biologicalAge.ageDelta, '--');
assert.strictEqual(oldData.biologicalAge.paceOfAging, '--');
assert.strictEqual(oldData.biologicalAge.pillars.autonomic.value, '--');
assert.strictEqual(oldData.biologicalAge.pillars.autonomic.deltaYears, '--');
assert.strictEqual(oldData.biologicalAge.pillars.autonomic.status, 'No data');
assert.strictEqual(oldData.biologicalAge.pillars.cardiovascular.value, '--');
assert.strictEqual(oldData.biologicalAge.pillars.cardiovascular.deltaYears, '--');
assert.strictEqual(oldData.biologicalAge.pillars.cardiovascular.status, 'No data');
assert.strictEqual(oldData.biologicalAge.pillars.cellularRestoration.value, '--');
assert.strictEqual(oldData.biologicalAge.pillars.cellularRestoration.deltaYears, '--');
assert.strictEqual(oldData.biologicalAge.pillars.cellularRestoration.status, 'No data');
assert.strictEqual(oldData.biologicalAge.pillars.cardiorespiratory.value, '--');
assert.strictEqual(oldData.biologicalAge.pillars.cardiorespiratory.deltaYears, '--');
assert.strictEqual(oldData.biologicalAge.pillars.cardiorespiratory.status, 'No data');

console.log('✅ Historical unrecorded date gracefully degrades to -- without error across all 4 pillars!');

console.log('\n🎉 ALL BIOLOGICAL AGE & ZERO-HALO TESTS PASSED PERFECTLY!');
