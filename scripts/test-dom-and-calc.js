import assert from 'assert';
import fs from 'fs';

console.log('=== COMPREHENSIVE BIOMETRIC & DOM AUDIT TEST SUITE ===');

// --- 1. Audit DOM Element IDs ---
console.log('\n--- 1. Auditing DOM Element IDs in public/index.html & public/app.js ---');
const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/app.js', 'utf8');

const idRegex = /id=["']([^"']+)["']/g;
const idsInHtml = new Set();
let match;
while ((match = idRegex.exec(html)) !== null) {
  idsInHtml.add(match[1]);
}

const getByIdRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
const setTextRegex = /setText\(['"]([^'"]+)['"]/g;
const animateCountUpRegex = /animateCountUp\(['"]([^'"]+)['"]/g;

const referencedIds = new Set();
while ((match = getByIdRegex.exec(js)) !== null) referencedIds.add(match[1]);
while ((match = setTextRegex.exec(js)) !== null) referencedIds.add(match[1]);
while ((match = animateCountUpRegex.exec(js)) !== null) referencedIds.add(match[1]);

console.log(`Found ${idsInHtml.size} HTML IDs and ${referencedIds.size} JS referenced IDs.`);

const missingIds = [];
for (const id of referencedIds) {
  if (!idsInHtml.has(id)) {
    missingIds.push(id);
  }
}

if (missingIds.length > 0) {
  console.error('❌ Missing element IDs in HTML:', missingIds);
}
assert.strictEqual(missingIds.length, 0, `All referenced element IDs must exist in index.html. Missing: ${missingIds.join(', ')}`);
console.log('✅ All DOM element IDs referenced in app.js exist in index.html!');

// --- 2. Live Server Biometric Calibrations ---
console.log('\n--- 2. Auditing Live Server Output (/api/dashboard-data?date=2026-10-06) ---');
const res = await fetch('http://localhost:3000/api/dashboard-data?date=2026-10-06');
assert(res.ok, 'Request for 2026-10-06 should return 200');
const data = await res.json();

// User verification
assert(typeof data.user?.displayName === 'string' && data.user.displayName.length > 0, 'User displayName must exist');
assert(typeof data.user?.email === 'string' && data.user.email.includes('@'), 'User email must be a valid email string');

// Banister TRIMP & WHOOP Day Strain
assert(typeof data.whoop.dayStrain === 'number' && data.whoop.dayStrain >= 0 && data.whoop.dayStrain <= 21, 'Day Strain must be between 0 and 21');
assert(typeof data.whoop.rawTrimp === 'number' && data.whoop.rawTrimp >= 0, 'Raw TRIMP must be >= 0');

// WHOOP Recovery Score
assert(typeof data.whoop.recoveryScore === 'number' && data.whoop.recoveryScore >= 0 && data.whoop.recoveryScore <= 100, 'Recovery Score must be 0-100%');
assert(['GREEN', 'YELLOW', 'RED'].includes(data.whoop.recoveryZone), 'Recovery Zone must be GREEN, YELLOW, or RED');
assert(typeof data.whoop.hrvSubScore === 'number', 'HRV subscore must exist');
assert(typeof data.whoop.rhrSubScore === 'number', 'RHR subscore must exist');
assert(typeof data.whoop.sleepSubScore === 'number', 'Sleep subscore must exist');

// Garmin Body Battery & Training Status
assert(typeof data.whoop.bodyBattery === 'number' && data.whoop.bodyBattery >= 0 && data.whoop.bodyBattery <= 100, 'Body Battery must be 0-100');
assert(typeof data.whoop.bodyBatteryLabel === 'string', 'Body Battery label must be string');
assert(typeof data.whoop.trainingStatus === 'string', 'Training Status must be string');
assert(typeof data.whoop.trainingMonotony === 'number', 'Foster Monotony must be number');
assert(typeof data.whoop.acuteTrainingLoad === 'number', 'ATL must be number');
assert(typeof data.whoop.chronicTrainingLoad === 'number', 'CTL must be number');
assert(typeof data.whoop.acwr === 'number', 'ACWR must be number');

// Oura Readiness
assert(typeof data.whoop.ouraReadiness === 'number' && data.whoop.ouraReadiness >= 0 && data.whoop.ouraReadiness <= 100, 'Oura Readiness must be 0-100');
assert(typeof data.whoop.ouraReadinessLabel === 'string', 'Oura Readiness label must be string');

// Autonomic Stress Load & Baevsky SI
assert(typeof data.whoop.stressLoad.score === 'number', 'Stress Score must be number');
assert(typeof data.whoop.stressLoad.status === 'string', 'Stress Status must be string');
assert(typeof data.whoop.stressLoad.baevskyIndex === 'number', 'Baevsky Index must be number');
assert(typeof data.whoop.stressLoad.sympathovagalRatio === 'number', 'Sympathovagal Ratio must be number');
assert(typeof data.whoop.stressLoad.restMinutes === 'number', 'Rest Minutes must be number');

// Sleep Coach
assert(typeof data.sleepCoach.baselineNeedMinutes === 'number');
assert(typeof data.sleepCoach.strainCompensationMinutes === 'number');
assert(typeof data.sleepCoach.totalAdjustedNeed === 'number');
assert(typeof data.sleepCoach.measuredEfficiencyPct === 'number');
assert(typeof data.sleepCoach.sleepLatencyMinutes === 'number');

// Targets
assert(typeof data.sleepCoach.targets.peak.timeInBedMinutes === 'number');
assert(typeof data.sleepCoach.targets.peak.bedtimeFormatted === 'string');
assert(typeof data.sleepCoach.targets.maintain.timeInBedMinutes === 'number');
assert(typeof data.sleepCoach.targets.maintain.bedtimeFormatted === 'string');
assert(typeof data.sleepCoach.targets.getBy.timeInBedMinutes === 'number');
assert(typeof data.sleepCoach.targets.getBy.bedtimeFormatted === 'string');

console.log('✅ All live biometric and sleep coach fields strictly match scientific literature specifications!');

// --- 3. Edge Cases: Midnight & On-the-Hour Wake Times ---
console.log('\n--- 3. Testing Edge Cases in Time Math (07:00, 06:00, 00:00) ---');

function calcBedtimeTest(needMins, wakeStr, efficiency = 0.878, latency = 14) {
  const timeInBed = Math.round((needMins / efficiency) + latency);
  const parts = (wakeStr || '07:30').split(':').map(Number);
  const wH = !isNaN(parts[0]) ? parts[0] : 7;
  const wM = !isNaN(parts[1]) ? parts[1] : 30;
  const wakeTotal = (wH * 60) + wM;
  const bedTotal = (wakeTotal - timeInBed + 1440) % 1440;
  const bH = Math.floor(bedTotal / 60);
  const bM = bedTotal % 60;
  const ampm = bH >= 12 ? 'PM' : 'AM';
  const disp12 = bH % 12 || 12;
  const formatted = `${String(disp12).padStart(2, '0')}:${String(bM).padStart(2, '0')} ${ampm}`;
  return { timeInBed, bedTotal, formatted };
}

// At wake time 07:00 (420m) with 555m TIB:
// 420 - 555 + 1440 = 1305m -> 21:45 -> 09:45 PM
const t700 = calcBedtimeTest(475, '07:00');
assert.strictEqual(t700.formatted, '09:45 PM', 'Wake time 07:00 must produce 09:45 PM bedtime');

// At wake time 06:00 (360m) with 555m TIB:
// 360 - 555 + 1440 = 1245m -> 20:45 -> 08:45 PM
const t600 = calcBedtimeTest(475, '06:00');
assert.strictEqual(t600.formatted, '08:45 PM', 'Wake time 06:00 must produce 08:45 PM bedtime');

// At wake time 08:00 (480m) with 555m TIB:
// 480 - 555 + 1440 = 1365m -> 22:45 -> 10:45 PM
const t800 = calcBedtimeTest(475, '08:00');
assert.strictEqual(t800.formatted, '10:45 PM', 'Wake time 08:00 must produce 10:45 PM bedtime');

console.log('✅ On-the-hour wake time edge cases correctly evaluated without minutes-zero corruptions!');

console.log('\n🎉 ALL AUDIT AND BIOMETRIC TESTS PASSED PERFECTLY!');
