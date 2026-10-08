import assert from 'assert';
import fs from 'fs';

console.log('=== TEST SUITE: NULL DEFAULTS, METABOLICS & ADVANCED BIOMETRICS SUITE ===\n');

// 1. Audit DOM Elements in HTML & app.js
console.log('--- 1. Auditing Element IDs in HTML & app.js ---');
const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/app.js', 'utf8');

const requiredIds = [
  // Anthropometrics & Metabolics
  'userHeightVal',
  'userHeightStatus',
  'userWeightVal',
  'userWeightStatus',
  'userBmiVal',
  'userBmiBadge',
  'userBmiCategory',
  'userBmrVal',
  'profileHeightInput',
  'profileWeightInput',
  'profileCalculatedBmi',
  'profileCalculatedAge',
  // Row 2.5: Garmin Training Status
  'trainingStatusVal',
  'trainingLoadVal',
  'trainingLoadBar',
  'acwrRatioDisplay',
  // Row 2.5: Garmin Intensity Minutes
  'intensityTotalDisplay',
  'intensityGoalProgress',
  'intensityProgressBar',
  'intensityModerate',
  'intensityVigorous',
  // Row 2.5: Oura Readiness & SRI
  'ouraReadinessVal',
  'ouraReadinessLabel',
  'ouraReadinessBar',
  'sleepRegularityVal',
  'respVarianceVal',
  'respVarianceStatus',
  // Row 2.5: Sports Science Performance Engine
  'trainingMonotonyVal',
  'monotonyStatusBadge',
  'aerobicEfficiencySuiteVal',
  'cvLoadStatusDisplay',
  // Row 2.5: Autonomic Stress Load & Baevsky SI
  'stressScoreVal',
  'stressStatusBadge',
  'stressScoreBar',
  'baevskyIndexVal',
  'sympathovagalVal',
  'stressRestStateVal'
];

for (const id of requiredIds) {
  assert(html.includes(`id="${id}"`), `HTML must contain element id="${id}"`);
  assert(js.includes(id), `app.js must reference element id="${id}"`);
}
console.log(`✅ All ${requiredIds.length} required metabolic & advanced biometric DOM elements exist in HTML and are wired in app.js!\n`);

// 2. Audit Authenticated State Live Data (2026-10-06)
console.log('--- 2. Auditing Authenticated Live Data & Calculations (2026-10-06) ---');
const liveRes = await fetch('http://localhost:3000/api/dashboard-data?date=2026-10-06');
assert(liveRes.ok, 'Live data endpoint should return 200');
const liveData = await liveRes.json();

// Anthropometrics & Mifflin-St Jeor
assert.strictEqual(liveData.user?.heightCm, 178, 'Height must be 178 cm');
assert.strictEqual(liveData.user?.weightKg, 55, 'Weight must be 55 kg');
assert.strictEqual(liveData.user?.bmi, 17.4, 'BMI must equal 17.4');
assert.strictEqual(liveData.user?.bmr, 1543, 'BMR via Mifflin-St Jeor must equal 1,543 kcal/day');
assert.strictEqual(liveData.user?.chronologicalAge, 25, 'Chronological age must equal 25');

// All 9 Advanced Biometric Algorithms Live Outputs
console.log('--- Checking All 9 Advanced Biometric Algorithms ---');
// 1. Garmin Body Battery
assert.strictEqual(liveData.whoop.bodyBattery, 82, 'Garmin Body Battery must equal 82');
assert.strictEqual(liveData.whoop.bodyBatteryLabel, 'Fully Charged');
// 2. Garmin Training Status
assert.strictEqual(liveData.whoop.trainingStatus, 'Productive', 'Garmin Training Status must equal Productive');
assert.strictEqual(liveData.whoop.acwr, 1.15, 'ACWR must equal 1.15');
// 3. Garmin Intensity Minutes
assert.strictEqual(typeof liveData.whoop.intensityMinutesModerate, 'number');
assert.strictEqual(typeof liveData.whoop.intensityMinutesVigorous, 'number');
assert.strictEqual(liveData.whoop.weeklyGoalProgress, 100);
// 4. Oura Readiness Score
assert.strictEqual(liveData.whoop.ouraReadiness, 89, 'Oura Readiness must equal 89');
assert.strictEqual(liveData.whoop.ouraReadinessLabel, 'Optimal');
// 5. Training Monotony (Foster Method)
assert.strictEqual(liveData.whoop.trainingMonotony, 1.55, 'Training Monotony must equal 1.55');
// 6. Aerobic Efficiency Index
assert(typeof liveData.whoop.aerobicEfficiency === 'number', 'Aerobic Efficiency must be a computed number');
// 7. Sleep Regularity Index (SRI)
assert.strictEqual(liveData.whoop.sleepRegularityIndex, 59, 'SRI must equal 59%');
// 8. Respiratory Rate Variance
assert(Math.abs(liveData.whoop.respiratoryRateVariance - 0.40) <= 0.05, `Respiratory rate variance (${liveData.whoop.respiratoryRateVariance}) must be ~0.40 rpm`);
// 9. Cardiovascular Load Status
assert.strictEqual(liveData.whoop.cardiovascularLoadStatus, 'Optimal Sweetspot', 'Cardiovascular load status must be Optimal Sweetspot');
// 10. Autonomic Stress Load & Baevsky SI
assert.strictEqual(liveData.whoop.stressLoad.score, 18, 'Stress Score must equal 18');
assert.strictEqual(liveData.whoop.stressLoad.baevskyIndex, 58, 'Baevsky Index must equal 58');
assert.strictEqual(liveData.whoop.stressLoad.status, 'Rest & Recovery', 'Stress Status must be Rest & Recovery');
assert.strictEqual(liveData.whoop.stressLoad.sympathovagalRatio, 0.98, 'Sympathovagal Ratio must equal 0.98');
assert.strictEqual(liveData.whoop.stressLoad.restMinutes, 1065, 'Rest Minutes must equal 1065');
assert.strictEqual(liveData.whoop.stressLoad.lowStressMinutes, 270, 'Low Stress Minutes must equal 270');
assert.strictEqual(liveData.whoop.stressLoad.mediumStressMinutes, 75, 'Medium Stress Minutes must equal 75');
assert.strictEqual(liveData.whoop.stressLoad.highStressMinutes, 30, 'High Stress Minutes must equal 30');

console.log('✅ Authenticated state: Height, Weight, BMI, BMR, and all 10 Biometric Algorithms verified!\n');

// 3. Audit Unauthenticated State (Zero Hardcoded Data / Null by Default)
console.log('--- 3. Auditing Unauthenticated State (Zero Fake Data / All Nulls) ---');
const originalTokens = fs.readFileSync('data/tokens.json', 'utf8');
try {
  // Clear tokens temporarily to simulate logged-out / guest state
  fs.writeFileSync('data/tokens.json', '{}');
  const unauthRes = await fetch('http://localhost:3000/api/dashboard-data?date=2026-10-06');
  assert(unauthRes.ok, 'Unauthenticated endpoint should return 200 with placeholder structure');
  const unauth = await unauthRes.json();

  assert.strictEqual(unauth.needsAuthentication, true, 'needsAuthentication must be true');
  assert.strictEqual(unauth.isDemo, false, 'isDemo must be false (no fake demo)');

  // Demographics must be strictly null
  assert.strictEqual(unauth.user.birthDate, null, 'Unauthenticated birthDate must be null');
  assert.strictEqual(unauth.user.chronologicalAge, null, 'Unauthenticated chronologicalAge must be null (no fake 25 yrs)');
  assert.strictEqual(unauth.user.heightCm, null, 'Unauthenticated heightCm must be null');
  assert.strictEqual(unauth.user.weightKg, null, 'Unauthenticated weightKg must be null');
  assert.strictEqual(unauth.user.bmi, null, 'Unauthenticated BMI must be null');
  assert.strictEqual(unauth.user.bmr, null, 'Unauthenticated BMR must be null');

  // Vitals & Sensors must be '--'
  assert.strictEqual(unauth.heartRate.restingHeartRate, '--', 'Resting HR must be --');
  assert.strictEqual(unauth.healthMetrics.hrv.dailyRmssd, '--', 'HRV must be --');
  assert.strictEqual(unauth.healthMetrics.spo2.avg, '--', 'SpO2 must be --');
  assert.strictEqual(unauth.healthMetrics.breathingRate.rpm, '--', 'Breath rate must be --');

  // Biological Age must be '--' and 'No data'
  assert.strictEqual(unauth.biologicalAge.biologicalAge, '--', 'Biological age must be --');
  assert.strictEqual(unauth.biologicalAge.status, 'No data', 'Biological age status must be No data');
  assert.strictEqual(unauth.biologicalAge.chronologicalAge, null, 'Biological age chrono must be null');

  // Autonomic Stress Load must be null
  assert.strictEqual(unauth.stressLoad, null, 'Unauthenticated root stressLoad must be null');
  assert.strictEqual(unauth.whoop.stressLoad, null, 'Unauthenticated whoop.stressLoad must be null');

  // All 10 Biometric Algorithms must be clean null/-- placeholders
  assert.strictEqual(unauth.whoop.dayStrain, '--', 'Day Strain must be --');
  assert.strictEqual(unauth.whoop.recoveryScore, '--', 'Recovery Score must be --');
  assert.strictEqual(unauth.whoop.bodyBattery, '--', 'Body Battery must be --');
  assert.strictEqual(unauth.whoop.trainingStatus, '--', 'Training Status must be --');
  assert.strictEqual(unauth.whoop.ouraReadiness, '--', 'Oura Readiness must be --');
  assert.strictEqual(unauth.whoop.aerobicEfficiency, '--', 'Aerobic Efficiency must be --');
  assert.strictEqual(unauth.whoop.sleepRegularityIndex, '--', 'SRI must be --');
  assert.strictEqual(unauth.whoop.trainingMonotony, '--', 'Training Monotony must be --');
  assert.strictEqual(unauth.whoop.respiratoryRateVariance, '--', 'Resp variance must be --');
  assert.strictEqual(unauth.whoop.cardiovascularLoadStatus, 'No Data', 'CV load status must be No Data');

  console.log('✅ Unauthenticated state verified: 0 hardcoded numbers, all values strictly null or "--"!');
} finally {
  // Always restore original tokens
  fs.writeFileSync('data/tokens.json', originalTokens);
}

console.log('\n🎉 ALL NULL DEFAULTS & BIOMETRICS TESTS PASSED PERFECTLY!');
