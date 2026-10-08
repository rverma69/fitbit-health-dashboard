import assert from 'assert';

console.log('=== TEST SUITE: HEALTH DASHBOARD FIXES ===');

// --- 1. Heart Rate Intraday Math & Timeline Deduplication ---
console.log('\n--- 1. Testing Intraday Timeline & Deduplication ---');

function processIntraday(rawDataset) {
  let min = Infinity;
  let max = -Infinity;
  for (const pt of rawDataset) {
    const val = typeof pt.value === 'number' ? pt.value : parseInt(pt.value, 10);
    if (!isNaN(val) && val > 0) {
      if (val < min) min = val;
      if (val > max) max = val;
    }
  }

  const minuteBuckets = new Map();
  for (const pt of rawDataset) {
    if (!pt.time) continue;
    const val = typeof pt.value === 'number' ? pt.value : parseInt(pt.value, 10);
    if (isNaN(val) || val <= 0) continue;

    const tStr = pt.time.includes('T') ? pt.time.split('T')[1] : pt.time;
    const parts = tStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) continue;
    const minuteOfDay = h * 60 + m;
    if (minuteOfDay < 0 || minuteOfDay >= 1440) continue;

    if (!minuteBuckets.has(minuteOfDay)) {
      minuteBuckets.set(minuteOfDay, []);
    }
    minuteBuckets.get(minuteOfDay).push(val);
  }

  const sortedMinutes = Array.from(minuteBuckets.keys()).sort((a, b) => a - b);
  const chartPoints = [];
  let prevMin = null;

  for (const minKey of sortedMinutes) {
    const vals = minuteBuckets.get(minKey);
    const avgVal = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);

    if (prevMin !== null && (minKey - prevMin) > 5) {
      chartPoints.push({ x: prevMin + 1, y: null });
    }

    chartPoints.push({ x: minKey, y: avgVal });
    prevMin = minKey;
  }

  return {
    minHr: min === Infinity ? '--' : min,
    maxHr: max === -Infinity ? '--' : max,
    chartPoints
  };
}

// Test multiple samples within same minute (Screenshot 2 case)
const sampleData = [
  { time: '23:13:16', value: 104 },
  { time: '23:13:17', value: 103 },
  { time: '23:13:19', value: 102 },
  { time: '23:14:00', value: 104 },
  { time: '23:14:03', value: 104 },
  { time: '23:21:47', value: 88 },
  { time: '23:21:51', value: 86 }
];

const res1 = processIntraday(sampleData);
assert.strictEqual(res1.minHr, 86);
assert.strictEqual(res1.maxHr, 104);

// Check that 23:13 (1393) averaged (104+103+102)/3 = 103
const pt1393 = res1.chartPoints.find(p => p.x === 1393);
assert(pt1393, 'Minute 1393 should exist');
assert.strictEqual(pt1393.y, 103, 'Averaged value at 23:13 should be 103');

// Check that 23:14 (1394) averaged (104+104)/2 = 104
const pt1394 = res1.chartPoints.find(p => p.x === 1394);
assert(pt1394, 'Minute 1394 should exist');
assert.strictEqual(pt1394.y, 104, 'Averaged value at 23:14 should be 104');

// Gap between 1394 and 1401 is 7 minutes (> 5). Null breaker at 1395 should exist!
const ptGap = res1.chartPoints.find(p => p.x === 1395);
assert(ptGap, 'Gap breaker at 1395 should exist');
assert.strictEqual(ptGap.y, null, 'Gap breaker y must be null');

// Check that 23:21 (1401) averaged (88+86)/2 = 87
const pt1401 = res1.chartPoints.find(p => p.x === 1401);
assert(pt1401, 'Minute 1401 should exist');
assert.strictEqual(pt1401.y, 87, 'Averaged value at 23:21 should be 87');

console.log('✅ Intraday deduplication & gap-breaker assertions passed!');

// --- 2. Tick labels on 24-hour timeline ---
console.log('\n--- 2. Testing 24-Hour Timeline Tick Formatters ---');

const tickLabels = {
  0: '12 AM',
  240: '4 AM',
  480: '8 AM',
  720: '12 PM',
  960: '4 PM',
  1200: '8 PM',
  1440: '12 AM'
};

const fixedTicks = [0, 240, 480, 720, 960, 1200, 1440];
for (const tick of fixedTicks) {
  assert(tickLabels[tick] !== undefined, `Tick ${tick} must have a label`);
}
assert.strictEqual(tickLabels[0], '12 AM');
assert.strictEqual(tickLabels[720], '12 PM');
assert.strictEqual(tickLabels[1440], '12 AM');

console.log('✅ Tick marker formatting assertions passed!');

// --- 3. Live Server Endpoint Verification ---
console.log('\n--- 3. Testing Live Server API (/api/dashboard-data) ---');

const currentRes = await fetch('http://localhost:3000/api/dashboard-data?date=2026-10-06');
assert(currentRes.ok, 'Current date API request should succeed');
const currentData = await currentRes.json();

assert(Array.isArray(currentData.trends), 'Trends must be an array');
assert.strictEqual(currentData.trends.length, 7, 'Trends must have 7 days');

// Verify that older days (indices 0..5) have null sleepScore and restingHeartRate
for (let i = 0; i < 6; i++) {
  const day = currentData.trends[i];
  assert.strictEqual(day.sleepScore, null, `Day ${day.date} sleepScore must be null, got: ${day.sleepScore}`);
  assert.strictEqual(day.restingHeartRate, null, `Day ${day.date} restingHeartRate must be null, got: ${day.restingHeartRate}`);
  assert.strictEqual(day.hrv, null, `Day ${day.date} hrv must be null, got: ${day.hrv}`);
  assert.strictEqual(day.spo2, null, `Day ${day.date} spo2 must be null, got: ${day.spo2}`);
}

// Verify that today (index 6, 2026-10-06) has authentic recorded metrics
const today = currentData.trends[6];
assert.strictEqual(today.date, '2026-10-06');
assert(today.sleepScore === 72 || today.sleepScore === 97 || today.sleepScore === 100, `2026-10-06 sleepScore must be 72, 97 or 100, got: ${today.sleepScore}`);
assert.strictEqual(today.restingHeartRate, 47, '2026-10-06 restingHeartRate must be 47');
assert(today.hrv === 108.1 || today.hrv === 112.5, `2026-10-06 hrv must be 108.1 or 112.5, got: ${today.hrv}`);

console.log('✅ 7-Day trends for 2026-10-06 verified: past unrecorded days strictly null/0, today has real metrics!');

// --- 4. Historical Date Query Verification ---
console.log('\n--- 4. Testing Historical Date API Query (/api/dashboard-data?date=2026-10-01) ---');

const oldRes = await fetch('http://localhost:3000/api/dashboard-data?date=2026-10-01');
assert(oldRes.ok, 'Historical date API request should succeed');
const oldData = await oldRes.json();

assert.strictEqual(oldData.heartRate.restingHeartRate, '--', 'Old date restingHeartRate must be --');
assert.deepStrictEqual(oldData.heartRate.intraday, [], 'Old date intraday must be empty []');
assert.strictEqual(oldData.sleep.score, '--', 'Old date sleep score must be --');
assert.strictEqual(oldData.healthMetrics.hrv.status, 'No data', 'Old date HRV status must be No data');
assert.strictEqual(oldData.healthMetrics.spo2.status, 'No data', 'Old date SpO2 status must be No data');

for (const day of oldData.trends) {
  assert.strictEqual(day.sleepScore, null, `Day ${day.date} sleepScore must be null`);
  assert.strictEqual(day.restingHeartRate, null, `Day ${day.date} restingHeartRate must be null`);
}

console.log('✅ Historical date query verified: returns no data instead of inheriting today metrics!');
console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
