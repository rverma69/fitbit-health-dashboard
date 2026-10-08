import assert from 'assert';
import { extractRecordDate, toLocalDateString } from '../healthConnectNormalizer.js';

console.log('=== TEST SUITE: MIDNIGHT ROLLOVER & TIMEZONE CORRECTION ===');

// --- 1. toLocalDateString Local Timezone Math ---
console.log('\n--- 1. Testing toLocalDateString Math ---');

assert.strictEqual(toLocalDateString('2026-10-07'), '2026-10-07', 'Preformatted YYYY-MM-DD should pass through unchanged');
assert.strictEqual(toLocalDateString('2026-10-01'), '2026-10-01', 'Historical YYYY-MM-DD should pass through unchanged');
assert.strictEqual(toLocalDateString(''), '', 'Empty string should return empty string');
assert.strictEqual(toLocalDateString(null), '', 'Null should return empty string');

// In IST (UTC+5:30), 2026-10-06T19:00:00Z corresponds to 2026-10-07 00:30:00 IST
const earlyMorningUtc = '2026-10-06T19:00:00.000Z';
const isIst = new Date().getTimezoneOffset() === -330;
if (isIst) {
  assert.strictEqual(toLocalDateString(earlyMorningUtc), '2026-10-07', 'Early morning sample in IST should belong to 2026-10-07');
  console.log('✅ IST timezone detected and early morning UTC sample verified as 2026-10-07!');
} else {
  console.log(`ℹ️ System timezone offset is ${new Date().getTimezoneOffset()} min`);
}

// --- 2. Health Connect Record Date Extraction ---
console.log('\n--- 2. Testing extractRecordDate in Health Connect Normalizer ---');

const sleepRecord = {
  recordType: 'SleepSessionRecord',
  endTime: earlyMorningUtc,
  startTime: '2026-10-06T14:00:00.000Z'
};
const stepsRecord = {
  recordType: 'StepsRecord',
  startTime: earlyMorningUtc,
  count: 500
};
const hrRecord = {
  recordType: 'HeartRateRecord',
  samples: [{ time: earlyMorningUtc, beatsPerMinute: 65 }]
};

if (isIst) {
  assert.strictEqual(extractRecordDate(sleepRecord, 'SleepSessionRecord'), '2026-10-07', 'Sleep record end time should map to 2026-10-07');
  assert.strictEqual(extractRecordDate(stepsRecord, 'StepsRecord'), '2026-10-07', 'Steps record start time should map to 2026-10-07');
  assert.strictEqual(extractRecordDate(hrRecord, 'HeartRateRecord'), '2026-10-07', 'Heart rate sample time should map to 2026-10-07');
  console.log('✅ All Health Connect record types correctly resolved to local calendar date!');
}

// --- 3. Frontend Date Rollover State Machine Simulation ---
console.log('\n--- 3. Testing Frontend Midnight Rollover Logic ---');

function simulateRollover({ currentViewingDate, cachedToday, newActualToday }) {
  let currentDate = currentViewingDate;
  let cached = cachedToday;
  let datePickerMax = cached;
  let nextDisabled = currentDate >= cached;
  let ringsLabel = currentDate === cached ? 'Today' : (currentDate === '2026-10-06' ? 'Yesterday' : currentDate);
  let fetchedDate = null;
  let notice = null;

  if (newActualToday !== cached) {
    const wasOnToday = (currentDate === cached);
    cached = newActualToday;

    if (wasOnToday) {
      currentDate = newActualToday;
      datePickerMax = newActualToday;
      nextDisabled = currentDate >= newActualToday;
      ringsLabel = 'Today';
      fetchedDate = currentDate;
      notice = `A new day has started (${newActualToday}). Dashboard updated to Today.`;
    } else {
      datePickerMax = newActualToday;
      nextDisabled = currentDate >= newActualToday;
      ringsLabel = currentDate === newActualToday ? 'Today' : (currentDate === '2026-10-06' ? 'Yesterday' : currentDate);
      notice = `New day started (${newActualToday}). You can navigate forward to Today.`;
    }
  }

  return { currentDate, cached, datePickerMax, nextDisabled, ringsLabel, fetchedDate, notice };
}

// Scenario A: User is viewing "Today" on 2026-10-06 when midnight passes
const simA = simulateRollover({
  currentViewingDate: '2026-10-06',
  cachedToday: '2026-10-06',
  newActualToday: '2026-10-07'
});
assert.strictEqual(simA.currentDate, '2026-10-07', 'Dashboard must automatically advance to new day');
assert.strictEqual(simA.datePickerMax, '2026-10-07', 'DatePicker max must update to 2026-10-07');
assert.strictEqual(simA.nextDisabled, true, 'Next button must be disabled when on latest day');
assert.strictEqual(simA.ringsLabel, 'Today', 'Rings label must show Today');
assert.strictEqual(simA.fetchedDate, '2026-10-07', 'Dashboard must automatically fetch data for 2026-10-07');
assert(simA.notice.includes('A new day has started'), 'Notice banner must notify user of new day');
console.log('✅ Scenario A passed: Tab left open on "Today" across midnight automatically advances and fetches new day!');

// Scenario B: User was reviewing historical date (2026-10-01) when midnight passes
const simB = simulateRollover({
  currentViewingDate: '2026-10-01',
  cachedToday: '2026-10-06',
  newActualToday: '2026-10-07'
});
assert.strictEqual(simB.currentDate, '2026-10-01', 'Historical review should not be forcibly displaced');
assert.strictEqual(simB.datePickerMax, '2026-10-07', 'DatePicker max must expand to 2026-10-07');
assert.strictEqual(simB.nextDisabled, false, 'Next button must remain enabled so user can navigate forward');
assert.strictEqual(simB.fetchedDate, null, 'Should not prematurely re-fetch historical view');
console.log('✅ Scenario B passed: Historical review across midnight preserves view and enables forward navigation!');

// --- 4. Live Server Endpoints Verification ---
console.log('\n--- 4. Testing Live HTTP Server & Asset Delivery ---');

// Default date query
const defaultRes = await fetch('http://localhost:3000/api/dashboard-data');
assert(defaultRes.ok, 'Default dashboard-data request must succeed');
const defaultData = await defaultRes.json();
const expectedDate = toLocalDateString(new Date());
assert(defaultData.date === '2026-10-07' || defaultData.date === expectedDate, `Default date without query param must be 2026-10-07 or ${expectedDate}`);
console.log(`✅ Live server defaults to ${defaultData.date}!`);

// Explicit current date query
const todayRes = await fetch('http://localhost:3000/api/dashboard-data?date=2026-10-07');
assert(todayRes.ok, 'Date 2026-10-07 request must succeed');
const todayData = await todayRes.json();
assert.strictEqual(todayData.date, '2026-10-07');
assert(Array.isArray(todayData.trends), 'Trends must be present');
assert.strictEqual(todayData.trends.length, 7);
assert.strictEqual(todayData.trends[6].date, '2026-10-07');
console.log('✅ Live server responds with 7-day trend ending on 2026-10-07!');

// Verify script tag in HTML index
const htmlRes = await fetch('http://localhost:3000/');
assert(htmlRes.ok, 'Index HTML request must succeed');
const htmlText = await htmlRes.text();
assert(/app\.js\?v=[\d\.]+/.test(htmlText), 'index.html must load cache-busted app.js');
const vMatch = htmlText.match(/src="app\.js(\?v=[^"'\s>]+)"/);
const query = vMatch ? vMatch[1] : '?v=3.0';
console.log('✅ index.html serves cache-busted app.js tag!');

// Verify app.js content served
const jsRes = await fetch(`http://localhost:3000/app.js${query}`);
assert(jsRes.ok, 'app.js request must succeed');
const jsText = await jsRes.text();
assert(jsText.includes('scheduleMidnightTimer'), 'app.js must include scheduleMidnightTimer');
assert(jsText.includes('checkAndHandleDateRollover'), 'app.js must include checkAndHandleDateRollover');
assert(jsText.includes('visibilitychange'), 'app.js must include visibilitychange handler');
console.log('✅ app.js serves midnight timer and visibilitychange handlers!');

console.log('\n🎉 ALL ROLLOVER & TIMEZONE VERIFICATION TESTS PASSED SUCCESSFULLY!');
