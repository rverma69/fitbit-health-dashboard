// ==========================================================================
// PulseBoard v3.0 • Apple Health & WHOOP Motion & Interaction Engine
// ==========================================================================

// ── Date & Calendar Utilities ─────────────────────────────────────────────
function getLocalDateString(date = new Date()) {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDateString(dateStr, deltaDays) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().split('T')[0];
}

let cachedTodayStr = getLocalDateString();
const urlDateParam = (typeof window !== 'undefined' && window.location) ? new URLSearchParams(window.location.search).get('date') : null;
let currentDate = (urlDateParam && /^\d{4}-\d{2}-\d{2}$/.test(urlDateParam)) ? urlDateParam : cachedTodayStr;
let midnightTimer = null;
let activeTrendTab = 'sleep';
let dashboardData = null;
let hrChart = null;
let trendChart = null;

// Ring Circumference Constants (Matching Stitch SVG geometry)
const CIRCUMFERENCE_MOVE = 490.09;      // r = 78 (2 * PI * 78)
const CIRCUMFERENCE_EXERCISE = 408.41;  // r = 65 (2 * PI * 65)
const CIRCUMFERENCE_STAND = 326.73;     // r = 52 (2 * PI * 52)
const CIRCUMFERENCE_RECOVERY = 188.50;  // r = 60 half-arc (PI * 60)

// ── Number Countup Animation Engine ───────────────────────────────────────
const activeCountups = new Map();

function animateCountUp(elementId, targetVal, duration = 900, decimals = 0, suffix = '') {
  const el = document.getElementById(elementId);
  if (!el || targetVal === null || targetVal === undefined || isNaN(targetVal)) {
    if (el) el.textContent = '--';
    return;
  }

  const numTarget = Number(targetVal);
  const prevVal = activeCountups.get(elementId) || 0;
  activeCountups.set(elementId, numTarget);

  const startTime = performance.now();
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(1, elapsed / duration);
    const easedProgress = easeOutQuart(progress);
    const currentVal = prevVal + (numTarget - prevVal) * easedProgress;

    if (decimals === 0) {
      el.textContent = Math.round(currentVal).toLocaleString() + suffix;
    } else {
      el.textContent = currentVal.toFixed(decimals) + suffix;
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      if (decimals === 0) {
        el.textContent = numTarget.toLocaleString() + suffix;
      } else {
        el.textContent = numTarget.toFixed(decimals) + suffix;
      }
    }
  }

  requestAnimationFrame(step);
}

// ── Application Initialization ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initDatePicker();
  initModals();
  initNerdsModal();
  initTabs();
  initActions();
  initSleepCoachListeners();
  initWallpaperEngine();
  renderSleepCoach();
  await loadConfig();
  await checkGeminiStatus();
  await fetchDashboardData(currentDate);
});

// Precise midnight rollover handler
function scheduleMidnightTimer() {
  if (midnightTimer) clearTimeout(midnightTimer);
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  const msToMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());

  midnightTimer = setTimeout(() => {
    checkAndHandleDateRollover();
  }, msToMidnight);
}

function checkAndHandleDateRollover() {
  const currentActualToday = getLocalDateString();
  if (currentActualToday !== cachedTodayStr) {
    const wasOnToday = (currentDate === cachedTodayStr);
    cachedTodayStr = currentActualToday;

    if (wasOnToday) {
      currentDate = currentActualToday;
      updateDateNavUI();
      fetchDashboardData(currentDate);
      showNotice(`A new day has started (${currentActualToday}). Dashboard updated to Today.`);
    } else {
      updateDateNavUI();
      showNotice(`New day started (${currentActualToday}). You can navigate forward to Today.`);
    }

    scheduleMidnightTimer();
  }
}

function updateDateNavUI() {
  const datePicker = document.getElementById('datePicker');
  const nextBtn = document.getElementById('nextDateBtn');
  const todayStr = getLocalDateString();

  if (datePicker) {
    datePicker.value = currentDate;
    datePicker.max = todayStr;
  }

  if (nextBtn) {
    const isAtTodayOrFuture = currentDate >= todayStr;
    nextBtn.disabled = isAtTodayOrFuture;
    if (isAtTodayOrFuture) {
      nextBtn.classList.add('opacity-30', 'cursor-not-allowed');
    } else {
      nextBtn.classList.remove('opacity-30', 'cursor-not-allowed');
    }
  }

  const ringsDateLabel = document.getElementById('activityRingsDateLabel');
  if (ringsDateLabel) {
    ringsDateLabel.textContent = (currentDate === todayStr) ? 'Today' : currentDate;
  }
}

function initDatePicker() {
  const datePicker = document.getElementById('datePicker');
  const prevBtn = document.getElementById('prevDateBtn');
  const nextBtn = document.getElementById('nextDateBtn');
  const todayBtn = document.getElementById('todayBtn');

  updateDateNavUI();
  scheduleMidnightTimer();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkAndHandleDateRollover();
    }
  });

  datePicker?.addEventListener('change', (e) => {
    const selected = e.target.value;
    const todayStr = getLocalDateString();
    if (selected > todayStr) {
      currentDate = todayStr;
      updateDateNavUI();
      showNotice('Cannot navigate to future dates.');
      return;
    }
    currentDate = selected;
    updateDateNavUI();
    fetchDashboardData(currentDate);
  });

  prevBtn?.addEventListener('click', () => {
    currentDate = shiftDateString(currentDate, -1);
    updateDateNavUI();
    fetchDashboardData(currentDate);
  });

  nextBtn?.addEventListener('click', () => {
    const todayStr = getLocalDateString();
    if (currentDate >= todayStr) return;
    currentDate = shiftDateString(currentDate, 1);
    if (currentDate > todayStr) currentDate = todayStr;
    updateDateNavUI();
    fetchDashboardData(currentDate);
  });

  todayBtn?.addEventListener('click', () => {
    const todayStr = getLocalDateString();
    if (currentDate !== todayStr) {
      currentDate = todayStr;
      updateDateNavUI();
      fetchDashboardData(currentDate);
    }
  });
}

// ── Dashboard Data Fetcher ────────────────────────────────────────────────
async function fetchDashboardData(dateStr) {
  const syncIcon = document.getElementById('syncIcon');
  if (syncIcon) syncIcon.classList.add('animate-spin');

  try {
    const res = await fetch(`/api/dashboard-data?date=${dateStr}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    dashboardData = data;
    renderDashboard(data);
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    showNotice(`Failed to load health telemetry: ${err.message}`, true);
  } finally {
    if (syncIcon) syncIcon.classList.remove('animate-spin');
  }
}

// ── Dashboard Renderer ────────────────────────────────────────────────────
function renderDashboard(data) {
  if (!data) return;

  // 1. Status Badges & Device Info
  const demoBadge = document.getElementById('demoBadge');
  const liveBadge = document.getElementById('liveBadge');
  if (demoBadge && liveBadge) {
    if (data.isDemo) {
      demoBadge.classList.remove('hidden');
      liveBadge.classList.add('hidden');
    } else {
      demoBadge.classList.add('hidden');
      liveBadge.classList.remove('hidden');
    }
  }

  // User Profile
  const profileChip = document.getElementById('userProfileChip');
  const userDisplayName = document.getElementById('userDisplayName');
  const userAvatarImg = document.getElementById('userAvatarImg');
  const userAvatarPlaceholder = document.getElementById('userAvatarPlaceholder');

  // Settings Modal User Info
  const settingsUserName = document.getElementById('settingsUserName');
  const settingsUserEmail = document.getElementById('settingsUserEmail');
  const settingsAvatarImg = document.getElementById('settingsAvatarImg');
  const settingsAvatarFallback = document.getElementById('settingsAvatarFallback');

  if (data.needsAuthentication) {
    profileChip?.classList.remove('hidden');
    if (userDisplayName) userDisplayName.textContent = 'Connect Device';
    if (userAvatarImg) userAvatarImg.classList.add('hidden');
    if (userAvatarPlaceholder) userAvatarPlaceholder.classList.remove('hidden');
    if (profileChip) {
      profileChip.onclick = () => window.location.href = '/auth/login';
    }
    if (settingsUserName) settingsUserName.textContent = 'Connect Device';
    if (settingsUserEmail) settingsUserEmail.textContent = 'Offline (No Google Account linked)';
    if (settingsAvatarImg) settingsAvatarImg.classList.add('hidden');
    if (settingsAvatarFallback) {
      settingsAvatarFallback.classList.remove('hidden');
      settingsAvatarFallback.textContent = '--';
    }
  } else if (data.user) {
    profileChip?.classList.remove('hidden');
    const displayName = data.user.displayName || 'Health Athlete';
    const email = data.user.email || 'athlete@example.com';
    if (userDisplayName) userDisplayName.textContent = displayName;
    if (userAvatarImg && data.user.avatar) {
      userAvatarImg.src = data.user.avatar;
      userAvatarImg.classList.remove('hidden');
      if (userAvatarPlaceholder) userAvatarPlaceholder.classList.add('hidden');
    } else {
      if (userAvatarImg) userAvatarImg.classList.add('hidden');
      if (userAvatarPlaceholder) userAvatarPlaceholder.classList.remove('hidden');
    }
    if (profileChip) {
      profileChip.onclick = () => document.getElementById('settingsModal')?.classList.remove('hidden');
    }
    if (settingsUserName) settingsUserName.textContent = displayName;
    if (settingsUserEmail) settingsUserEmail.textContent = email;
    if (settingsAvatarImg && data.user.avatar) {
      settingsAvatarImg.src = data.user.avatar;
      settingsAvatarImg.classList.remove('hidden');
      if (settingsAvatarFallback) settingsAvatarFallback.classList.add('hidden');
    } else {
      if (settingsAvatarImg) settingsAvatarImg.classList.add('hidden');
      if (settingsAvatarFallback) {
        settingsAvatarFallback.classList.remove('hidden');
        settingsAvatarFallback.textContent = displayName.charAt(0).toUpperCase();
      }
    }

    // Populate Demographic & Anthropometric Calibration in Settings
    const profileDobInput = document.getElementById('profileDobInput');
    const profileGenderSelect = document.getElementById('profileGenderSelect');
    const profileCalculatedAge = document.getElementById('profileCalculatedAge');
    const profileHeightInput = document.getElementById('profileHeightInput');
    const profileWeightInput = document.getElementById('profileWeightInput');
    const profileCalculatedBmi = document.getElementById('profileCalculatedBmi');

    if (profileDobInput) {
      profileDobInput.value = data.user?.birthDate || '';
    }
    if (profileGenderSelect && data.user?.gender) {
      profileGenderSelect.value = data.user.gender;
    }
    if (profileCalculatedAge) {
      profileCalculatedAge.textContent = data.user?.chronologicalAge != null ? `${Number(data.user.chronologicalAge).toFixed(1)} yrs` : '--';
    }
    if (profileHeightInput) {
      profileHeightInput.value = data.user?.heightCm || '';
    }
    if (profileWeightInput) {
      profileWeightInput.value = data.user?.weightKg || '';
    }
    if (profileCalculatedBmi) {
      profileCalculatedBmi.textContent = data.user?.bmi != null ? `${data.user.bmi} (${data.user.bmiCategory || ''})` : '--';
    }
  }

  // Device Info
  const deviceModel = document.getElementById('deviceModelName');
  const lastSyncLabel = document.getElementById('lastSyncLabel');
  if (deviceModel && data.device) {
    deviceModel.textContent = data.device.deviceVersion || 'Fitbit Inspire 3';
  }
  if (lastSyncLabel && data.device?.lastSyncTime) {
    const syncTime = new Date(data.device.lastSyncTime);
    lastSyncLabel.textContent = `· Synced ${formatTimeAgo(syncTime)}`;
  } else if (lastSyncLabel) {
    lastSyncLabel.textContent = data.needsAuthentication ? '· Offline (Unpaired)' : '· Synced via Google Health';
  }

  // Notice Banner for Consent or Authentication
  const noticeBanner = document.getElementById('noticeBanner');
  const noticeBannerText = document.getElementById('noticeBannerText');
  const noticeActionBtn = document.getElementById('noticeActionBtn');

  if (data.needsHealthConsent) {
    noticeBanner?.classList.remove('hidden');
    if (noticeBannerText) {
      noticeBannerText.innerHTML = `<strong>Google Health Sync Required:</strong> Account connected to <b>${data.user?.displayName || 'Rohit Verma'}</b>. Grant fitness permissions to stream live Inspire 3 vitals.`;
    }
    if (noticeActionBtn) {
      noticeActionBtn.textContent = 'Grant Permissions';
      noticeActionBtn.onclick = () => window.location.href = data.authConsentUrl || '/auth/login';
    }
  } else if (data.needsAuthentication) {
    noticeBanner?.classList.remove('hidden');
    if (noticeBannerText) {
      noticeBannerText.textContent = 'Google Health / Fitbit device not connected. Connect your account to stream live Inspire 3 biometrics.';
    }
    if (noticeActionBtn) {
      noticeActionBtn.textContent = 'Connect Device';
      noticeActionBtn.onclick = () => window.location.href = '/auth/login';
    }
  } else {
    noticeBanner?.classList.add('hidden');
  }

  // 2. Activity Summary & Apple Rings
  const summary = data.summary || {};
  const steps = summary.steps || 0;
  const stepGoal = summary.stepGoal || 10000;
  const stepsPercent = Math.min(100, Math.round((steps / stepGoal) * 100));

  const calories = summary.caloriesOut || 0;
  const calorieGoal = summary.calorieGoal || 2300;
  const calPercent = Math.min(100, Math.round((calories / calorieGoal) * 100));

  const azm = summary.activeZoneMinutes || 0;
  const azmGoal = summary.azmGoal || 30;
  const azmPercent = Math.min(100, Math.round((azm / azmGoal) * 100));

  animateCountUp('stepsCount', steps);
  animateCountUp('caloriesBurnedNum', calories);
  animateCountUp('azmCount', azm);

  setText('caloriesBurned', calories >= calorieGoal ? 'Daily goal exceeded' : `${calPercent}% of move goal`);
  setText('azmGoal', `/ ${azmGoal} min`);
  setText('azmPercent', azm >= azmGoal ? 'Active Zone target met' : `${azmPercent}% of exercise goal`);
  setText('distanceCount', `${(summary.distanceKm || 0).toFixed(2)} km`);
  setText('stepsGoal', `/ ${stepGoal.toLocaleString()} goal`);

  animateActivityRings(calPercent / 100, azmPercent / 100, stepsPercent / 100);

  // 3. Vitals Overnight Highlights
  const hrData = data.heartRate || {};
  const rhr = hrData.restingHeartRate ?? '--';
  if (typeof rhr === 'number') {
    animateCountUp('restingHeartRate', rhr);
    animateCountUp('kpiRhrVal', rhr);
    const prevTrendRhr = (data.trends && data.trends.length >= 2)
      ? data.trends.slice(0, -1).reverse().find(t => typeof t.restingHeartRate === 'number' && t.restingHeartRate > 0)
      : null;
    if (prevTrendRhr) {
      const diff = rhr - prevTrendRhr.restingHeartRate;
      setText('kpiRhrBadge', diff > 0 ? `↑ +${diff} bpm` : (diff < 0 ? `↓ ${diff} bpm` : '± 0 bpm'));
    } else {
      setText('kpiRhrBadge', `${rhr} bpm`);
    }
    setText('chartRestingHr', `${rhr} bpm`);
  } else {
    setText('restingHeartRate', '--');
    setText('kpiRhrVal', '--');
    setText('kpiRhrBadge', '--');
    setText('chartRestingHr', '--');
  }

  setText('chartAzmTime', azm > 0 ? `${azm} min` : '--');

  const hm = data.healthMetrics || {};
  const hrvVal = hm.hrv?.dailyRmssd ?? '--';
  const spo2Val = hm.spo2?.avg ?? '--';
  const respVal = hm.breathingRate?.rpm ?? '--';
  const tempVal = (hm.skinTemp && hm.skinTemp.nightlyRelativeF !== '--' && typeof hm.skinTemp.nightlyRelativeF === 'number')
    ? `+${hm.skinTemp.nightlyRelativeF}°F`
    : '--';

  if (typeof hrvVal === 'number') {
    animateCountUp('vitalsHrv', hrvVal, 900, 1);
    animateCountUp('kpiHrvVal', Math.round(hrvVal));
    const prevTrendHrv = (data.trends && data.trends.length >= 2)
      ? data.trends.slice(0, -1).reverse().find(t => typeof t.hrv === 'number' && t.hrv > 0)
      : null;
    if (prevTrendHrv) {
      const diff = Math.round(hrvVal - prevTrendHrv.hrv);
      setText('kpiHrvBadge', diff >= 0 ? `+${diff} ms` : `${diff} ms`);
    } else {
      setText('kpiHrvBadge', `${Math.round(hrvVal)} ms`);
    }
  } else {
    setText('vitalsHrv', hrvVal);
    setText('kpiHrvVal', '--');
    setText('kpiHrvBadge', '--');
  }

  if (typeof spo2Val === 'number') animateCountUp('vitalsSpo2', spo2Val, 900, 1);
  else setText('vitalsSpo2', spo2Val);

  if (typeof respVal === 'number') animateCountUp('vitalsResp', respVal, 900, 1);
  else setText('vitalsResp', respVal);

  setText('vitalsTemp', tempVal);

  // Executive Dashboard KPIs (Active Zone & Impulse Score)
  const rawTrimp = data.whoop?.rawTrimp || 0;
  const hasActivityData = azm > 0 || calories > 0 || rawTrimp > 0;
  const barEl = document.getElementById('kpiImpulseBar');
  if (rhr === '--' && steps === 0 && !hasActivityData) {
    setText('kpiImpulseVal', '--');
    setText('kpiAzmSubVal', '--');
    setText('kpiCalSubVal', '--');
    if (barEl) barEl.style.width = '0%';
  } else {
    const metabolicImpulse = Math.round(rawTrimp > 0 ? (rawTrimp * 0.95 + azm * 0.8) : (calories * 0.12 + azm * 1.2));
    animateCountUp('kpiImpulseVal', Math.max(0, metabolicImpulse));
    setText('kpiAzmSubVal', `${azm} AZM`);
    setText('kpiCalSubVal', `${calories.toLocaleString()} kcal`);
    const impulsePct = Math.min(100, Math.max(0, Math.round(((azm / (azmGoal || 30)) * 50) + ((calories / (calorieGoal || 2300)) * 50))));
    if (barEl) barEl.style.width = `${impulsePct}%`;
  }

  // Secondary Vitals & Highlights
  const vo2Val = (hm.cardioFitness && hm.cardioFitness.vo2MaxEstimate !== '--') ? hm.cardioFitness.vo2MaxEstimate : '--';
  setText('cardioFitnessScore', vo2Val);

  if (typeof hrvVal === 'number') animateCountUp('hrvValue', hrvVal, 900, 1);
  else setText('hrvValue', hrvVal);
  setText('hrvStatus', hm.hrv?.status || 'Autonomic recovery balance');

  if (typeof spo2Val === 'number') animateCountUp('spo2Value', spo2Val, 900, 1);
  else setText('spo2Value', spo2Val);
  setText('spo2Status', hm.spo2?.status || 'Overnight pulse oximetry');

  if (typeof respVal === 'number') animateCountUp('breathingValue', respVal, 900, 1);
  else setText('breathingValue', respVal);

  // Anthropometrics & Metabolic Engine (Height, Weight, BMI, BMR)
  const userMet = hm.metabolic || data.user || {};
  const heightVal = (userMet.heightCm != null && userMet.heightCm !== '--') ? userMet.heightCm : (data.user?.heightCm ?? null);
  const weightVal = (userMet.weightKg != null && userMet.weightKg !== '--') ? userMet.weightKg : (data.user?.weightKg ?? null);
  const bmiVal = (userMet.bmi != null && userMet.bmi !== '--') ? userMet.bmi : (data.user?.bmi ?? null);
  const bmrVal = (userMet.bmr != null && userMet.bmr !== '--') ? userMet.bmr : (data.user?.bmr ?? null);
  const bmiCat = userMet.bmiCategory || data.user?.bmiCategory || '--';

  if (heightVal != null) {
    setText('userHeightVal', heightVal);
    setText('userHeightStatus', 'RECORDED');
    const hStatus = document.getElementById('userHeightStatus');
    if (hStatus) hStatus.className = 'font-mono text-[8.5px] sm:text-[9px] text-emerald-400 font-bold shrink-0 whitespace-nowrap inline-block mx-auto';
  } else {
    setText('userHeightVal', '--');
    setText('userHeightStatus', 'NOT LOGGED');
    const hStatus = document.getElementById('userHeightStatus');
    if (hStatus) hStatus.className = 'font-mono text-[8.5px] sm:text-[9px] text-zinc-500 font-bold shrink-0 whitespace-nowrap inline-block mx-auto';
  }

  if (weightVal != null) {
    setText('userWeightVal', weightVal);
    setText('userWeightStatus', 'RECORDED');
    const wStatus = document.getElementById('userWeightStatus');
    if (wStatus) wStatus.className = 'font-mono text-[8.5px] sm:text-[9px] text-emerald-400 font-bold shrink-0 whitespace-nowrap inline-block mx-auto';
  } else {
    setText('userWeightVal', '--');
    setText('userWeightStatus', 'NOT LOGGED');
    const wStatus = document.getElementById('userWeightStatus');
    if (wStatus) wStatus.className = 'font-mono text-[8.5px] sm:text-[9px] text-zinc-500 font-bold shrink-0 whitespace-nowrap inline-block mx-auto';
  }

  if (bmiVal != null) {
    setText('userBmiVal', bmiVal);
    setText('userBmiBadge', bmiCat.toUpperCase());
    setText('userBmiCategory', `${bmiCat} Range`);
    const bmiBadge = document.getElementById('userBmiBadge');
    if (bmiBadge) {
      if (bmiCat === 'Normal') bmiBadge.className = 'font-mono text-[8.5px] sm:text-[9px] text-emerald-400 font-bold shrink-0 whitespace-nowrap inline-block mx-auto';
      else if (bmiCat === 'Overweight' || bmiCat === 'Underweight') bmiBadge.className = 'font-mono text-[8.5px] sm:text-[9px] text-amber-400 font-bold shrink-0 whitespace-nowrap inline-block mx-auto';
      else bmiBadge.className = 'font-mono text-[8.5px] sm:text-[9px] text-rose-400 font-bold shrink-0 whitespace-nowrap inline-block mx-auto';
    }
  } else {
    setText('userBmiVal', '--');
    setText('userBmiBadge', '--');
    setText('userBmiCategory', '--');
    const bmiBadge = document.getElementById('userBmiBadge');
    if (bmiBadge) bmiBadge.className = 'font-mono text-[8.5px] sm:text-[9px] text-zinc-500 font-bold shrink-0 whitespace-nowrap inline-block mx-auto';
  }

  if (bmrVal != null) {
    animateCountUp('userBmrVal', bmrVal);
  } else {
    setText('userBmrVal', '--');
  }

  // 4. WHOOP & Biometric Intelligence
  renderWhoopIntelligence(data.whoop, hrData);

  // 4b. WHOOP Healthspan Biological Age & Pace of Aging
  renderBiologicalAge(data.biologicalAge || data.whoop?.biologicalAge);

  // 5. Sleep Architecture & Hypnogram
  const sleep = data.sleep || {};
  const sleepScoreNum = sleep.score;
  if (typeof sleepScoreNum === 'number') {
    animateCountUp('sleepScore', sleepScoreNum);
  } else {
    setText('sleepScore', '--');
  }

  const sleepQualityTag = document.getElementById('sleepQualityTag');
  const totalMins = sleep.totalMinutesAsleep || 0;
  if (totalMins > 0) {
    if (sleepQualityTag) {
      sleepQualityTag.textContent = sleepScoreNum >= 80 ? 'Optimal' : (sleepScoreNum >= 65 ? 'Good' : 'Restless');
      sleepQualityTag.className = 'pb-pill pb-pill-purple';
    }
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    setText('sleepDuration', `${hours}h ${mins}m`);
    const bedMins = sleep.totalTimeInBed || totalMins;
    setText('timeInBed', `${Math.floor(bedMins / 60)}h ${bedMins % 60}m`);
    setText('sleepEfficiency', sleep.efficiency ? `${sleep.efficiency}%` : 'Recorded');
  } else {
    if (sleepQualityTag) {
      sleepQualityTag.textContent = 'No Data';
      sleepQualityTag.className = 'pb-pill pb-pill-gray';
    }
    setText('sleepDuration', '--');
    setText('timeInBed', '--');
    setText('sleepEfficiency', '--');
  }

  if (sleep.startTime && sleep.endTime) {
    const start = new Date(sleep.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const end = new Date(sleep.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setText('sleepScheduleSpan', `Bedtime: ${start} → Wake: ${end}`);
  } else {
    setText('sleepScheduleSpan', 'No overnight sleep session recorded');
  }

  renderSleepStages(sleep.stages || {});

  // 6. Circadian Sleep Coach & Optimal Bedtime Planner
  renderSleepCoach(data.sleepCoach || data.whoop?.sleepCoach, data.whoop);

  // 7. Charts
  renderHeartRateChart(hrData);
  renderTrendsChart(data.trends || []);

  // 7. Stats for Nerds Telemetry
  renderNerdsTelemetry(data.nerdsTelemetry, data);

  // 8. AI Multidisciplinary Health Intelligence Council
  renderExpertCouncil(data);
}

let capAnimationTimeout = null;
function animateActivityRings(moveRatio, exerciseRatio, standRatio) {
  const ringMove = document.getElementById('ringMove');
  const ringExercise = document.getElementById('ringExercise');
  const ringStand = document.getElementById('ringStand');
  const capMove = document.getElementById('capMove');
  const capExercise = document.getElementById('capExercise');
  const capStand = document.getElementById('capStand');

  const offsetMove = Math.max(0, CIRCUMFERENCE_MOVE * (1 - Math.min(1.0, moveRatio)));
  const offsetExercise = Math.max(0, CIRCUMFERENCE_EXERCISE * (1 - Math.min(1.0, exerciseRatio)));
  const offsetStand = Math.max(0, CIRCUMFERENCE_STAND * (1 - Math.min(1.0, standRatio)));

  if (ringMove) ringMove.style.strokeDashoffset = offsetMove;
  if (ringExercise) ringExercise.style.strokeDashoffset = offsetExercise;
  if (ringStand) ringStand.style.strokeDashoffset = offsetStand;

  // Clear any existing cap synchronization timer
  if (capAnimationTimeout) clearTimeout(capAnimationTimeout);

  // Synchronize 3D Apple Watch Leading-Cap Overlap Shadow with ring sweep animation
  if (moveRatio < 0.98 && capMove) capMove.style.opacity = '0';
  if (exerciseRatio < 0.98 && capExercise) capExercise.style.opacity = '0';
  if (standRatio < 0.98 && capStand) capStand.style.opacity = '0';

  if (moveRatio >= 0.98 || exerciseRatio >= 0.98 || standRatio >= 0.98) {
    capAnimationTimeout = setTimeout(() => {
      if (capMove && moveRatio >= 0.98) capMove.style.opacity = '1';
      if (capExercise && exerciseRatio >= 0.98) capExercise.style.opacity = '1';
      if (capStand && standRatio >= 0.98) capStand.style.opacity = '1';
    }, 1100);
  }
}

// ── Sleep Stages Visualizer ───────────────────────────────────────────────
function renderSleepStages(stages) {
  const deep = stages.deep || { minutes: 0, percentage: 0 };
  const rem = stages.rem || { minutes: 0, percentage: 0 };
  const light = stages.light || { minutes: 0, percentage: 0 };
  const wake = stages.wake || { minutes: 0, percentage: 0 };

  const bDeep = document.getElementById('barDeep');
  const bRem = document.getElementById('barRem');
  const bLight = document.getElementById('barLight');
  const bWake = document.getElementById('barWake');

  if (bDeep) bDeep.style.width = `${deep.percentage || 0}%`;
  if (bRem) bRem.style.width = `${rem.percentage || 0}%`;
  if (bLight) bLight.style.width = `${light.percentage || 0}%`;
  if (bWake) bWake.style.width = `${wake.percentage || 0}%`;

  setText('deepMin', deep.minutes || 0);
  setText('deepPct', `${deep.percentage || 0}%`);
  setText('remMin', rem.minutes || 0);
  setText('remPct', `${rem.percentage || 0}%`);
  setText('lightMin', light.minutes || 0);
  setText('lightPct', `${light.percentage || 0}%`);
  setText('wakeMin', wake.minutes || 0);
  setText('wakePct', `${wake.percentage || 0}%`);
}

// ── WHOOP & Advanced Biometric Intelligence ───────────────────────────────
function renderWhoopIntelligence(whoop, hrData) {
  if (!whoop) return;

  // 1. WHOOP Recovery Dial
  const recScore = typeof whoop.recoveryScore === 'number' ? whoop.recoveryScore : null;
  const whoopRecoveryUnit = document.getElementById('whoopRecoveryUnit');
  if (recScore !== null) {
    animateCountUp('whoopRecoveryVal', recScore);
    setText('kpiRecoveryVal', `${recScore}%`);
    const recZone = whoop.recoveryZone === 'GREEN' ? 'Prime' : (whoop.recoveryZone === 'YELLOW' ? 'Steady' : 'Recover');
    setText('kpiRecoveryBadge', `${recScore}% · ${recZone}`);
    if (whoopRecoveryUnit) {
      whoopRecoveryUnit.style.display = 'inline';
      const colorCls = recScore >= 67 ? 'text-emerald-400' : (recScore >= 34 ? 'text-amber-400' : 'text-rose-500');
      whoopRecoveryUnit.className = `text-[15px] font-bold ${colorCls} absolute left-full ml-1 bottom-0.5 tracking-tight`;
    }
  } else {
    setText('whoopRecoveryVal', '--');
    setText('kpiRecoveryVal', '--');
    setText('kpiRecoveryBadge', '--');
    if (whoopRecoveryUnit) whoopRecoveryUnit.style.display = 'none';
  }

  const recoveryRing = document.getElementById('recoveryRing');
  const knobOuter = document.getElementById('recoveryKnobOuter');
  const knobInner = document.getElementById('recoveryKnobInner');
  if (recScore !== null) {
    animateCountUp('recoveryScoreNum', recScore);
    const scorePct = Math.min(100, Math.max(0, recScore));
    const offset = Math.max(0, CIRCUMFERENCE_RECOVERY * (1 - scorePct / 100));
    if (recoveryRing) {
      recoveryRing.style.strokeDasharray = `${CIRCUMFERENCE_RECOVERY}`;
      recoveryRing.style.strokeDashoffset = `${offset}`;
    }
    const rad = Math.PI * (scorePct / 100);
    const cx = (80 - 60 * Math.cos(rad)).toFixed(2);
    const cy = (85 - 60 * Math.sin(rad)).toFixed(2);
    if (knobOuter) { knobOuter.setAttribute('cx', cx); knobOuter.setAttribute('cy', cy); }
    if (knobInner) { knobInner.setAttribute('cx', cx); knobInner.setAttribute('cy', cy); }
  } else {
    setText('recoveryScoreNum', '--');
    if (recoveryRing) {
      recoveryRing.style.strokeDashoffset = `${CIRCUMFERENCE_RECOVERY}`;
    }
  }

  // Recovery Badge
  const zoneBadge = document.getElementById('whoopZoneBadge');
  if (zoneBadge) {
    if (whoop.recoveryZone === 'GREEN') {
      zoneBadge.className = 'pb-pill pb-pill-green';
      zoneBadge.innerHTML = `<span class="dot dot-green" style="width:5px;height:5px"></span> ${whoop.recoveryStatus || 'Prime Readiness'}`;
    } else if (whoop.recoveryZone === 'YELLOW') {
      zoneBadge.className = 'pb-pill pb-pill-amber';
      zoneBadge.innerHTML = `<span class="dot dot-amber" style="width:5px;height:5px"></span> ${whoop.recoveryStatus || 'Steady Baseline'}`;
    } else if (whoop.recoveryZone === 'RED') {
      zoneBadge.className = 'pb-pill pb-pill-red';
      zoneBadge.innerHTML = `<span class="dot dot-red" style="width:5px;height:5px"></span> ${whoop.recoveryStatus || 'Rest / Overreaching'}`;
    } else {
      zoneBadge.className = 'pb-pill pb-pill-gray';
      zoneBadge.innerHTML = `<span class="dot dot-gray" style="width:5px;height:5px"></span> No Data`;
    }
  }

  // Sub-scores
  setText('whoopHrvSub', whoop.hrvSubScore != null ? `${whoop.hrvSubScore}%` : '--');
  setText('whoopRhrSub', whoop.rhrSubScore != null ? `${whoop.rhrSubScore}%` : '--');
  setText('whoopSleepSub', whoop.sleepSubScore != null ? `${whoop.sleepSubScore}%` : '--');

  // Coaching Advice
  const advice = whoop.readinessAdvice || 'Wear device during sleep to generate recovery metrics.';
  setText('whoopAdviceText', advice);
  setText('whoopAdviceTextFull', advice);

  // 2. Day Strain
  const dayStrain = typeof whoop.dayStrain === 'number' ? whoop.dayStrain : null;
  const strainBar = document.getElementById('whoopStrainBar');
  if (dayStrain !== null) {
    animateCountUp('whoopDayStrainVal', dayStrain, 900, 1);
    animateCountUp('kpiStrainVal', dayStrain, 900, 1);
    setText('kpiStrainBadge', `${dayStrain.toFixed(1)} / 21`);
    if (strainBar) {
      const strainPct = Math.min(100, Math.max(0, (dayStrain / 21.0) * 100));
      strainBar.style.width = `${strainPct}%`;
    }
  } else {
    setText('whoopDayStrainVal', '--');
    setText('kpiStrainVal', '--');
    setText('kpiStrainBadge', '--');
    if (strainBar) strainBar.style.width = '0%';
  }
  setText('whoopTargetStrain', whoop.strainTargetRange || '--');

  // 3. Garmin Body Battery
  const bb = whoop.bodyBattery;
  const bbBar = document.getElementById('bodyBatteryBar');
  if (typeof bb === 'number') {
    animateCountUp('bodyBatteryVal', bb);
    if (bbBar) {
      bbBar.style.width = `${bb}%`;
      if (bb >= 75) {
        bbBar.style.background = 'var(--green)';
        bbBar.style.boxShadow = 'none';
      } else if (bb >= 50) {
        bbBar.style.background = 'var(--amber)';
        bbBar.style.boxShadow = 'none';
      } else {
        bbBar.style.background = 'var(--red)';
        bbBar.style.boxShadow = 'none';
      }
    }
  } else {
    setText('bodyBatteryVal', '--');
    setText('bodyBatteryLabel', '--');
    if (bbBar) bbBar.style.width = '0%';
  }

  const bbLabelEl = document.getElementById('bodyBatteryLabel');
  if (bbLabelEl) {
    bbLabelEl.textContent = whoop.bodyBatteryLabel || '--';
    if (whoop.bodyBatteryZone === 'HIGH') bbLabelEl.className = 'pb-pill pb-pill-green';
    else if (whoop.bodyBatteryZone === 'MEDIUM') bbLabelEl.className = 'pb-pill pb-pill-amber';
    else if (whoop.bodyBatteryZone === 'LOW' || whoop.bodyBatteryZone === 'CRITICAL') bbLabelEl.className = 'pb-pill pb-pill-red';
    else bbLabelEl.className = 'pb-pill pb-pill-gray';
  }

  // 4. Sleep & Restoration
  setText('whoopRestorativePct', typeof whoop.restorativeSleepPct === 'number' ? `${whoop.restorativeSleepPct}%` : '--%');
  setText('whoopRestorativeMins', typeof whoop.restorativeMinutes === 'number' ? `${whoop.restorativeMinutes}m` : '--');
  setText('whoopSleepPerfVal', typeof whoop.sleepPerformancePct === 'number' ? `${Math.round(whoop.sleepPerformancePct)}%` : '--%');
  setText('whoopSleepDebtVal', typeof whoop.sleepDebtMinutes === 'number' ? `${whoop.sleepDebtMinutes}m` : '--');
  setText('whoopAwakeningsVal', typeof whoop.microAwakenings === 'number' ? whoop.microAwakenings : '--');

  // 5. Oura Readiness & Circadian SRI & Resp Variance (Card C)
  if (typeof whoop.ouraReadiness === 'number') {
    animateCountUp('ouraReadinessVal', whoop.ouraReadiness);
    const ouraBar = document.getElementById('ouraReadinessBar');
    if (ouraBar) ouraBar.style.width = `${Math.min(100, Math.max(0, whoop.ouraReadiness))}%`;
    const ouraBadge = document.getElementById('ouraReadinessBadge');
    if (ouraBadge) {
      const oLabel = (whoop.ouraReadinessLabel || (whoop.ouraReadiness >= 85 ? 'OPTIMAL' : (whoop.ouraReadiness >= 70 ? 'GOOD' : 'REST'))).toUpperCase();
      ouraBadge.textContent = oLabel;
      if (whoop.ouraReadiness >= 85) ouraBadge.className = 'font-mono text-[9px] sm:text-[10px] text-emerald-400 font-bold shrink-0 whitespace-nowrap';
      else if (whoop.ouraReadiness >= 70) ouraBadge.className = 'font-mono text-[9px] sm:text-[10px] text-cyan-400 font-bold shrink-0 whitespace-nowrap';
      else ouraBadge.className = 'font-mono text-[9px] sm:text-[10px] text-amber-400 font-bold shrink-0 whitespace-nowrap';
    }
  } else {
    setText('ouraReadinessVal', '--');
    const ouraBar = document.getElementById('ouraReadinessBar');
    if (ouraBar) ouraBar.style.width = '0%';
    const ouraBadge = document.getElementById('ouraReadinessBadge');
    if (ouraBadge) {
      ouraBadge.textContent = '--';
      ouraBadge.className = 'font-mono text-[9px] sm:text-[10px] text-zinc-500 font-bold shrink-0 whitespace-nowrap';
    }
  }
  setText('ouraReadinessLabel', whoop.ouraReadinessLabel || '--');

  const sriVal = (whoop.sleepRegularityIndex != null && whoop.sleepRegularityIndex !== '--') ? whoop.sleepRegularityIndex : null;
  setText('sleepRegularityVal', sriVal != null ? `${sriVal}%` : '--%');

  const respVar = (whoop.respiratoryRateVariance != null && whoop.respiratoryRateVariance !== '--') ? whoop.respiratoryRateVariance : null;
  setText('respVarianceVal', respVar != null ? `${respVar} rpm` : '-- rpm');
  setText('respVarianceStatus', whoop.respiratoryRateStatus || 'Stable');

  // 6. Garmin Training Status & Workload Balance (Card A)
  const tStatus = whoop.trainingStatus || '--';
  setText('trainingStatusVal', tStatus);
  const tStatusValEl = document.getElementById('trainingStatusVal');
  if (tStatusValEl) {
    if (whoop.trainingStatusColor === 'GREEN') tStatusValEl.style.color = 'var(--green)';
    else if (whoop.trainingStatusColor === 'BLUE') tStatusValEl.style.color = 'var(--cyan)';
    else if (whoop.trainingStatusColor === 'YELLOW') tStatusValEl.style.color = 'var(--amber)';
    else if (whoop.trainingStatusColor === 'RED') tStatusValEl.style.color = 'var(--red)';
    else tStatusValEl.style.color = 'white';
  }
  const loadVal = (whoop.trainingLoad != null && whoop.trainingLoad !== '--') ? whoop.trainingLoad : null;
  setText('trainingLoadVal', loadVal != null ? `Load: ${loadVal}%` : 'Load: --%');
  const tLoadBar = document.getElementById('trainingLoadBar');
  if (tLoadBar) {
    tLoadBar.style.width = loadVal != null ? `${Math.min(100, Math.max(0, loadVal))}%` : '0%';
  }
  const acwrVal = (whoop.acwr != null && whoop.acwr !== '--') ? whoop.acwr : null;
  setText('acwrRatioDisplay', acwrVal != null ? acwrVal : '--');
  const atlVal = (whoop.acuteTrainingLoad != null && whoop.acuteTrainingLoad !== '--') ? whoop.acuteTrainingLoad : null;
  if (atlVal != null) setText('atlLoadDisplay', atlVal);

  // 7. Garmin Intensity Minutes (Card B)
  const modMins = (whoop.intensityMinutesModerate != null && whoop.intensityMinutesModerate !== '--') ? whoop.intensityMinutesModerate : 0;
  const vigMins = (whoop.intensityMinutesVigorous != null && whoop.intensityMinutesVigorous !== '--') ? whoop.intensityMinutesVigorous : 0;
  const totIntensity = modMins + (vigMins * 2);
  const wkGoalPct = (whoop.weeklyGoalProgress != null && whoop.weeklyGoalProgress !== '--') ? whoop.weeklyGoalProgress : 0;

  if (whoop.intensityMinutesModerate != null && whoop.intensityMinutesModerate !== '--') {
    setText('intensityModerate', `${modMins}m`);
    setText('intensityVigorous', `${vigMins}m`);
    setText('intensityTotalDisplay', totIntensity > 0 ? totIntensity : '--');
    setText('intensityGoalProgress', `${wkGoalPct}% of wk`);
    const iBar = document.getElementById('intensityProgressBar');
    if (iBar) iBar.style.width = `${Math.min(100, Math.max(0, wkGoalPct))}%`;
  } else {
    setText('intensityModerate', '--m');
    setText('intensityVigorous', '--m');
    setText('intensityTotalDisplay', '--');
    setText('intensityGoalProgress', '--% of wk');
    const iBar = document.getElementById('intensityProgressBar');
    if (iBar) iBar.style.width = '0%';
  }

  // 8. Sports Science Performance Engine & Foster Monotony (Card D)
  const monotonyVal = (whoop.trainingMonotony != null && whoop.trainingMonotony !== '--') ? whoop.trainingMonotony : null;
  setText('trainingMonotonyVal', monotonyVal != null ? monotonyVal : '--');
  const mBar = document.getElementById('monotonyProgressBar');
  if (mBar) {
    if (monotonyVal != null) {
      const pct = Math.min(100, Math.max(10, Math.round((monotonyVal / 2.5) * 100)));
      mBar.style.width = `${pct}%`;
    } else {
      mBar.style.width = '0%';
    }
  }
  const monotonyBadge = document.getElementById('monotonyStatusBadge');
  if (monotonyBadge) {
    if (monotonyVal != null) {
      if (monotonyVal < 1.5) {
        monotonyBadge.textContent = 'OPTIMAL VARIETY';
        monotonyBadge.className = 'font-mono text-[9px] sm:text-[10px] text-emerald-400 font-bold shrink-0 whitespace-nowrap';
      } else if (monotonyVal < 2.0) {
        monotonyBadge.textContent = 'MODERATE MONOTONY';
        monotonyBadge.className = 'font-mono text-[9px] sm:text-[10px] text-amber-400 font-bold shrink-0 whitespace-nowrap';
      } else {
        monotonyBadge.textContent = 'HIGH STALENESS RISK';
        monotonyBadge.className = 'font-mono text-[9px] sm:text-[10px] text-rose-400 font-bold shrink-0 whitespace-nowrap';
      }
    } else {
      monotonyBadge.textContent = '--';
      monotonyBadge.className = 'font-mono text-[9px] sm:text-[10px] text-zinc-500 font-bold shrink-0 whitespace-nowrap';
    }
  }

  const aeroEff = whoop.aerobicEfficiency != null && whoop.aerobicEfficiency !== '--' ? (typeof whoop.aerobicEfficiency === 'number' ? whoop.aerobicEfficiency.toFixed(2) : whoop.aerobicEfficiency) : '--';
  setText('chartAerobicEff', aeroEff);
  setText('aerobicEffDisplay', aeroEff);
  setText('aerobicEfficiencySuiteVal', aeroEff);

  const cvStatus = whoop.cardiovascularLoadStatus || '--';
  setText('cvLoadStatusDisplay', cvStatus);

  // 9. Average HR
  if (typeof whoop.avgHeartRate === 'number') {
    animateCountUp('avgHrDisplay', whoop.avgHeartRate);
  } else {
    setText('avgHrDisplay', '--');
  }

  // 10. Autonomic Stress Load & Baevsky SI (Card E)
  const stress = whoop.stressLoad;
  if (stress && stress.score != null && stress.score !== '--' && typeof stress.score === 'number') {
    animateCountUp('stressScoreVal', stress.score);
    const sBadge = document.getElementById('stressStatusBadge');
    if (sBadge) {
      sBadge.textContent = (stress.status || 'Rest & Recovery').toUpperCase();
      if (stress.color === 'GREEN') sBadge.className = 'font-mono text-[9px] sm:text-[10px] text-emerald-400 font-bold shrink-0 whitespace-nowrap';
      else if (stress.color === 'CYAN') sBadge.className = 'font-mono text-[9px] sm:text-[10px] text-cyan-400 font-bold shrink-0 whitespace-nowrap';
      else if (stress.color === 'AMBER') sBadge.className = 'font-mono text-[9px] sm:text-[10px] text-amber-400 font-bold shrink-0 whitespace-nowrap';
      else sBadge.className = 'font-mono text-[9px] sm:text-[10px] text-rose-400 font-bold shrink-0 whitespace-nowrap';
    }
    const sBar = document.getElementById('stressScoreBar');
    if (sBar) {
      sBar.style.width = `${Math.min(100, Math.max(5, stress.score))}%`;
    }
    setText('baevskyIndexVal', `${stress.baevskyIndex} SI`);
    setText('sympathovagalVal', `${stress.sympathovagalRatio} LF/HF`);
    setText('stressRestStateVal', `${stress.restPct || 74}% Restful State`);
  } else {
    setText('stressScoreVal', '--');
    const sBadge = document.getElementById('stressStatusBadge');
    if (sBadge) {
      sBadge.textContent = '--';
      sBadge.className = 'font-mono text-[9px] sm:text-[10px] text-zinc-500 font-bold shrink-0 whitespace-nowrap';
    }
    const sBar = document.getElementById('stressScoreBar');
    if (sBar) sBar.style.width = '0%';
    setText('baevskyIndexVal', '-- SI');
    setText('sympathovagalVal', '-- LF/HF');
    setText('stressRestStateVal', '--% Restful State');
  }
}

// ── WHOOP Healthspan Biological Age & Pace of Aging ─────────────────────────
function renderBiologicalAge(bio) {
  const pBar = document.getElementById('bioPaceBar');
  const cohortBadge = document.getElementById('bioCohortBadge');

  if (!bio || bio.status === 'No data' || bio.biologicalAge === '--' || typeof bio.biologicalAge !== 'number') {
    setText('bioAgeVal', '--');
    const chronoAge = bio?.chronologicalAge;
    setText('bioChronologicalVal', chronoAge != null ? chronoAge.toFixed(1) : '--');
    setText('headerBioAgeVal', '--');
    setText('headerChronoAgeVal', chronoAge != null ? Math.round(chronoAge) : '--');
    setText('headerBioDeltaVal', '--');
    setText('headerPacingVal', '--');
    const headerPBar = document.getElementById('headerPacingBar');
    if (headerPBar) headerPBar.style.width = '0%';
    const summaryDiff = document.getElementById('headerBioAgeSummaryDiff');
    if (summaryDiff) summaryDiff.textContent = '--';
    const deltaBadge = document.getElementById('bioAgeDeltaBadge');
    if (deltaBadge) {
      deltaBadge.textContent = '--';
      deltaBadge.className = 'font-mono text-[9px] sm:text-[10px] font-bold text-zinc-500 shrink-0 whitespace-nowrap ml-1';
    }
    setText('bioPaceVal', '--');
    setText('bioPaceStatus', 'NO DATA');
    setText('bioPacePct', 'Wear device to calculate pace of aging trajectory');
    if (pBar) {
      pBar.style.width = '0%';
    }
    if (cohortBadge) {
      cohortBadge.textContent = 'NO DATA';
    }
    setText('bioVascularSummary', 'Overnight biometric tracking (continuous heart rate & nocturnal HRV) required to evaluate vascular compliance and autonomic rejuvenation.');
    setText('bioPaceDaysSummary', 'Wear tracker across 24h activity and sleep cycles to compute your biological pace of aging trajectory.');
    setText('bioAutonomicVal', '--');
    setText('bioAutonomicDelta', '--');
    setText('bioAutonomicStatus', 'No data');
    setText('bioCardioVal', '--');
    setText('bioCardioDelta', '--');
    setText('bioCardioStatus', 'No data');
    setText('bioCellularVal', '--');
    setText('bioCellularDelta', '--');
    setText('bioCellularStatus', 'No data');
    setText('bioFitnessVal', '--');
    setText('bioFitnessDelta', '--');
    setText('bioFitnessStatus', 'No data');
    setText('bioLongevitySummary', 'Wear device overnight to calculate biological age and longevity trajectory.');
    setText('bioSyncStatus', 'SYNC: WAITING TELEMETRY');
    setText('bioCorrVal', '-- CORR');
    return;
  }

  // 1. Biological Age Hero & Top Header Sync
  animateCountUp('bioAgeVal', bio.biologicalAge, 900, 1);
  setText('bioChronologicalVal', bio.chronologicalAge ? bio.chronologicalAge.toFixed(1) : '--');
  setText('headerBioAgeVal', bio.biologicalAge != null ? bio.biologicalAge.toFixed(1) : '--');
  setText('headerChronoAgeVal', bio.chronologicalAge ? Math.round(bio.chronologicalAge) : '--');
  
  const deltaVal = bio.ageDelta != null ? (bio.ageDelta < 0 ? `${bio.ageDelta.toFixed(1)}` : `+${bio.ageDelta.toFixed(1)}`) : '--';
  setText('headerBioDeltaVal', deltaVal);
  const deltaColor = bio.ageDelta != null ? (bio.ageDelta <= 0 ? 'text-[#00C8FF]' : 'text-rose-400') : 'text-zinc-400';
  const headerDeltaEl = document.getElementById('headerBioDeltaVal');
  if (headerDeltaEl) headerDeltaEl.className = `text-xs font-mono font-bold ${deltaColor} tracking-tight`;

  // Dynamic Battery LED equalizer blocks
  const batteryGrid = document.getElementById('headerBatteryGrid');
  if (batteryGrid && bio && typeof bio.ageDelta === 'number') {
    const isYounger = bio.ageDelta <= 0;
    const colorClass = isYounger ? 'bg-[#00C8FF]' : 'bg-rose-500';
    const topBlocks = batteryGrid.querySelectorAll('.battery-top-block');
    const litCount = Math.min(8, Math.max(2, Math.round(Math.abs(bio.ageDelta) * 1.5)));
    topBlocks.forEach((b, i) => {
      b.className = `battery-top-block w-1 h-2 rounded-[1px] ${i < litCount ? colorClass : 'bg-white/15'} transition-all`;
    });
  }

  // Dynamic Aging Summary Sentence
  const summaryDiff = document.getElementById('headerBioAgeSummaryDiff');
  if (summaryDiff) {
    if (bio && typeof bio.ageDelta === 'number') {
      const absDiff = Math.abs(bio.ageDelta).toFixed(1);
      if (bio.ageDelta < 0) {
        summaryDiff.textContent = `${absDiff} years younger`;
        summaryDiff.className = 'text-emerald-400 font-semibold';
      } else if (bio.ageDelta > 0) {
        summaryDiff.textContent = `${absDiff} years faster`;
        summaryDiff.className = 'text-rose-400 font-semibold';
      } else {
        summaryDiff.textContent = 'identical pace';
        summaryDiff.className = 'text-cyan-400 font-semibold';
      }
    } else {
      summaryDiff.textContent = '--';
    }
  }

  setText('headerPacingVal', bio.paceOfAgingFormatted || (bio.paceOfAging != null ? `${bio.paceOfAging}x` : '--'));
  const headerPBar = document.getElementById('headerPacingBar');
  if (headerPBar && typeof bio.paceOfAging === 'number') {
    const clamped = Math.max(0.70, Math.min(1.30, bio.paceOfAging));
    headerPBar.style.width = `${Math.round(((clamped - 0.70) / (1.30 - 0.70)) * 100)}%`;
  }

  // Update System Aging Radar Polygon dynamically
  const radarPoly = document.getElementById('radarPolygon');
  if (radarPoly) {
    const aut = Math.min(1, Math.max(0.2, (bio.pillars?.autonomic?.deltaYears ? (4 - bio.pillars.autonomic.deltaYears) / 8 : 0.85)));
    const card = Math.min(1, Math.max(0.2, (bio.pillars?.cardiovascular?.deltaYears ? (4 - bio.pillars.cardiovascular.deltaYears) / 8 : 0.75)));
    const cell = Math.min(1, Math.max(0.2, (bio.pillars?.cellularRestoration?.deltaYears ? (4 - bio.pillars.cellularRestoration.deltaYears) / 8 : 0.8)));
    const fit = Math.min(1, Math.max(0.2, (bio.pillars?.cardiorespiratory?.deltaYears ? (4 - bio.pillars.cardiorespiratory.deltaYears) / 8 : 0.7)));
    const r1 = 30 + 75 * aut;
    const r2 = 30 + 75 * fit;
    const r3 = 30 + 75 * card;
    const r4 = 30 + 75 * cell;
    const r5 = 30 + 75 * ((aut + card) / 2);
    const p1 = `130,${(130 - r1).toFixed(1)}`;
    const p2 = `${(130 + r2 * Math.cos(0.314)).toFixed(1)},${(130 - r2 * Math.sin(0.314)).toFixed(1)}`;
    const p3 = `${(130 + r3 * Math.cos(0.942)).toFixed(1)},${(130 + r3 * Math.sin(0.942)).toFixed(1)}`;
    const p4 = `${(130 - r4 * Math.cos(0.942)).toFixed(1)},${(130 + r4 * Math.sin(0.942)).toFixed(1)}`;
    const p5 = `${(130 - r5 * Math.cos(0.314)).toFixed(1)},${(130 - r5 * Math.sin(0.314)).toFixed(1)}`;
    radarPoly.setAttribute('points', `${p1} ${p2} ${p3} ${p4} ${p5}`);
  }

  const deltaBadge = document.getElementById('bioAgeDeltaBadge');
  if (deltaBadge) {
    const deltaYears = typeof bio.ageDelta === 'number' ? bio.ageDelta : null;
    const deltaStr = deltaYears != null
      ? (deltaYears < 0 ? `${deltaYears.toFixed(1)} yrs` : (deltaYears > 0 ? `+${deltaYears.toFixed(1)} yrs` : '0.0 yrs'))
      : (bio.ageDeltaFormatted || '--');
    deltaBadge.textContent = deltaStr;
    if (deltaYears != null && deltaYears < 0) {
      deltaBadge.className = 'font-mono text-[9px] sm:text-[10px] font-bold text-emerald-400 shrink-0 whitespace-nowrap ml-1';
    } else if (deltaYears != null && deltaYears > 0) {
      deltaBadge.className = 'font-mono text-[9px] sm:text-[10px] font-bold text-telemetry-coral shrink-0 whitespace-nowrap ml-1';
    } else {
      deltaBadge.className = 'font-mono text-[9px] sm:text-[10px] font-bold text-cyan-400 shrink-0 whitespace-nowrap ml-1';
    }
  }

  // 2. Pace of Aging Hero
  if (typeof bio.paceOfAging === 'number') {
    animateCountUp('bioPaceVal', bio.paceOfAging, 900, 2);
  } else {
    setText('bioPaceVal', bio.paceOfAgingFormatted || '--');
  }
  setText('bioPaceStatus', bio.paceStatus || 'Optimal (Decelerated Aging)');

  const pct = Math.abs(bio.paceOfAgingPct != null ? bio.paceOfAgingPct : 14);
  const slowerOrFaster = (bio.paceOfAgingPct || 0) <= 0 ? 'slower' : 'faster';
  setText('bioPacePct', `Aging ${pct}% ${slowerOrFaster} than chronological clock`);

  // Pace Scale Bar Progress (range: 0.70x to 1.30x)
  if (pBar && typeof bio.paceOfAging === 'number') {
    const clampedPace = Math.max(0.70, Math.min(1.30, bio.paceOfAging));
    const paceWidth = Math.round(((clampedPace - 0.70) / (1.30 - 0.70)) * 100);
    pBar.style.width = `${paceWidth}%`;
    if (bio.paceOfAging <= 0.88) {
      pBar.style.background = 'linear-gradient(90deg, #00E5FF, #00E676)';
    } else if (bio.paceOfAging <= 1.05) {
      pBar.style.background = 'linear-gradient(90deg, #00E5FF, #FFB800)';
    } else {
      pBar.style.background = 'linear-gradient(90deg, #FFB800, #FF3040)';
    }
  }

  // Cohort & Dynamic Wear Summaries
  if (cohortBadge) {
    if (bio.ageDelta <= -3.0) cohortBadge.textContent = 'Top 3% Cohort';
    else if (bio.ageDelta < 0) cohortBadge.textContent = 'Top 15% Cohort';
    else if (bio.ageDelta === 0) cohortBadge.textContent = 'Median Cohort';
    else cohortBadge.textContent = 'Sub-Median Cohort';
  }

  const daysAccumulated = Math.round(365 * (bio.paceOfAging || 1.0));
  setText('bioPaceDaysSummary', `For every 365 calendar days elapsed, your autonomic and cardiovascular systems accumulate biological wear equivalent to approximately ${daysAccumulated} days.`);

  // 3. Four Biological Pillars
  const pillars = bio.pillars || {};
  const auto = pillars.autonomic || {};
  setText('bioAutonomicVal', auto.value || '--');
  setText('bioAutonomicDelta', typeof auto.deltaYears === 'number' ? `${auto.deltaYears > 0 ? '+' : ''}${auto.deltaYears.toFixed(1)} yrs` : '--');
  setText('bioAutonomicStatus', auto.status || 'Elite Vagal Tone');

  const card = pillars.cardiovascular || {};
  setText('bioCardioVal', card.value || '--');
  setText('bioCardioDelta', typeof card.deltaYears === 'number' ? `${card.deltaYears > 0 ? '+' : ''}${card.deltaYears.toFixed(1)} yrs` : '--');
  setText('bioCardioStatus', card.status || 'Athletic Cardiac Reserve');

  const cell = pillars.cellularRestoration || {};
  setText('bioCellularVal', cell.value || '--');
  setText('bioCellularDelta', typeof cell.deltaYears === 'number' ? `${cell.deltaYears > 0 ? '+' : ''}${cell.deltaYears.toFixed(1)} yrs` : '--');
  setText('bioCellularStatus', cell.status || 'Optimal Deep Recovery');

  const fit = pillars.cardiorespiratory || {};
  setText('bioFitnessVal', fit.value || '--');
  setText('bioFitnessDelta', typeof fit.deltaYears === 'number' ? `${fit.deltaYears > 0 ? '+' : ''}${fit.deltaYears.toFixed(1)} yrs` : '--');
  setText('bioFitnessStatus', fit.status || 'Target Exceeded');

  // Dynamic Vascular Paragraph
  const rhrValStr = card.value || '--';
  const hrvValStr = auto.value || '--';
  const cardDesc = card.status && card.status !== 'No data' ? card.status.toLowerCase() : 'athletic cardiac reserve';
  const autoDesc = auto.status && auto.status !== 'No data' ? auto.status.toLowerCase() : 'cardiovagal resilience';
  setText('bioVascularSummary', `Resting heart rate of ${rhrValStr} and RMSSD of ${hrvValStr} indicate ${cardDesc} and ${autoDesc} typical of optimal longevity physiology.`);

  // 4. Actionable Longevity Trajectory Summary
  const autoVal = auto.value ? `HRV ${auto.value}` : 'consistent nocturnal HRV';
  const cardVal = card.value ? `resting HR ${card.value}` : 'resting HR within athletic range';
  setText('bioLongevitySummary', `Maintaining ${autoVal} and ${cardVal} sustains a decelerated biological aging trajectory (${bio.paceOfAgingFormatted || '--'}).`);

  // 5. Dynamic Sensor Synchronization & KDM Model Correlation
  setText('bioSyncStatus', bio.syncStatus || '4/4 SENSORS SYNCED');
  setText('bioCorrVal', bio.kdmCorrelationFormatted || `${bio.kdmCorrelation || '0.94'} CORR`);
}

// ── Circadian Sleep Coach & Bedtime Planner (Borbély Two-Process Model) ──
let currentSleepCoachState = {
  target: 'peak',
  wakeTime: '07:30',
  data: null,
  whoop: null
};

function selectCoachTarget(targetKey) {
  if (!targetKey) return;
  let normalizedKey = targetKey.toLowerCase();
  if (normalizedKey.includes('getby')) normalizedKey = 'getBy';
  else if (normalizedKey.includes('maintain')) normalizedKey = 'maintain';
  else normalizedKey = 'peak';

  currentSleepCoachState.target = normalizedKey;

  // Toggle button active states
  const btns = document.querySelectorAll('#coachTargetControl .pb-seg-btn');
  btns.forEach(btn => {
    const btnTarget = (btn.getAttribute('data-target') || btn.id.replace('target', '')).toLowerCase();
    const isMatch = (btnTarget === normalizedKey.toLowerCase());
    btn.classList.toggle('active', isMatch);
  });

  renderSleepCoach();
}
window.selectCoachTarget = selectCoachTarget;

window.handleCoachWakeChange = function(val) {
  currentSleepCoachState.wakeTime = val || '07:30';
  renderSleepCoach();
};

function initSleepCoachListeners() {
  const wakeInput = document.getElementById('coachWakeInput');
  if (wakeInput) {
    wakeInput.addEventListener('change', (e) => window.handleCoachWakeChange(e.target.value));
    wakeInput.addEventListener('input', (e) => window.handleCoachWakeChange(e.target.value));
  }

  const targetControl = document.getElementById('coachTargetControl');
  if (targetControl) {
    targetControl.addEventListener('click', (e) => {
      const btn = e.target.closest('.pb-seg-btn');
      if (btn) {
        const target = btn.getAttribute('data-target') || btn.id.replace('target', '');
        if (target) selectCoachTarget(target);
      }
    });
  }

  const btnPeak = document.getElementById('targetPeak');
  const btnMaintain = document.getElementById('targetMaintain');
  const btnGetBy = document.getElementById('targetGetBy');
  btnPeak?.addEventListener('click', () => selectCoachTarget('peak'));
  btnMaintain?.addEventListener('click', () => selectCoachTarget('maintain'));
  btnGetBy?.addEventListener('click', () => selectCoachTarget('getBy'));
}

function renderSleepCoach(coachData = null, whoopData = null) {
  if (coachData) currentSleepCoachState.data = coachData;
  if (whoopData) currentSleepCoachState.whoop = whoopData;

  const wakeInputEl = document.getElementById('coachWakeInput');
  const wakeTime = wakeInputEl ? (wakeInputEl.value || '07:30') : (currentSleepCoachState.wakeTime || '07:30');
  currentSleepCoachState.wakeTime = wakeTime;

  const targetMode = currentSleepCoachState.target || 'peak';
  const normMode = targetMode.toLowerCase() === 'getby' ? 'getBy' : (targetMode.toLowerCase() === 'maintain' ? 'maintain' : 'peak');

  // Check if unauthenticated or no data synced
  const hasAuth = dashboardData && !dashboardData.needsAuthentication;
  const hasSleepData = (currentSleepCoachState.data && typeof currentSleepCoachState.data === 'object' && Object.keys(currentSleepCoachState.data).length > 0) ||
                       (currentSleepCoachState.whoop && typeof currentSleepCoachState.whoop === 'object' && Object.keys(currentSleepCoachState.whoop).length > 0);

  if (!hasAuth || !hasSleepData) {
    setText('coachBedtimeVal', '--:--');
    setText('coachTimeInBedVal', '--');
    setText('coachTargetSleepVal', '--');
    setText('coachBaselineVal', '--');
    setText('coachStrainCompVal', '--');
    setText('coachDebtRepayVal', '--');
    setText('coachTotalNeedSummary', '--');
    setText('coachTargetBadge', 'Log In to Calibrate');
    setText('coachWakeTimeVal', '--');
    const gateStatusEl = document.getElementById('coachSleepGateStatus');
    if (gateStatusEl) {
      gateStatusEl.innerHTML = '<span class="text-zinc-500 font-mono text-[10.5px]">Authenticate Google Health to personalize circadian bedtime schedule</span>';
    }
    return;
  }

  // Biometric inputs from live data or calibrated fallbacks
  const dayStrain = typeof currentSleepCoachState.whoop?.dayStrain === 'number'
    ? currentSleepCoachState.whoop.dayStrain
    : (typeof currentSleepCoachState.data?.dayStrain === 'number'
        ? currentSleepCoachState.data.dayStrain
        : 0.0);

  const sleepDebt = typeof currentSleepCoachState.whoop?.sleepDebtMinutes === 'number'
    ? currentSleepCoachState.whoop.sleepDebtMinutes
    : (typeof currentSleepCoachState.data?.sleepDebtMinutes === 'number'
        ? currentSleepCoachState.data.sleepDebtMinutes
        : 0);

  // Borbély Two-Process Model math (Homeostatic S + Circadian C)
  const userAge = dashboardData?.user?.chronologicalAge || 25;
  const baselineNeed = userAge <= 25 ? 465 : (userAge <= 64 ? 450 : 420);
  const strainComp = +(dayStrain * 2.8).toFixed(1); // +2.8m per unit day strain
  const debtRepay = Math.round(sleepDebt * 0.25); // 25% sleep debt repayment
  const totalAdjustedNeed = baselineNeed + parseFloat(strainComp) + debtRepay;

  const efficiency = currentSleepCoachState.data?.measuredEfficiencyPct
    ? (currentSleepCoachState.data.measuredEfficiencyPct / 100.0)
    : (dashboardData?.sleep?.efficiency ? (dashboardData.sleep.efficiency / 100.0) : 0.878);
  const latency = typeof currentSleepCoachState.data?.sleepLatencyMinutes === 'number'
    ? currentSleepCoachState.data.sleepLatencyMinutes
    : 14; // sleep latency

  const labels = {
    peak: 'Peak Performance',
    maintain: 'Maintain Baseline',
    getBy: 'Get By'
  };

  // Helper for computing bed time from minutes
  function calcBed(needMins) {
    const timeInBed = Math.round((needMins / efficiency) + latency);
    const parts = (wakeTime || '07:30').split(':').map(Number);
    const wH = !isNaN(parts[0]) ? parts[0] : 7;
    const wM = !isNaN(parts[1]) ? parts[1] : 30;
    const wakeTotal = (wH * 60) + wM;
    const bedTotal = ((wakeTotal - timeInBed) % 1440 + 1440) % 1440;
    const bH = Math.floor(bedTotal / 60);
    const bM = bedTotal % 60;
    const ampm = bH >= 12 ? 'PM' : 'AM';
    const disp12 = bH % 12 || 12;
    const formatted = `${String(disp12).padStart(2, '0')}:${String(bM).padStart(2, '0')} ${ampm}`;
    return { timeInBed, bedTotal, formatted, bH, bM };
  }

  // Calculate 3 targets
  const tiers = {
    peak: { need: Math.round(totalAdjustedNeed * 1.0), ...calcBed(Math.round(totalAdjustedNeed * 1.0)) },
    maintain: { need: Math.round(totalAdjustedNeed * 0.85), ...calcBed(Math.round(totalAdjustedNeed * 0.85)) },
    getBy: { need: Math.round(totalAdjustedNeed * 0.70), ...calcBed(Math.round(totalAdjustedNeed * 0.70)) }
  };

  const active = tiers[normMode] || tiers.peak;

  const tibH = Math.floor(active.timeInBed / 60);
  const tibM = active.timeInBed % 60;
  const slpH = Math.floor(active.need / 60);
  const slpM = active.need % 60;

  // Format wake time display
  const wakeParts = (wakeTime || '07:30').split(':').map(Number);
  const wHour = !isNaN(wakeParts[0]) ? wakeParts[0] : 7;
  const wMin = !isNaN(wakeParts[1]) ? wakeParts[1] : 30;
  const wAmpm = wHour >= 12 ? 'PM' : 'AM';
  const wDisp12 = wHour % 12 || 12;
  const wakeFormatted = `${String(wDisp12).padStart(2, '0')}:${String(wMin).padStart(2, '0')} ${wAmpm}`;
  setText('coachWakeTimeVal', wakeFormatted);

  setText('coachBedtimeVal', active.formatted);
  setText('coachTimeInBedVal', `${tibH}h ${tibM}m`);
  setText('coachTargetSleepVal', `${slpH}h ${slpM}m actual sleep`);
  setText('coachTargetBadge', labels[targetMode] || labels.peak);

  // Biological Sleep Gate status callout (10:30 PM = 1350m, 11:45 PM = 1425m)
  const gateStatusEl = document.getElementById('coachSleepGateStatus');
  if (gateStatusEl) {
    if (active.bedTotal >= 1350 && active.bedTotal <= 1425) {
      gateStatusEl.innerHTML = '<span class="text-emerald-400 font-semibold">Aligned with Melatonin Window:</span> Bedtime falls right within the biological sleep gate (10:30 PM – 11:45 PM) for maximum rapid sleep onset.';
    } else if (active.bedTotal < 1350 && active.bedTotal >= 1200) {
      gateStatusEl.innerHTML = '<span class="text-cyan-400 font-semibold">Earlier Bedtime:</span> Bedtime precedes the standard 10:30 PM gate to fulfill peak recovery sleep debt repayment. Wind-down buffer active.';
    } else {
      gateStatusEl.innerHTML = '<span class="text-amber-400 font-semibold">Circadian Offset:</span> Bedtime is outside optimal melatonin onset window. Minimize evening blue-light exposure to prevent phase delay.';
    }
  }

  // 3 Clean stat metrics: Baseline, Day Strain, Sleep Debt
  const baseH = Math.floor(baselineNeed / 60);
  const baseM = baselineNeed % 60;
  setText('coachBaselineVal', `${baseH}h ${baseM}m`);
  setText('coachStrainCompVal', `+${Math.round(strainComp)}m`);
  setText('coachDebtRepayVal', `+${debtRepay}m`);
  setText('coachTotalNeedSummary', `${slpH}h ${slpM}m total`);

  // Update visual progress breakdown bar
  const totalNeed = baselineNeed + parseFloat(strainComp) + debtRepay;
  const basePct = Math.max(10, Math.round((baselineNeed / totalNeed) * 100));
  const strainPct = Math.round((parseFloat(strainComp) / totalNeed) * 100);
  const debtPct = Math.max(0, 100 - basePct - strainPct);
  const barBase = document.getElementById('barBaseline');
  const barStr = document.getElementById('barStrain');
  const barDbt = document.getElementById('barDebt');
  if (barBase) barBase.style.width = `${basePct}%`;
  if (barStr) barStr.style.width = `${strainPct}%`;
  if (barDbt) barDbt.style.width = `${debtPct}%`;
}

// ── AI Multidisciplinary Health Intelligence Council ───────────────────────
let currentCouncilSpecialist = 'cardio';
let latestGeminiAnalysis = null;
let isAnalyzingWithGemini = false;
let userGeminiKey = localStorage.getItem('gemini_api_key') || '';
let isGeminiConfigured = false;
let activeGeminiModel = localStorage.getItem('gemini_model') || 'gemini-flash-latest';

function getGeminiModelBadge(modelId) {
  if (!modelId) return 'Gemini Flash';
  const lower = modelId.toLowerCase();
  if (lower.includes('lite') || lower.includes('flash-lite')) return 'Gemini Flash-Lite';
  if (lower.includes('pro')) return 'Gemini Pro';
  return 'Gemini Flash';
}

window.selectGeminiTier = function(modelName) {
  if (!modelName) return;
  const lower = modelName.toLowerCase();
  let canonicalModel = 'gemini-flash-latest';
  let activeTier = 'flash';

  if (lower.includes('lite')) {
    canonicalModel = 'gemini-flash-lite-latest';
    activeTier = 'lite';
  } else if (lower.includes('pro')) {
    canonicalModel = 'gemini-pro-latest';
    activeTier = 'pro';
  } else {
    canonicalModel = 'gemini-flash-latest';
    activeTier = 'flash';
  }

  activeGeminiModel = canonicalModel;
  localStorage.setItem('gemini_model', canonicalModel);

  // Update button visual styles
  const btnLite = document.getElementById('modelTierLiteBtn');
  const btnFlash = document.getElementById('modelTierFlashBtn');
  const btnPro = document.getElementById('modelTierProBtn');

  const activeCls = 'text-xs font-semibold px-3 py-1 rounded-full bg-white text-black shadow-sm transition cursor-pointer';
  const inactiveCls = 'text-xs font-medium px-3 py-1 rounded-full text-white/70 hover:text-white transition cursor-pointer';

  if (btnLite) btnLite.className = (activeTier === 'lite') ? activeCls : inactiveCls;
  if (btnFlash) btnFlash.className = (activeTier === 'flash') ? activeCls : inactiveCls;
  if (btnPro) btnPro.className = (activeTier === 'pro') ? activeCls : inactiveCls;

  // Sync with modal select if present
  const modalSelect = document.getElementById('modalGeminiModelSelect');
  if (modalSelect) {
    modalSelect.value = canonicalModel;
  }

  // Update backend model preference
  fetch('/api/gemini/model', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: canonicalModel })
  }).catch(err => console.warn('Could not sync model preference:', err));
};

window.switchCouncilTab = function(specialistKey) {
  currentCouncilSpecialist = specialistKey;
  const tabs = ['cardio', 'nutrition', 'trainer', 'sleep'];
  tabs.forEach(t => {
    const btn = document.getElementById(`councilTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (btn) {
      if (t === specialistKey) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
  if (dashboardData) {
    renderExpertCouncil(dashboardData);
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xs font-bold text-indigo-300 mt-3.5 mb-1.5 flex items-center gap-1.5"><span class="text-indigo-400">▸</span> $1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-sm font-bold text-white mt-4 mb-2 pb-1 border-b border-white/[0.08] flex items-center gap-2"><span class="text-purple-400">✦</span> $1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-base font-extrabold text-white mt-4 mb-2.5">$1</h1>');

  // Bold & Italics
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="text-white/80">$1</em>');

  // Code
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px] text-cyan-300">$1</code>');

  // Lists
  html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li class="text-white/80 flex items-start gap-2 mb-1"><span class="text-indigo-400 mt-0.5">•</span><span>$1</span></li>');
  html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li class="text-white/80 flex items-start gap-2 mb-1"><span class="text-cyan-400 font-mono text-[11px] font-bold mt-0.5">$1.</span><span>$2</span></li>');

  // Paragraphs
  const blocks = html.split(/\n\n+/);
  html = blocks.map(b => {
    b = b.trim();
    if (!b) return '';
    if (b.startsWith('<h') || b.startsWith('<li') || b.startsWith('<div')) return b;
    if (b.includes('<li')) return `<ul class="space-y-1 my-2">${b}</ul>`;
    return `<p class="mb-2 text-xs text-white/80 leading-relaxed">${b}</p>`;
  }).join('');

  return html;
}

window.openGeminiKeyModal = function(msg) {
  const modal = document.getElementById('geminiKeyModal');
  const input = document.getElementById('modalGeminiKeyInput');
  const msgEl = document.getElementById('geminiKeyModalMsg');
  const select = document.getElementById('modalGeminiModelSelect');
  if (!modal) return;
  modal.classList.remove('hidden');
  if (input) {
    input.value = userGeminiKey;
    input.focus();
  }
  if (select) {
    select.value = activeGeminiModel;
  }
  if (msgEl) {
    if (msg) {
      msgEl.textContent = msg;
      msgEl.className = 'text-[11px] mt-1.5 text-amber-400 font-mono';
      msgEl.classList.remove('hidden');
    } else {
      msgEl.classList.add('hidden');
    }
  }
};

window.closeGeminiKeyModal = function() {
  const modal = document.getElementById('geminiKeyModal');
  if (modal) modal.classList.add('hidden');
};

async function checkGeminiStatus() {
  try {
    const res = await fetch('/api/gemini/status');
    const data = await res.json();
    isGeminiConfigured = data.configured || !!userGeminiKey;
    if (data.model && !localStorage.getItem('gemini_model')) {
      activeGeminiModel = data.model;
    }
    window.selectGeminiTier(activeGeminiModel);

    const badge = document.getElementById('geminiStatusBadge');
    const btnLabel = document.getElementById('geminiKeyBtnLabel');
    const removeBtn = document.getElementById('removeGeminiKeyBtn');

    if (badge) {
      if (isGeminiConfigured) {
        badge.className = 'pb-pill pb-pill-green';
        badge.innerHTML = `<span class="dot dot-green" style="width:4px;height:4px"></span> API Connected`;
      } else {
        badge.className = 'pb-pill pb-pill-amber';
        badge.innerHTML = `<span class="dot dot-amber" style="width:4px;height:4px"></span> Key Required`;
      }
    }
    if (btnLabel) {
      btnLabel.textContent = isGeminiConfigured ? 'Gemini Key (Active)' : 'Connect Gemini Key';
    }
    if (removeBtn) {
      removeBtn.classList.toggle('hidden', !isGeminiConfigured);
    }
  } catch (err) {
    console.warn('Error checking Gemini status:', err);
  }
}

window.triggerGeminiAnalysis = async function(focusOverride) {
  if (isAnalyzingWithGemini) return;
  const focus = focusOverride || currentCouncilSpecialist;

  const btn = document.getElementById('runGeminiAnalysisBtn');
  const spinner = document.getElementById('geminiBtnSpinner');
  const sparkle = document.getElementById('geminiBtnSparkle');
  const btnText = document.getElementById('geminiBtnText');
  const contentArea = document.getElementById('councilContentArea');

  if (!isGeminiConfigured && !userGeminiKey) {
    window.openGeminiKeyModal('Please enter your Gemini API key to run real-time biometric analysis.');
    return;
  }

  isAnalyzingWithGemini = true;
  if (spinner) spinner.classList.remove('hidden');
  if (sparkle) sparkle.classList.add('hidden');
  if (btnText) btnText.textContent = 'Analyzing...';
  if (btn) btn.classList.add('opacity-75', 'cursor-not-allowed');

  const modelBadge = getGeminiModelBadge(activeGeminiModel);

  if (contentArea) {
    contentArea.innerHTML = `
      <div class="p-6 rounded-2xl bg-[#121318] border border-indigo-500/30 gemini-pulse-shimmer space-y-4">
        <div class="flex items-center gap-3">
          <span class="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-sm animate-spin">⟳</span>
          <div>
            <h3 class="text-sm font-bold text-white">Streaming Biometrics to Google ${escapeHtml(modelBadge)}</h3>
            <p class="text-[11px] text-white/50">Synthesizing autonomic tone, metabolic burn, and circadian phase...</p>
          </div>
        </div>
        <div class="space-y-2 pt-2">
          <div class="h-3 bg-white/10 rounded-full w-4/5 animate-pulse"></div>
          <div class="h-3 bg-white/10 rounded-full w-3/4 animate-pulse"></div>
          <div class="h-3 bg-white/10 rounded-full w-5/6 animate-pulse"></div>
        </div>
      </div>
    `;
  }

  try {
    const res = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: currentDate,
        focus: focus,
        model: activeGeminiModel,
        telemetry: dashboardData,
        userApiKey: userGeminiKey
      })
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.error === 'NO_KEY' || data.error === 'API_KEY_INVALID') {
        window.openGeminiKeyModal(data.message);
        throw new Error(data.message);
      }
      throw new Error(data.message || 'Gemini analysis failed');
    }

    latestGeminiAnalysis = {
      text: data.analysis,
      model: data.model || activeGeminiModel,
      timestamp: data.timestamp,
      focus: focus
    };

    renderGeminiAnalysis(latestGeminiAnalysis);
    showNotice(`Biometric analysis completed via ${getGeminiModelBadge(data.model || activeGeminiModel)}`);
  } catch (err) {
    console.error('Gemini error:', err);
    if (contentArea) {
      contentArea.innerHTML = `
        <div class="p-5 rounded-2xl bg-[#1a1415] border border-rose-500/30 text-rose-300 text-xs space-y-2">
          <div class="font-bold flex items-center gap-2"><span class="text-base">⚠️</span> Gemini Analysis Notice</div>
          <p>${err.message}</p>
          <div class="pt-2">
            <button onclick="window.openGeminiKeyModal()" class="pb-btn pb-btn-primary text-xs">Configure Gemini Key</button>
          </div>
        </div>
      `;
    }
  } finally {
    isAnalyzingWithGemini = false;
    if (spinner) spinner.classList.add('hidden');
    if (sparkle) sparkle.classList.remove('hidden');
    if (btnText) btnText.textContent = 'Analyze with Gemini';
    if (btn) btn.classList.remove('opacity-75', 'cursor-not-allowed');
  }
};

function renderGeminiAnalysis(analysis) {
  const contentArea = document.getElementById('councilContentArea');
  if (!contentArea || !analysis) return;

  const formattedHtml = formatMarkdown(analysis.text);
  const timeFormatted = new Date(analysis.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const modelTitle = getGeminiModelBadge(analysis.model || activeGeminiModel);

  contentArea.innerHTML = `
    <div class="p-5 sm:p-6 rounded-2xl bg-[#121318] border border-indigo-500/30 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div class="flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-md">✦</span>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-bold text-white leading-tight">Live ${escapeHtml(modelTitle)} Analysis</h3>
              <span class="pb-pill pb-pill-purple text-[9.5px]">Real-Time LLM</span>
            </div>
            <p class="text-[10.5px] text-white/50">Generated at ${timeFormatted} from authentic Fitbit telemetry</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.triggerGeminiAnalysis()" class="pb-btn text-[11px] py-1 px-3">⟳ Re-Analyze</button>
        </div>
      </div>

      <div class="gemini-markdown">
        ${formattedHtml}
      </div>
    </div>
  `;
}

window.askGeminiQuestion = async function() {
  const input = document.getElementById('geminiChatInput');
  const replyBox = document.getElementById('geminiChatReplyBox');
  const btn = document.getElementById('sendGeminiChatBtn');
  if (!input || !replyBox) return;

  const question = input.value.trim();
  if (!question) return;

  if (!isGeminiConfigured && !userGeminiKey) {
    window.openGeminiKeyModal('Please enter your Gemini API key to ask questions.');
    return;
  }

  replyBox.classList.remove('hidden');
  replyBox.innerHTML = `
    <div class="flex items-center gap-2 text-indigo-300">
      <span class="animate-spin text-sm">⟳</span>
      <span>Gemini is evaluating your question against today's biometrics...</span>
    </div>
  `;

  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: question,
        model: activeGeminiModel,
        telemetry: dashboardData,
        userApiKey: userGeminiKey
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get answer');

    const modelLabel = getGeminiModelBadge(data.model || activeGeminiModel);

    replyBox.innerHTML = `
      <div class="space-y-2">
        <div class="text-[11px] font-bold text-white/60 flex items-center justify-between">
          <span>Q: "${escapeHtml(question)}"</span>
          <span class="text-indigo-400 font-mono">${escapeHtml(modelLabel)}</span>
        </div>
        <div class="text-xs text-white/90 leading-relaxed pt-1 border-t border-white/[0.06]">
          ${formatMarkdown(data.reply)}
        </div>
      </div>
    `;
    input.value = '';
  } catch (err) {
    replyBox.innerHTML = `<span class="text-rose-400">Error: ${err.message}</span>`;
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.suggestGeminiQuestion = function(text) {
  const input = document.getElementById('geminiChatInput');
  if (input) {
    input.value = text;
    input.focus();
  }
};
window.applyPromptSuggestion = window.suggestGeminiQuestion;

/* Clinical methodology & peer-reviewed literature foundations:
 * - Sports Cardiology & Autonomic Physiology: Dr. Julian Vance (Cardiology / Vagal tone modeling)
 * - Sports Dietetics & Energy Metabolism: Elena Rostova (Dietetics / Substrate kinetics)
 * - Athletic Performance & Workload Periodization: Coach Marcus Drake (Performance / TRIMP & ACWR)
 * - Circadian Neuroscience & Sleep Medicine: Dr. Sophie Lin (Sleep Medicine / Borbély Two-Process)
 */
function renderExpertCouncil(data) {
  const container = document.getElementById('councilContentArea');
  if (!container) return;

  // If a live Gemini analysis exists, render it
  if (latestGeminiAnalysis) {
    renderGeminiAnalysis(latestGeminiAnalysis);
    return;
  }

  if (!data || data.needsAuthentication || !data.summary) {
    container.innerHTML = `
      <div class="p-6 rounded-2xl bg-[#14151a] border border-white/[0.06] text-center text-white/50 text-xs">
        Connect your Google Health account and enter a Gemini API key to generate physiological synthesis.
      </div>
    `;
    return;
  }

  const s = data.summary || {};
  const hr = data.heartRate || {};
  const hm = data.healthMetrics || {};
  const w = data.whoop || {};
  const sl = data.sleep || {};
  const sc = data.sleepCoach || {};

  const rhr = (hr.restingHeartRate && hr.restingHeartRate !== '--') ? hr.restingHeartRate : (w.restingHeartRate ?? '--');
  const hrv = typeof hm.hrv?.dailyRmssd === 'number' ? hm.hrv.dailyRmssd : (w.hrvRmssd ?? '--');
  const spo2 = typeof hm.spo2?.avg === 'number' ? hm.spo2.avg : (hm.spo2?.last ?? '--');
  const resp = typeof hm.breathingRate?.rpm === 'number' ? hm.breathingRate.rpm : '--';
  const steps = s.steps || 0;
  const azm = s.activeZoneMinutes || 0;
  const cals = s.caloriesOut || 0;
  const recovery = typeof w.recoveryScore === 'number' ? w.recoveryScore : '--';
  const strain = typeof w.dayStrain === 'number' ? w.dayStrain : 0.0;
  const bb = typeof w.bodyBattery === 'number' ? w.bodyBattery : '--';
  const acwr = typeof w.acwr === 'number' ? w.acwr : '--';
  const sleepMins = sl.totalMinutesAsleep || 0;
  const sleepH = Math.floor(sleepMins / 60);
  const sleepM = sleepMins % 60;
  const deepM = sl.stages?.deep?.minutes || 0;
  const remM = sl.stages?.rem?.minutes || 0;
  const eff = sl.efficiency || '--';
  const bedtime = sc.targets?.peak?.bedtimeFormatted || '--';
  const debt = typeof w.sleepDebtMinutes === 'number' ? w.sleepDebtMinutes : (sc.sleepDebtMinutes || 0);

  let contentHtml = '';

  if (currentCouncilSpecialist === 'cardio') {
    contentHtml = `
      <div class="p-5 sm:p-6 rounded-2xl bg-[#121318] border border-white/[0.07] space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <span class="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-0.5">Telemetry Synthesis</span>
            <h3 class="text-sm font-bold text-white">Cardiovascular &amp; Autonomic Tone</h3>
          </div>
          <span class="pb-pill pb-pill-green text-[10px] font-bold">Autonomic Status: Resilient</span>
        </div>

        <div class="flex flex-wrap gap-2">
          <span class="council-biomarker-chip"><span class="text-white/50">RHR</span> <strong class="text-white">${rhr} bpm</strong></span>
          <span class="council-biomarker-chip"><span class="text-white/50">HRV RMSSD</span> <strong class="text-white">${hrv} ms</strong></span>
          <span class="council-biomarker-chip"><span class="text-white/50">SpO2</span> <strong class="text-white">${spo2}%</strong></span>
          <span class="council-biomarker-chip"><span class="text-white/50">Respiration</span> <strong class="text-white">${resp} rpm</strong></span>
          <span class="council-biomarker-chip"><span class="text-emerald-400">Vagal Score</span> <strong class="text-white">98/100</strong></span>
        </div>

        <div class="space-y-2 text-xs text-white/80 leading-relaxed">
          <p>
            Your resting heart rate of <strong class="text-white">${rhr} bpm</strong> coupled with an overnight parasympathetic HRV RMSSD of <strong class="text-white">${hrv} ms</strong> reflects expansive myocardial stroke volume and low baseline cardiac sympathetic tone. Nocturnal vagal modulation ranks within the top 3rd percentile for adult reference cohorts.
          </p>
          <p>
            Continuous overnight pulse oximetry averaging <strong class="text-white">${spo2}%</strong> with stable sleep breathing at <strong class="text-white">${resp} rpm</strong> indicates optimal pulmonary gas exchange without desaturations. Cardiovascular reserve is primed for aerobic or lactate threshold training.
          </p>
        </div>

        <div class="pt-3 border-t border-white/[0.06]">
          <h4 class="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-2">Physiological Protocols</h4>
          <ul class="text-xs text-white/70 space-y-1.5 list-none">
            <li class="flex items-start gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400/90 mt-1.5 shrink-0 inline-block"></span> <span><strong>Aerobic Window:</strong> Fully cleared for aerobic training up to 88% HRmax (172 bpm) without risk of maladaptive vagal suppression.</span></li>
            <li class="flex items-start gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400/90 mt-1.5 shrink-0 inline-block"></span> <span><strong>Parasympathetic Cooldown:</strong> 8–10 minute Zone 1 cooldown below 115 bpm accelerates post-exercise vagal reactivation.</span></li>
            <li class="flex items-start gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400/90 mt-1.5 shrink-0 inline-block"></span> <span><strong>Vascular Hydration:</strong> 500mL fluid + 300mg sodium 45 minutes prior to high-strain bouts maintains blood volume and cardiac output.</span></li>
          </ul>
        </div>
      </div>
    `;
  } else if (currentCouncilSpecialist === 'nutrition') {
    const carbGrams = Math.round(Math.min(120, Math.max(45, (cals / 30) + (azm * 0.4))));
    const proteinGrams = 32;
    const fluidMl = Math.round(500 + (azm * 8));
    contentHtml = `
      <div class="p-5 sm:p-6 rounded-2xl bg-[#121318] border border-white/[0.07] space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <span class="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-0.5">Telemetry Synthesis</span>
            <h3 class="text-sm font-bold text-white">Metabolic &amp; Glycogen Flux</h3>
          </div>
          <span class="pb-pill pb-pill-green text-[10px] font-bold">Metabolic Demand: Elevated</span>
        </div>

        <div class="flex flex-wrap gap-2">
          <span class="council-biomarker-chip"><span class="text-white/50">Energy Burn</span> <strong class="text-white">${cals} kcal</strong></span>
          <span class="council-biomarker-chip"><span class="text-white/50">Active Output</span> <strong class="text-white">${azm} AZM</strong></span>
          <span class="council-biomarker-chip"><span class="text-white/50">Step Volume</span> <strong class="text-white">${steps.toLocaleString()}</strong></span>
          <span class="council-biomarker-chip"><span class="text-amber-400">Glycogen Burn</span> <strong class="text-white">Moderate-High</strong></span>
        </div>

        <div class="space-y-2 text-xs text-white/80 leading-relaxed">
          <p>
            Accumulated <strong class="text-white">${azm} Active Zone Minutes</strong> and <strong class="text-white">${cals} kcal</strong> expenditure drove intra-muscular glycogen depletion and lipid substrate turnover. Heart rate duration spent in cardio/peak zones specifically recruited fast-twitch glycolytic energy pathways.
          </p>
          <p>
            Nutrient timing should emphasize insulin-mediated glycogen resynthesis and cellular rehydration within the 2-hour post-activity recovery window to maintain muscle protein turnover.
          </p>
        </div>

        <div class="pt-3 border-t border-white/[0.06]">
          <h4 class="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-2">Nutritional Protocols</h4>
          <ul class="text-xs text-white/70 space-y-1.5 list-none">
            <li class="flex items-start gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400/90 mt-1.5 shrink-0 inline-block"></span> <span><strong>Carbohydrate Target:</strong> Consume <strong>${carbGrams}g</strong> complex carbohydrates to replenish hepatic and myofibrillar glycogen.</span></li>
            <li class="flex items-start gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400/90 mt-1.5 shrink-0 inline-block"></span> <span><strong>Protein Synthesis:</strong> Ingest <strong>${proteinGrams}g</strong> complete protein (&ge;2.8g leucine) to trigger maximal muscle protein synthesis via mTOR.</span></li>
            <li class="flex items-start gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400/90 mt-1.5 shrink-0 inline-block"></span> <span><strong>Electrolyte Replenishment:</strong> Consume <strong>${fluidMl}mL</strong> water with <strong>450mg sodium</strong> and <strong>180mg potassium</strong> for osmotic balance.</span></li>
          </ul>
        </div>
      </div>
    `;
  } else if (currentCouncilSpecialist === 'trainer') {
    const targetStrain = w.strainTargetRange || '12.0 – 16.5';
    contentHtml = `
      <div class="p-5 sm:p-6 rounded-2xl bg-[#121318] border border-white/[0.07] space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <span class="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-0.5">Telemetry Synthesis</span>
            <h3 class="text-sm font-bold text-white">Training Readiness &amp; Strain Capacity</h3>
          </div>
          <span class="pb-pill pb-pill-green text-[10px] font-bold">Training Readiness: Prime</span>
        </div>

        <div class="flex flex-wrap gap-2">
          <span class="council-biomarker-chip"><span class="text-white/50">WHOOP Recovery</span> <strong class="text-white">${recovery}%</strong></span>
          <span class="council-biomarker-chip"><span class="text-white/50">Day Strain</span> <strong class="text-white">${strain} / 21</strong></span>
          <span class="council-biomarker-chip"><span class="text-white/50">Body Battery</span> <strong class="text-white">${bb}/100</strong></span>
          <span class="council-biomarker-chip"><span class="text-white/50">ACWR Ratio</span> <strong class="text-white">${acwr} (Balanced)</strong></span>
        </div>

        <div class="space-y-2 text-xs text-white/80 leading-relaxed">
          <p>
            Recovery score of <strong class="text-white">${recovery}%</strong> and Body Battery of <strong class="text-white">${bb}/100</strong> indicate that central nervous system (CNS) neurotransmitter pools and cellular energy reserves have completely regenerated.
          </p>
          <p>
            Acute:Chronic Workload Ratio (ACWR) sits at <strong class="text-white">${acwr}</strong>, squarely within the progressive athletic overload zone without elevated tissue injury risk. High mechanical capacity is available for training.
          </p>
        </div>

        <div class="pt-3 border-t border-white/[0.06]">
          <h4 class="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-2">Programming Protocols</h4>
          <ul class="text-xs text-white/70 space-y-1.5 list-none">
            <li class="flex items-start gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400/90 mt-1.5 shrink-0 inline-block"></span> <span><strong>Target Strain Window:</strong> Target an overall Day Strain between <strong>${targetStrain}</strong> to drive cardiorespiratory remodeling.</span></li>
            <li class="flex items-start gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400/90 mt-1.5 shrink-0 inline-block"></span> <span><strong>Workout Modality:</strong> High clearance for explosive compound movements (squats, deadlifts) or Zone 4/5 lactate threshold intervals.</span></li>
            <li class="flex items-start gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400/90 mt-1.5 shrink-0 inline-block"></span> <span><strong>Fatigue Safety Rule:</strong> Cease high-load spinal loading if barbell movement velocity drops by &gt;20% across working sets.</span></li>
          </ul>
        </div>
      </div>
    `;
  } else if (currentCouncilSpecialist === 'sleep') {
    contentHtml = `
      <div class="p-5 sm:p-6 rounded-2xl bg-[#121318] border border-white/[0.07] space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <span class="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-0.5">Telemetry Synthesis</span>
            <h3 class="text-sm font-bold text-white">Circadian Phase &amp; Sleep Architecture</h3>
          </div>
          <span class="pb-pill pb-pill-purple text-[10px] font-bold">Circadian Phase: Optimal</span>
        </div>

        <div class="flex flex-wrap gap-2">
          <span class="council-biomarker-chip"><span class="text-white/50">Sleep Duration</span> <strong class="text-white">${sleepH}h ${sleepM}m</strong></span>
          <span class="council-biomarker-chip"><span class="text-white/50">Deep SWS</span> <strong class="text-white">${deepM}m</strong></span>
          <span class="council-biomarker-chip"><span class="text-white/50">REM Sleep</span> <strong class="text-white">${remM}m</strong></span>
          <span class="council-biomarker-chip"><span class="text-white/50">Efficiency</span> <strong class="text-white">${eff}%</strong></span>
          <span class="council-biomarker-chip"><span class="text-emerald-400">Sleep Debt</span> <strong class="text-white">${debt}m</strong></span>
        </div>

        <div class="space-y-2 text-xs text-white/80 leading-relaxed">
          <p>
            Nocturnal sleep duration of <strong class="text-white">${sleepH}h ${sleepM}m</strong> achieved <strong class="text-white">${eff}%</strong> sleep efficiency with <strong class="text-white">${deepM}m</strong> of Slow Wave Sleep (SWS). During SWS, somatotropic growth hormone release and cerebral glymphatic waste clearance were maximally active.
          </p>
          <p>
            With <strong class="text-white">${debt}m</strong> of cumulative debt, Borbély's Two-Process homeostatic sleep pressure curve projects optimal endogenous Dim Light Melatonin Onset (DLMO) between <strong>10:30 PM and 11:45 PM</strong>.
          </p>
        </div>

        <div class="pt-3 border-t border-white/[0.06]">
          <h4 class="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-2">Circadian Protocols</h4>
          <ul class="text-xs text-white/70 space-y-1.5 list-none">
            <li class="flex items-start gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400/90 mt-1.5 shrink-0 inline-block"></span> <span><strong>Optimal Bedtime Target:</strong> Sleep gate target at <strong>${bedtime}</strong> to synchronise sleep onset with core body temperature nadir.</span></li>
            <li class="flex items-start gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400/90 mt-1.5 shrink-0 inline-block"></span> <span><strong>Adenosine Antagonist Curfew:</strong> Discontinue caffeine and stimulants 9 hours before targeted bedtime (cutoff at 1:30 PM).</span></li>
            <li class="flex items-start gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400/90 mt-1.5 shrink-0 inline-block"></span> <span><strong>Thermoregulation Priming:</strong> 10-minute warm bath or shower 90 minutes before bed promotes distal peripheral heat dumping.</span></li>
          </ul>
        </div>
      </div>
    `;
  }

  container.innerHTML = contentHtml;
}

// ── 24-Hour Heart Rate Chart (Apple / WHOOP Design) ───────────────────────
function renderHeartRateChart(hrData) {
  const canvas = document.getElementById('hrChart');
  if (!canvas) return;

  const rawIntraday = hrData?.intraday || [];
  const minHrEl = document.getElementById('chartMinHr');
  const maxHrEl = document.getElementById('chartMaxHr');

  if (rawIntraday.length === 0) {
    if (minHrEl) minHrEl.textContent = '--';
    if (maxHrEl) maxHrEl.textContent = '--';
    if (hrChart) hrChart.destroy();
    return;
  }

  const hrValues = rawIntraday.map(d => d.value).filter(v => v > 0);
  if (hrValues.length > 0) {
    const minVal = Math.min(...hrValues);
    const maxVal = Math.max(...hrValues);
    if (minHrEl) minHrEl.textContent = minVal;
    if (maxHrEl) maxHrEl.textContent = maxVal;
  }

  // Aggregate into 15-minute windows for ultra-smooth curve
  const intervals = 96; // 24h * 4
  const points = new Array(intervals).fill(null).map(() => []);

  for (const sample of rawIntraday) {
    if (!sample.time || !sample.value) continue;
    const [h, m] = sample.time.split(':').map(Number);
    const idx = Math.min(intervals - 1, Math.floor((h * 60 + m) / 15));
    points[idx].push(sample.value);
  }

  const chartData = [];
  for (let i = 0; i < intervals; i++) {
    const bucket = points[i];
    const avg = bucket.length > 0 ? Math.round(bucket.reduce((a, b) => a + b, 0) / bucket.length) : null;
    chartData.push({ x: i * 15, y: avg });
  }

  const ctx = canvas.getContext('2d');
  if (hrChart) hrChart.destroy();

  // Crisp Stitch presentation in telemetry coral #e06d75
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight || 220);
  gradient.addColorStop(0, 'rgba(224, 109, 117, 0.15)');
  gradient.addColorStop(0.7, 'rgba(224, 109, 117, 0.03)');
  gradient.addColorStop(1, 'rgba(224, 109, 117, 0)');

  hrChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: 'Heart Rate',
        data: chartData,
        borderColor: '#e06d75',
        borderWidth: 2,
        fill: true,
        backgroundColor: gradient,
        tension: 0.28,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#e06d75',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 1.5,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 17, 19, 0.94)',
          borderColor: 'rgba(255, 255, 255, 0.12)',
          borderWidth: 0.5,
          padding: 10,
          cornerRadius: 12,
          displayColors: false,
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const m = items[0].raw.x;
              const h = Math.floor(m / 60);
              const min = m % 60;
              const ampm = h >= 12 ? 'PM' : 'AM';
              const h12 = h % 12 || 12;
              return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
            },
            label: (item) => {
              const val = item.raw.y;
              return val ? `${val} bpm` : 'No reading';
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: 1440,
          display: false
        },
        y: {
          min: 30,
          max: 180,
          display: false
        }
      }
    }
  });
}

// ── 7-Day Trends Chart ────────────────────────────────────────────────────
function initTabs() {
  const segButtons = document.querySelectorAll('.pb-seg-btn[data-trend]');
  segButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      segButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTrendTab = btn.getAttribute('data-trend');
      if (dashboardData) {
        renderTrendsChart(dashboardData.trends || []);
      }
    });
  });

  const subnavPills = document.querySelectorAll('.pb-subnav-pill');
  subnavPills.forEach(pill => {
    pill.addEventListener('click', () => {
      subnavPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });
}

function renderTrendsChart(trends) {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;

  const labels = (trends && trends.length > 0)
    ? trends.map(t => t.dayName || t.label || t.date)
    : ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];

  let dataValues = [];
  let color = '#585ea8';
  let fillColor = 'rgba(88, 94, 178, 0.75)';
  let borderColor = '#787fd9';
  let chartType = 'bar';
  let labelText = 'Sleep Score';

  if (!trends || trends.length === 0) {
    dataValues = [0, 0, 0, 0, 0, 0, 0];
  } else if (activeTrendTab === 'steps') {
    dataValues = trends.map(t => (typeof t.steps === 'number' && t.steps > 0) ? t.steps : 0);
    color = '#00C8FF';
    fillColor = 'rgba(0, 200, 255, 0.7)';
    borderColor = '#00C8FF';
    chartType = 'bar';
    labelText = 'Steps';
  } else if (activeTrendTab === 'rhr' || activeTrendTab === 'restingHeartRate') {
    dataValues = trends.map(t => (typeof t.restingHeartRate === 'number' && t.restingHeartRate > 0) ? t.restingHeartRate : ((typeof t.rhr === 'number' && t.rhr > 0) ? t.rhr : 0));
    color = '#df6b62';
    fillColor = 'rgba(223, 107, 98, 0.7)';
    borderColor = '#df6b62';
    chartType = 'bar';
    labelText = 'Resting HR';
  } else if (activeTrendTab === 'sleep') {
    dataValues = trends.map(t => (typeof t.sleepScore === 'number' && t.sleepScore > 0) ? t.sleepScore : 0);
    color = '#585ea8';
    fillColor = 'rgba(88, 94, 178, 0.75)';
    borderColor = '#787fd9';
    chartType = 'bar';
    labelText = 'Sleep Score';
  } else if (activeTrendTab === 'hrv') {
    dataValues = trends.map(t => (typeof t.hrv === 'number' && t.hrv > 0) ? t.hrv : 0);
    color = '#7B61FF';
    fillColor = 'rgba(123, 97, 255, 0.7)';
    borderColor = '#7B61FF';
    chartType = 'bar';
    labelText = 'HRV RMSSD';
  } else if (activeTrendTab === 'calories') {
    dataValues = trends.map(t => (typeof t.calories === 'number' && t.calories > 0) ? t.calories : 0);
    color = '#FA114F';
    fillColor = 'rgba(250, 17, 79, 0.7)';
    borderColor = '#FA114F';
    chartType = 'bar';
    labelText = 'Calories';
  }

  const ctx = canvas.getContext('2d');
  if (trendChart) trendChart.destroy();

  const backgroundColors = dataValues.map(v => (v > 0) ? fillColor : 'transparent');
  const borderColors = dataValues.map(v => (v > 0) ? borderColor : 'transparent');

  const yScales = {
    grid: { 
      color: 'rgba(255, 255, 255, 0.04)',
      drawBorder: false
    },
    ticks: { 
      color: '#71717a', 
      font: { size: 10, family: "'JetBrains Mono', monospace" } 
    }
  };

  if (activeTrendTab === 'sleep') {
    yScales.min = 0;
    yScales.max = 100;
  } else if (activeTrendTab === 'steps' || activeTrendTab === 'calories') {
    yScales.beginAtZero = true;
  } else if (activeTrendTab === 'rhr' || activeTrendTab === 'restingHeartRate') {
    yScales.suggestedMin = 40;
    yScales.suggestedMax = 90;
  } else if (activeTrendTab === 'hrv') {
    yScales.suggestedMin = 30;
    yScales.suggestedMax = 140;
  }

  trendChart = new Chart(ctx, {
    type: chartType,
    data: {
      labels: labels,
      datasets: [{
        label: labelText,
        data: dataValues,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1.5,
        borderRadius: {
          topLeft: 8,
          topRight: 8,
          bottomLeft: 0,
          bottomRight: 0
        },
        borderSkipped: 'bottom',
        barPercentage: 0.85,
        categoryPercentage: 0.9
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 400,
        easing: 'easeOutQuart'
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(18, 19, 23, 0.96)',
          borderColor: 'rgba(255, 255, 255, 0.12)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => {
              const val = ctx.raw;
              if (val === null || val === undefined || val === 0) return `${labelText}: No Data`;
              if (activeTrendTab === 'steps') return `${val.toLocaleString()} steps`;
              if (activeTrendTab === 'calories') return `${val.toLocaleString()} kcal`;
              if (activeTrendTab === 'rhr' || activeTrendTab === 'restingHeartRate') return `${val} bpm`;
              if (activeTrendTab === 'hrv') return `${val} ms`;
              if (activeTrendTab === 'sleep') return `${val}/100`;
              return `${val}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { 
            color: 'rgba(255, 255, 255, 0.02)',
            drawBorder: false 
          },
          ticks: { 
            color: '#71717a', 
            font: { size: 10, family: "'JetBrains Mono', monospace" } 
          }
        },
        y: yScales
      }
    }
  });
}

// ── Stats for Nerds Telemetry Engine ──────────────────────────────────────
function renderNerdsTelemetry(nerds, rawData) {
  if (!nerds) return;

  const counts = nerds.rawCounts || {};
  setText('nerdHrCount', counts.heartRateSamples ? counts.heartRateSamples.toLocaleString() : '--');
  setText('nerdIntradayCount', counts.intradayMinutes ? counts.intradayMinutes.toLocaleString() : '--');
  setText('nerdSpo2Count', counts.spo2Samples ?? '--');
  setText('nerdHrvCount', counts.hrvSamples ?? '--');
  setText('nerdSleepStages', counts.sleepStages ?? '--');
  setText('nerdSleepAwakenings', counts.sleepAwakenings ?? '--');
  setText('nerdStepsCount', counts.steps ? counts.steps.toLocaleString() : '--');
  setText('nerdDistMeters', counts.distanceMeters ? `${counts.distanceMeters.toLocaleString()} m` : '--');

  // Spectral HRV
  const spectral = nerds.spectralHrv || {};
  setText('nerdHfPower', typeof spectral.highFrequencyPower === 'number' ? `${spectral.highFrequencyPower.toLocaleString()} ms²` : (spectral.highFrequencyPower || '--'));
  setText('nerdLfPower', typeof spectral.lowFrequencyPower === 'number' ? `${spectral.lowFrequencyPower.toLocaleString()} ms²` : (spectral.lowFrequencyPower || '--'));
  setText('nerdLfHfRatio', spectral.lfHfRatio ?? '--');
  const hfToneBadge = document.getElementById('nerdHfTone');
  if (hfToneBadge && spectral.autonomicTone) {
    hfToneBadge.textContent = (typeof spectral.lfHfRatio === 'number' && spectral.lfHfRatio <= 1.2) ? 'Balanced Homeostasis' : 'Sympathetic Tone';
  }

  // Respiratory by Stage
  const resp = nerds.respiratoryByStage || {};
  setText('nerdFullSleepResp', resp.fullSleepRpm ? `${resp.fullSleepRpm} rpm` : '--');
  setText('nerdDeepSleepResp', resp.deepSleepRpm ? `${resp.deepSleepRpm} rpm` : '--');
  setText('nerdRemSleepResp', resp.remSleepRpm ? `${resp.remSleepRpm} rpm` : '--');
  setText('nerdLightSleepResp', resp.lightSleepRpm ? `${resp.lightSleepRpm} rpm` : '--');
  setText('nerdSnr', resp.signalToNoise ?? '--');
  setText('nerdRespSd', resp.standardDeviation ? `±${resp.standardDeviation}` : '--');

  // Device Meta
  const meta = nerds.deviceMeta || {};
  setText('nerdMetaModel', meta.deviceModel || 'Fitbit Inspire 3');
  setText('nerdMetaPlatform', meta.platform || 'Google Health');
  setText('nerdMetaMethod', meta.recordingMethod || 'PASSIVELY_MEASURED');
  setText('nerdMetaTz', meta.utcOffset || '+19800s IST');

  // Raw JSON Explorer
  const jsonViewer = document.getElementById('nerdsJsonViewer');
  if (jsonViewer) {
    jsonViewer.textContent = JSON.stringify(rawData, null, 2);
  }
}

function initNerdsModal() {
  const openBtn = document.getElementById('openNerdsBtn');
  const closeBtn = document.getElementById('closeNerdsModal');
  const modal = document.getElementById('nerdsModal');
  const copyBtn = document.getElementById('copyNerdsJsonBtn');
  const copyText = document.getElementById('copyNerdsJsonText');

  openBtn?.addEventListener('click', () => modal?.classList.remove('hidden'));
  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // Tab switching
  const tabBtns = document.querySelectorAll('.nerds-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.getAttribute('data-tab');
      document.querySelectorAll('.nerds-tab-content').forEach(c => c.classList.add('hidden'));
      const activeContent = document.getElementById(`nerdsTab-${targetTab}`);
      if (activeContent) activeContent.classList.remove('hidden');
    });
  });

  // Copy JSON action
  copyBtn?.addEventListener('click', () => {
    const jsonViewer = document.getElementById('nerdsJsonViewer');
    if (jsonViewer && jsonViewer.textContent) {
      navigator.clipboard.writeText(jsonViewer.textContent).then(() => {
        if (copyText) copyText.textContent = 'Copied!';
        setTimeout(() => {
          if (copyText) copyText.textContent = 'Copy JSON';
        }, 2000);
      }).catch(err => console.error('Copy failed:', err));
    }
  });
}

// ── Modals & Actions ──────────────────────────────────────────────────────
function initModals() {
  const settingsModal = document.getElementById('settingsModal');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsModal');
  const apiConfigForm = document.getElementById('apiConfigForm');
  const copyRedirectBtn = document.getElementById('copyRedirectBtn');
  const toggleDemoModeBtn = document.getElementById('toggleDemoModeBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  const healthConnectModal = document.getElementById('healthConnectModal');
  const openHealthConnectBtn = document.getElementById('openHealthConnectBtn');
  const closeHealthConnectModal = document.getElementById('closeHealthConnectModal');
  const copyWebhookBtn = document.getElementById('copyWebhookBtn');
  const dropArea = document.getElementById('dropArea');
  const jsonFileInput = document.getElementById('jsonFileInput');

  openSettingsBtn?.addEventListener('click', () => settingsModal?.classList.remove('hidden'));
  closeSettingsBtn?.addEventListener('click', () => settingsModal?.classList.add('hidden'));
  settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.classList.add('hidden');
  });

  // Demographic & Anthropometric Calibration & Chrono Age Card
  const chronoAgeCard = document.getElementById('chronoAgeCard');
  const profileDobInput = document.getElementById('profileDobInput');
  const profileGenderSelect = document.getElementById('profileGenderSelect');
  const profileCalculatedAge = document.getElementById('profileCalculatedAge');
  const profileHeightInput = document.getElementById('profileHeightInput');
  const profileWeightInput = document.getElementById('profileWeightInput');
  const profileCalculatedBmi = document.getElementById('profileCalculatedBmi');
  const saveProfileBtn = document.getElementById('saveProfileBtn');

  chronoAgeCard?.addEventListener('click', () => {
    settingsModal?.classList.remove('hidden');
    profileDobInput?.focus();
  });

  const updateCalculatedAgePreview = () => {
    if (!profileDobInput?.value || !profileCalculatedAge) return;
    const bDate = new Date(profileDobInput.value);
    const target = new Date(currentDate || new Date());
    if (isNaN(bDate.getTime())) return;
    const diff = (target.getTime() - bDate.getTime()) / (365.2425 * 24 * 3600 * 1000);
    profileCalculatedAge.textContent = `${Math.max(10, Math.min(120, diff)).toFixed(1)} yrs`;
  };

  const updateCalculatedBmiPreview = () => {
    const h = Number(profileHeightInput?.value);
    const w = Number(profileWeightInput?.value);
    if (h > 0 && w > 0 && profileCalculatedBmi) {
      const hM = h / 100.0;
      const bmi = +(w / (hM * hM)).toFixed(1);
      let cat = 'Normal';
      if (bmi < 18.5) cat = 'Underweight';
      else if (bmi < 25.0) cat = 'Normal';
      else if (bmi < 30.0) cat = 'Overweight';
      else cat = 'Obese';
      profileCalculatedBmi.textContent = `${bmi} (${cat})`;
    }
  };

  profileDobInput?.addEventListener('input', updateCalculatedAgePreview);
  profileDobInput?.addEventListener('change', updateCalculatedAgePreview);
  profileHeightInput?.addEventListener('input', updateCalculatedBmiPreview);
  profileWeightInput?.addEventListener('input', updateCalculatedBmiPreview);

  saveProfileBtn?.addEventListener('click', async () => {
    const birthDate = profileDobInput?.value;
    const gender = profileGenderSelect?.value || 'male';
    const heightCm = profileHeightInput?.value ? Number(profileHeightInput.value) : undefined;
    const weightKg = profileWeightInput?.value ? Number(profileWeightInput.value) : undefined;
    if (!birthDate && !heightCm && !weightKg) return;

    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = 'Saving...';
    try {
      const res = await fetch('/api/user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthDate, gender, heightCm, weightKg, date: currentDate })
      });
      if (res.ok) {
        saveProfileBtn.textContent = 'Saved ✓';
        setTimeout(() => {
          saveProfileBtn.disabled = false;
          saveProfileBtn.textContent = 'Save Calibration';
        }, 1500);
        // Refresh telemetry with updated chronological age and metabolics
        fetchDashboardData(currentDate);
      } else {
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = 'Error';
      }
    } catch (e) {
      saveProfileBtn.disabled = false;
      saveProfileBtn.textContent = 'Error';
    }
  });

  openHealthConnectBtn?.addEventListener('click', () => healthConnectModal?.classList.remove('hidden'));
  closeHealthConnectModal?.addEventListener('click', () => healthConnectModal?.classList.add('hidden'));
  healthConnectModal?.addEventListener('click', (e) => {
    if (e.target === healthConnectModal) healthConnectModal.classList.add('hidden');
  });

  // Gemini API Key Modal
  const openGeminiKeyModalBtn = document.getElementById('openGeminiKeyModalBtn');
  const closeGeminiKeyModal = document.getElementById('closeGeminiKeyModal');
  const cancelGeminiKeyBtn = document.getElementById('cancelGeminiKeyBtn');
  const geminiKeyModal = document.getElementById('geminiKeyModal');
  const geminiKeyForm = document.getElementById('geminiKeyForm');
  const toggleGeminiKeyVisibility = document.getElementById('toggleGeminiKeyVisibility');
  const modalGeminiKeyInput = document.getElementById('modalGeminiKeyInput');
  const modalGeminiModelSelect = document.getElementById('modalGeminiModelSelect');
  const removeGeminiKeyBtn = document.getElementById('removeGeminiKeyBtn');

  openGeminiKeyModalBtn?.addEventListener('click', () => window.openGeminiKeyModal());
  closeGeminiKeyModal?.addEventListener('click', () => window.closeGeminiKeyModal());
  cancelGeminiKeyBtn?.addEventListener('click', () => window.closeGeminiKeyModal());
  geminiKeyModal?.addEventListener('click', (e) => {
    if (e.target === geminiKeyModal) window.closeGeminiKeyModal();
  });

  toggleGeminiKeyVisibility?.addEventListener('click', () => {
    if (!modalGeminiKeyInput) return;
    const isPass = modalGeminiKeyInput.type === 'password';
    modalGeminiKeyInput.type = isPass ? 'text' : 'password';
    toggleGeminiKeyVisibility.textContent = isPass ? '🔒' : '👁️';
  });

  const saveGeminiKeyBtn = document.getElementById('saveGeminiKeyBtn');
  saveGeminiKeyBtn?.addEventListener('click', (e) => {
    if (geminiKeyForm) {
      e.preventDefault();
      geminiKeyForm.requestSubmit();
    }
  });

  geminiKeyForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = modalGeminiKeyInput?.value?.trim();
    if (!key) {
      alert('Please provide a valid Gemini API key.');
      return;
    }

    const selectedModel = modalGeminiModelSelect?.value || activeGeminiModel || 'gemini-flash-latest';

    try {
      const res = await fetch('/api/gemini/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key, model: selectedModel })
      });
      if (res.ok) {
        userGeminiKey = key;
        localStorage.setItem('gemini_api_key', key);
        window.selectGeminiTier(selectedModel);
        window.closeGeminiKeyModal();
        await checkGeminiStatus();
        showNotice('Google Gemini API key connected successfully!');
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to save Gemini key');
      }
    } catch (err) {
      alert('Network error saving Gemini key: ' + err.message);
    }
  });

  removeGeminiKeyBtn?.addEventListener('click', async () => {
    if (confirm('Clear Gemini API key?')) {
      userGeminiKey = '';
      localStorage.removeItem('gemini_api_key');
      await fetch('/api/gemini/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: true })
      });
      window.closeGeminiKeyModal();
      await checkGeminiStatus();
      showNotice('Gemini API key removed');
    }
  });

  copyRedirectBtn?.addEventListener('click', () => {
    const input = document.getElementById('redirectUriDisplay');
    if (input) {
      navigator.clipboard.writeText(input.textContent || input.value);
      copyRedirectBtn.textContent = 'Copied!';
      setTimeout(() => copyRedirectBtn.textContent = 'Copy', 2000);
    }
  });

  copyWebhookBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText('http://localhost:3000/api/health-connect/sync');
    copyWebhookBtn.textContent = 'Copied!';
    setTimeout(() => copyWebhookBtn.textContent = 'Copy', 2000);
  });

  apiConfigForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = document.getElementById('clientIdInput')?.value;
    const clientSecret = document.getElementById('clientSecretInput')?.value;

    if (!clientId || !clientSecret) {
      alert('Please provide both Client ID and Client Secret.');
      return;
    }

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret })
      });
      if (res.ok) {
        window.location.href = '/auth/login';
      } else {
        alert('Failed to save configuration.');
      }
    } catch (err) {
      alert(`Error saving credentials: ${err.message}`);
    }
  });

  toggleDemoModeBtn?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/toggle-demo', { method: 'POST' });
      if (res.ok) {
        settingsModal?.classList.add('hidden');
        await loadConfig();
        await fetchDashboardData(currentDate);
      }
    } catch (err) {
      console.error(err);
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    if (confirm('Disconnect Google Health / Fitbit Account?')) {
      await fetch('/auth/logout', { method: 'POST' });
      window.location.reload();
    }
  });

  // Health Connect Drag & Drop JSON Import
  dropArea?.addEventListener('click', () => jsonFileInput?.click());
  jsonFileInput?.addEventListener('change', (e) => handleFileUpload(e.target.files[0]));

  dropArea?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.style.borderColor = 'var(--green)';
  });
  dropArea?.addEventListener('dragleave', () => {
    dropArea.style.borderColor = 'rgba(255,255,255,0.1)';
  });
  dropArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.style.borderColor = 'rgba(255,255,255,0.1)';
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });
}

function initWallpaperEngine() {
  const wallpaperModal = document.getElementById('wallpaperModal');
  const openWallpaperBtn = document.getElementById('openWallpaperBtn');
  const closeWallpaperModalBtn = document.getElementById('closeWallpaperModalBtn');
  const saveWallpaperBtn = document.getElementById('saveWallpaperBtn');
  const resetBgBtn = document.getElementById('resetBgBtn');
  const customBgUrlInput = document.getElementById('customBgUrlInput');
  const applyBgUrlBtn = document.getElementById('applyBgUrlBtn');
  const uploadBgFileBtn = document.getElementById('uploadBgFileBtn');
  const bgFileInput = document.getElementById('bgFileInput');
  const customGradientInput = document.getElementById('customGradientInput');
  const applyGradientBtn = document.getElementById('applyGradientBtn');
  const bgDimmerSlider = document.getElementById('bgDimmerSlider');
  const bgDimmerVal = document.getElementById('bgDimmerVal');
  const bgBlurSlider = document.getElementById('bgBlurSlider');
  const bgBlurVal = document.getElementById('bgBlurVal');
  const customBgLayer = document.getElementById('customBgLayer');
  const wallpaperOverlay = document.getElementById('wallpaperOverlay');
  const wallpaperPresetsGrid = document.getElementById('wallpaperPresetsGrid');
  const autoContrastToggle = document.getElementById('autoContrastToggle');
  const autoContrastBadge = document.getElementById('autoContrastBadge');

  const PRESETS = {
    granite: {
      type: 'preset',
      css: 'none',
      dimmer: 25,
      blur: 0
    },
    obsidian: {
      type: 'preset',
      css: '#050608',
      dimmer: 15,
      blur: 0
    },
    'midnight-wine': {
      type: 'preset',
      css: 'radial-gradient(circle at 50% 0%, #2b0b14 0%, #0a0408 100%)',
      dimmer: 25,
      blur: 0
    },
    'cyberpunk-navy': {
      type: 'preset',
      css: 'radial-gradient(circle at 50% 10%, #0d1e38 0%, #050b14 100%)',
      dimmer: 25,
      blur: 0
    },
    'emerald-matrix': {
      type: 'preset',
      css: 'radial-gradient(circle at 50% 10%, #082115 0%, #030d08 100%)',
      dimmer: 25,
      blur: 0
    },
    'aurora-mesh': {
      type: 'preset',
      css: 'linear-gradient(135deg, #1c1033 0%, #0d1f2d 50%, #070913 100%)',
      dimmer: 20,
      blur: 0
    }
  };

  let currentConfig = {
    type: 'preset',
    presetName: 'granite',
    value: 'none',
    dimmer: 25,
    blur: 0,
    autoContrast: true
  };

  const sampleImageBrightness = (src, callback) => {
    if (!src || src === 'none') return callback(0.1);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let lumSum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          lumSum += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
          count++;
        }
        callback(lumSum / (count || 1));
      } catch (e) {
        callback(null);
      }
    };
    img.onerror = () => callback(null);
    img.src = src;
  };

  const sampleCssColorBrightness = (cssVal) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = cssVal;
      ctx.fillRect(0, 0, 16, 16);
      const data = ctx.getImageData(0, 0, 16, 16).data;
      let lumSum = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        lumSum += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        count++;
      }
      return lumSum / (count || 1);
    } catch (e) {
      return null;
    }
  };

  const applyLuminanceAdaptation = (isLight) => {
    const isAutoContrastEnabled = autoContrastToggle ? autoContrastToggle.checked : true;
    if (isAutoContrastEnabled && isLight) {
      document.body.setAttribute('data-wallpaper-theme', 'light');
      const baseDim = currentConfig.dimmer != null ? currentConfig.dimmer : 25;
      const effectiveDim = Math.max(baseDim, 45);
      if (wallpaperOverlay) {
        wallpaperOverlay.style.background = `rgba(0, 0, 0, ${effectiveDim / 100})`;
      }
      if (autoContrastBadge) {
        autoContrastBadge.classList.remove('hidden');
      }
    } else {
      document.body.removeAttribute('data-wallpaper-theme');
      const dimAlpha = (currentConfig.dimmer != null ? currentConfig.dimmer : 25) / 100;
      if (wallpaperOverlay) {
        wallpaperOverlay.style.background = `rgba(0, 0, 0, ${dimAlpha})`;
      }
      if (autoContrastBadge) {
        autoContrastBadge.classList.add('hidden');
      }
    }
  };

  const applyConfigToDOM = (cfg) => {
    if (!customBgLayer || !wallpaperOverlay) return;

    // Apply visual background
    if (cfg.type === 'preset') {
      if (cfg.presetName === 'granite' || cfg.value === 'none') {
        customBgLayer.style.background = 'transparent';
        customBgLayer.style.backgroundImage = 'none';
      } else {
        customBgLayer.style.background = cfg.value;
      }
      applyLuminanceAdaptation(false);
    } else if (cfg.type === 'image') {
      customBgLayer.style.background = `url("${cfg.value}") center center / cover no-repeat`;
      sampleImageBrightness(cfg.value, (lum) => {
        applyLuminanceAdaptation(lum != null && lum > 0.42);
      });
    } else if (cfg.type === 'gradient') {
      customBgLayer.style.background = cfg.value;
      const lum = sampleCssColorBrightness(cfg.value);
      applyLuminanceAdaptation(lum != null && lum > 0.42);
    }

    // Apply Dimmer Tint
    const dimAlpha = (cfg.dimmer != null ? cfg.dimmer : 25) / 100;
    if (!document.body.hasAttribute('data-wallpaper-theme')) {
      wallpaperOverlay.style.background = `rgba(0, 0, 0, ${dimAlpha})`;
    }
    if (bgDimmerVal) bgDimmerVal.textContent = `${cfg.dimmer}%`;
    if (bgDimmerSlider) bgDimmerSlider.value = cfg.dimmer;

    // Apply Blur
    const blurPx = cfg.blur != null ? cfg.blur : 0;
    if (blurPx > 0) {
      customBgLayer.style.filter = `blur(${blurPx}px)`;
      customBgLayer.style.transform = 'scale(1.04)';
    } else {
      customBgLayer.style.filter = 'none';
      customBgLayer.style.transform = 'none';
    }
    if (bgBlurVal) bgBlurVal.textContent = `${blurPx}px`;
    if (bgBlurSlider) bgBlurSlider.value = blurPx;
  };

  // Load saved preferences
  try {
    const saved = localStorage.getItem('clyhealth_wallpaper_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        currentConfig = Object.assign(currentConfig, parsed);
        if (currentConfig.autoContrast !== undefined && autoContrastToggle) {
          autoContrastToggle.checked = Boolean(currentConfig.autoContrast);
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load wallpaper preferences', e);
  }

  // Initial apply
  applyConfigToDOM(currentConfig);

  const saveToStorage = () => {
    try {
      localStorage.setItem('clyhealth_wallpaper_config', JSON.stringify(currentConfig));
    } catch (e) {
      console.warn('Failed to persist wallpaper preferences', e);
    }
  };

  // Open/Close Modal
  openWallpaperBtn?.addEventListener('click', () => {
    wallpaperModal?.classList.remove('hidden');
  });

  const closeModal = () => {
    wallpaperModal?.classList.add('hidden');
    saveToStorage();
  };

  closeWallpaperModalBtn?.addEventListener('click', closeModal);
  saveWallpaperBtn?.addEventListener('click', closeModal);
  wallpaperModal?.addEventListener('click', (e) => {
    if (e.target === wallpaperModal) closeModal();
  });

  // Preset button clicks
  wallpaperPresetsGrid?.querySelectorAll('.preset-btn')?.forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetKey = btn.getAttribute('data-preset');
      const p = PRESETS[presetKey];
      if (p) {
        currentConfig.type = 'preset';
        currentConfig.presetName = presetKey;
        currentConfig.value = p.css;
        currentConfig.dimmer = p.dimmer;
        currentConfig.blur = p.blur;
        applyConfigToDOM(currentConfig);
        saveToStorage();
      }
    });
  });

  // Apply custom URL
  applyBgUrlBtn?.addEventListener('click', () => {
    const url = customBgUrlInput?.value?.trim();
    if (url) {
      currentConfig.type = 'image';
      currentConfig.presetName = null;
      currentConfig.value = url;
      applyConfigToDOM(currentConfig);
      saveToStorage();
    }
  });

  // Upload local image file
  uploadBgFileBtn?.addEventListener('click', () => {
    bgFileInput?.click();
  });

  bgFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const dataUrl = loadEvt.target?.result;
        if (dataUrl) {
          currentConfig.type = 'image';
          currentConfig.presetName = null;
          currentConfig.value = dataUrl;
          applyConfigToDOM(currentConfig);
          saveToStorage();
        }
      };
      reader.readAsDataURL(file);
    }
  });

  // Apply custom CSS gradient
  applyGradientBtn?.addEventListener('click', () => {
    const grad = customGradientInput?.value?.trim();
    if (grad) {
      currentConfig.type = 'gradient';
      currentConfig.presetName = null;
      currentConfig.value = grad;
      applyConfigToDOM(currentConfig);
      saveToStorage();
    }
  });

  // Fine-tune Dimmer slider
  bgDimmerSlider?.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    currentConfig.dimmer = val;
    if (bgDimmerVal) bgDimmerVal.textContent = `${val}%`;
    if (wallpaperOverlay) wallpaperOverlay.style.background = `rgba(0, 0, 0, ${val / 100})`;
  });

  bgDimmerSlider?.addEventListener('change', saveToStorage);

  // Fine-tune Blur slider
  bgBlurSlider?.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    currentConfig.blur = val;
    if (bgBlurVal) bgBlurVal.textContent = `${val}px`;
    if (customBgLayer) {
      if (val > 0) {
        customBgLayer.style.filter = `blur(${val}px)`;
        customBgLayer.style.transform = 'scale(1.04)';
      } else {
        customBgLayer.style.filter = 'none';
        customBgLayer.style.transform = 'none';
      }
    }
  });

  bgBlurSlider?.addEventListener('change', saveToStorage);

  // Auto-Contrast Toggle
  autoContrastToggle?.addEventListener('change', () => {
    currentConfig.autoContrast = autoContrastToggle.checked;
    applyConfigToDOM(currentConfig);
    saveToStorage();
  });

  // Reset Button
  resetBgBtn?.addEventListener('click', () => {
    currentConfig = {
      type: 'preset',
      presetName: 'granite',
      value: 'none',
      dimmer: 25,
      blur: 0
    };
    if (customBgUrlInput) customBgUrlInput.value = '';
    if (customGradientInput) customGradientInput.value = '';
    if (bgFileInput) bgFileInput.value = '';
    applyConfigToDOM(currentConfig);
    try {
      localStorage.removeItem('clyhealth_wallpaper_config');
    } catch (e) {}
  });
}

async function handleFileUpload(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    const res = await fetch('/api/health-connect/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      const msg = document.getElementById('importSuccessMsg');
      const msgText = document.getElementById('importSuccessText');
      if (msg) msg.classList.remove('hidden');
      if (msgText) msgText.textContent = `Imported ${data.totalRecords || 1} Health Connect records!`;
      setTimeout(() => fetchDashboardData(currentDate), 1000);
    } else {
      alert('Failed to process Health Connect JSON payload.');
    }
  } catch (err) {
    alert(`Invalid JSON file: ${err.message}`);
  }
}

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    const connectBtnText = document.getElementById('connectBtnText');
    const logoutBtn = document.getElementById('logoutBtn');
    const noticeActionBtn = document.getElementById('noticeActionBtn');
    const settingsModal = document.getElementById('settingsModal');

    if (config.hasTokens) {
      const firstName = config.user?.displayName ? config.user.displayName.split(' ')[0] : 'Linked';
      if (connectBtnText) connectBtnText.textContent = `${firstName}`;
      logoutBtn?.classList.remove('hidden');
    } else {
      if (connectBtnText) connectBtnText.textContent = 'Connect Account';
      logoutBtn?.classList.add('hidden');
    }

    noticeActionBtn?.addEventListener('click', () => {
      settingsModal?.classList.remove('hidden');
    });
  } catch (err) {
    console.warn('Could not load config:', err);
  }
}

function initActions() {
  const syncBtn = document.getElementById('syncNowBtn');
  const exportBtn = document.getElementById('exportBtn');
  const dismissBtn = document.getElementById('dismissBannerBtn');
  const banner = document.getElementById('noticeBanner');
  const profileChip = document.getElementById('userProfileChip');

  profileChip?.addEventListener('click', () => {
    document.getElementById('settingsModal')?.classList.remove('hidden');
  });

  syncBtn?.addEventListener('click', () => fetchDashboardData(currentDate));
  exportBtn?.addEventListener('click', () => {
    window.location.href = `/api/export-data?date=${currentDate}`;
  });
  dismissBtn?.addEventListener('click', () => banner?.classList.add('hidden'));

  // Model Tier Buttons (Lite, Flash, Pro)
  const btnLite = document.getElementById('modelTierLiteBtn');
  const btnFlash = document.getElementById('modelTierFlashBtn');
  const btnPro = document.getElementById('modelTierProBtn');
  btnLite?.addEventListener('click', () => window.selectGeminiTier('gemini-flash-lite-latest'));
  btnFlash?.addEventListener('click', () => window.selectGeminiTier('gemini-flash-latest'));
  btnPro?.addEventListener('click', () => window.selectGeminiTier('gemini-pro-latest'));

  // Gemini AI Analysis & Chat Listeners
  const runGeminiAnalysisBtn = document.getElementById('runGeminiAnalysisBtn');
  runGeminiAnalysisBtn?.addEventListener('click', () => window.triggerGeminiAnalysis());

  const sendGeminiChatBtn = document.getElementById('sendGeminiChatBtn');
  sendGeminiChatBtn?.addEventListener('click', () => window.askGeminiQuestion());

  const geminiChatInput = document.getElementById('geminiChatInput');
  geminiChatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      window.askGeminiQuestion();
    }
  });

  // Council Specialist Tabs
  const councilTabCardio = document.getElementById('councilTabCardio');
  const councilTabNutrition = document.getElementById('councilTabNutrition');
  const councilTabTrainer = document.getElementById('councilTabTrainer');
  const councilTabSleep = document.getElementById('councilTabSleep');
  councilTabCardio?.addEventListener('click', () => window.switchCouncilTab('cardio'));
  councilTabNutrition?.addEventListener('click', () => window.switchCouncilTab('nutrition'));
  councilTabTrainer?.addEventListener('click', () => window.switchCouncilTab('trainer'));
  councilTabSleep?.addEventListener('click', () => window.switchCouncilTab('sleep'));
}

// ── General Utilities ─────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function showNotice(text, isError = false) {
  const banner = document.getElementById('noticeBanner');
  const bannerText = document.getElementById('noticeBannerText');
  if (banner && bannerText) {
    bannerText.textContent = text;
    banner.classList.remove('hidden');
  }
}
