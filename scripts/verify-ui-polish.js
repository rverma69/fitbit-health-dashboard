import assert from 'assert';
import fs from 'fs';

console.log('=== TEST SUITE: UI POLISH & SLOP REMOVAL AUDIT ===');

const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/app.js', 'utf8');
const css = fs.readFileSync('public/styles.css', 'utf8');

// 1. Zoom pill deleted
console.log('\n--- 1. Auditing Deletion of Zoom Pill ---');
assert(!html.includes('title="Zoom Out"'), 'Zoom Out button must be deleted');
assert(!html.includes('title="Focused Active View"'), 'Focused Active View must be deleted');
assert(!html.includes('title="Calibrate Contrast"'), 'Calibrate Contrast must be deleted');
assert(!html.includes('title="Fullscreen Expansion"'), 'Fullscreen Expansion must be deleted');
assert(html.includes('id="activityRingsDateLabel"'), 'activityRingsDateLabel must still exist');
console.log('✅ Entire non-functional zoom pill deleted; activity rings header preserved!');

// 2. 3 thumbnail buttons deleted
console.log('\n--- 2. Auditing Deletion of Rings 3 Thumbnail Buttons ---');
assert(!html.includes('Caloric & Movement Focus'), 'Caloric & Movement Focus button must be deleted');
assert(!html.includes('Activity Rings Core (Active)'), 'Activity Rings Core thumbnail button must be deleted');
assert(!html.includes('Cardiovascular Telemetry Focus'), 'Cardiovascular Telemetry Focus button must be deleted');
console.log('✅ All 3 vertical thumbnail buttons deleted completely!');

// 3. Hospital gauge deleted
console.log('\n--- 3. Auditing Deletion of Hospital Gauge Widget ---');
assert(!html.includes('Service Type · Autonomic Recovery'), 'Service Type Autonomic Recovery gauge must be deleted');
assert(!html.includes('358 Specialist'), '358 Specialist must be deleted');
assert(!html.includes('id="kpiServiceGaugeVal"'), 'kpiServiceGaugeVal must be deleted from HTML');
assert(!js.includes('kpiServiceGaugeVal'), 'kpiServiceGaugeVal must be deleted from JS');
assert(html.includes('id="kpiImpulseVal"'), 'Active zone impulse score must be preserved');
assert(html.includes('id="kpiAzmSubVal"'), 'Active zone minutes must be preserved');
assert(html.includes('id="kpiCalSubVal"'), 'Active zone calories must be preserved');
assert(html.includes('id="kpiImpulseBar"'), 'Active zone impulse bar must be preserved');
console.log('✅ Misaligned hospital gauge removed; Active zone & Caloric burn card cleanly styled!');

// 4. Sleep Coach AI slop deleted
console.log('\n--- 4. Auditing Deletion of Sleep Coach Badges, Formulas & Duplicate Cards ---');
assert(!html.includes('Circadian Neuroscience'), 'Circadian Neuroscience badge must be deleted');
assert(!html.includes('Borbély Two-Process Model'), 'Borbély Two-Process Model badge must be deleted');
assert(!html.includes('Banister TRIMP (+2.8m/strain)'), 'Banister TRIMP badge must be deleted');
assert(!html.includes('25% Debt Amortization'), '25% Debt Amortization badge must be deleted');
assert(!html.includes('Additive Borbély Sleep Need Formula'), 'Formula box title must be deleted');
assert(!html.includes('id="formulaBaseline"'), 'formulaBaseline must be deleted from HTML');
assert(!js.includes('formulaBaseline'), 'formulaBaseline must be deleted from JS');
assert(!html.includes('id="cardTierPeak"'), 'cardTierPeak must be deleted from HTML');
assert(!js.includes('cardTierPeak'), 'cardTierPeak must be deleted from JS');
assert(!html.includes('id="cardTierMaintain"'), 'cardTierMaintain must be deleted from HTML');
assert(!html.includes('id="cardTierGetBy"'), 'cardTierGetBy must be deleted from HTML');
console.log('✅ All neon badges, formula text boxes, and 3 redundant duplicate cards deleted!');

// 5. Redesigned Sleep Coach elements exist
console.log('\n--- 5. Auditing Redesigned Apple Health & WHOOP Sleep Coach ---');
assert(html.includes('Sleep Coach &amp; Bedtime Planner') || html.includes('Sleep Coach & Bedtime Planner'), 'Header title must exist');
assert(html.includes('id="coachWakeInput"'), 'coachWakeInput must exist');
assert(html.includes('id="coachTargetControl"'), 'coachTargetControl must exist');
assert(html.includes('id="targetPeak"'), 'targetPeak must exist');
assert(html.includes('id="targetMaintain"'), 'targetMaintain must exist');
assert(html.includes('id="targetGetBy"'), 'targetGetBy must exist');
assert(html.includes('id="coachWakeTimeVal"'), 'coachWakeTimeVal must exist');
assert(html.includes('id="coachBedtimeVal"'), 'coachBedtimeVal must exist');
assert(html.includes('id="coachTimeInBedVal"'), 'coachTimeInBedVal must exist');
assert(html.includes('id="coachTargetSleepVal"'), 'coachTargetSleepVal must exist');
assert(html.includes('id="coachTargetBadge"'), 'coachTargetBadge must exist');
assert(html.includes('id="coachBaselineVal"'), 'coachBaselineVal must exist');
assert(html.includes('id="coachStrainCompVal"'), 'coachStrainCompVal must exist');
assert(html.includes('id="coachDebtRepayVal"'), 'coachDebtRepayVal must exist');
assert(html.includes('id="coachTotalNeedSummary"'), 'coachTotalNeedSummary must exist');
assert(html.includes('id="coachSleepGateStatus"'), 'coachSleepGateStatus must exist');
assert(html.includes('Optimal Window: 10:30 PM – 11:45 PM'), 'Optimal Window text must exist');
assert(css.includes('#coachTargetControl .pb-seg-btn.active'), 'Active white pill CSS must exist');
console.log('✅ Redesigned Sleep Coach elements and active white pill CSS verified!');

// 6. Inert buttons deleted
console.log('\n--- 6. Auditing Deletion of Non-Working Decorative Buttons ---');
assert(!html.includes('title="Biometric Notifications"'), 'Inert notification bell must be deleted');
assert(!html.includes('title="Bookmark Current Biomarkers"'), 'Inert bookmark button must be deleted');
assert(!html.includes('title="Voice Call"'), 'Inert Voice Call button must be deleted');
assert(!html.includes('title="Message"'), 'Inert Message button must be deleted');
assert(!html.includes('title="Expand Details"'), 'Inert Expand Details button must be deleted');
console.log('✅ All non-working decorative buttons deleted across page!');

console.log('\n🎉 ALL UI POLISH & SLOP REMOVAL AUDITS PASSED PERFECTLY!');
