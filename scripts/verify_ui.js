import fs from 'fs';

const html = fs.readFileSync('public/index.html', 'utf8');
console.log('HTML byte length:', html.length);

const ids = [
  'section-overview', 'header-delta-pill', 'header-bio-age', 'header-chrono-age',
  'header-device-label', 'btn-prev-day', 'btn-date-label', 'btn-next-day',
  'btn-open-gemini', 'btn-sync', 'sync-icon', 'btn-open-settings', 'btn-user-profile',
  'user-avatar', 'user-name', 'headline-delta-txt', 'headline-pace-tag',
  'val-rhr', 'val-hr-peak', 'val-hrv', 'val-deep-hrv', 'val-spo2', 'val-spo2-range',
  'val-resp', 'val-resp-snr', 'val-azm', 'val-fat-burn', 'val-strain', 'val-trimp',
  'val-steps', 'val-distance', 'val-cals', 'val-sleep-score', 'val-sleep-dur', 'val-sleep-eff',
  'section-systems', 'radar-container', 'radar-svg', 'radar-footer-stat',
  'orbital-container', 'orbital-svg', 'orbital-center-val', 'orbital-center-tier',
  'telomere-length-val', 'telomere-svg', 'mini-histogram-bars', 'section-clinical',
  'col1-score-pill', 'methylation-pointer', 'tab-pace-val', 'tab-delta-val',
  'tab-hrv-val', 'tab-deep-hrv', 'tab-lfhf-val', 'tab-age-ratio', 'ratio-resilience',
  'ratio-vagal-tone', 'ratio-restorative', 'strain-bar-val', 'strain-gauge-pin',
  'zone-slice-out', 'zone-slice-fat', 'zone-slice-cardio', 'zone-slice-peak',
  'legend-rest', 'legend-fat', 'legend-cardio', 'legend-peak', 'btn-generate-report',
  'section-deep-dive', 'pane-tab-intraday', 'intraday-sample-count', 'intraday-minmax',
  'intraday-canvas-wrap', 'intraday-chart', 'chart-tooltip', 'meta-hf-power',
  'meta-lf-power', 'meta-raw-samples', 'pane-tab-sleep-coach', 'coach-gate-window',
  'coach-efficiency-stat', 'hypno-deep', 'hypno-rem', 'hypno-light', 'hypno-wake',
  'target-bedtime-peak', 'target-bedtime-maintain', 'target-bedtime-getby',
  'pane-tab-trends', 'trends-chart', 'gemini-modal', 'btn-close-gemini', 'chat-thread',
  'chat-form', 'chat-input', 'btn-send-chat', 'settings-modal', 'btn-close-settings',
  'btn-export-json', 'btn-toggle-demo', 'cfg-gemini-key', 'btn-save-gemini-key',
  'cfg-gemini-model', 'btn-save-gemini-model', 'toast-container',
  'stepsCount', 'caloriesBurnedNum', 'azmCount', 'distanceCount', 'kpiRhrVal',
  'kpiHrvVal', 'kpiStrainVal', 'kpiRecoveryVal', 'whoopRecoveryPct',
  'whoopDayStrainVal', 'bioAgeVal', 'bioChronologicalVal', 'bioAgeDeltaBadge',
  'bioPaceVal', 'hrChartCanvas', 'aiCouncilSection', 'modelTierLiteBtn',
  'modelTierFlashBtn', 'modelTierProBtn', 'runGeminiAnalysisBtn'
];

let missing = [];
for (const id of ids) {
  if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
    missing.push(id);
  }
}

if (missing.length === 0) {
  console.log(`✅ SUCCESS: All ${ids.length} active and legacy IDs found in public/index.html!`);
} else {
  console.log('❌ MISSING IDs:', missing);
  process.exit(1);
}
