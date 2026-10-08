export function generateAiCoaching({
  date,
  summary = {},
  heartRate = {},
  healthMetrics = {},
  sleep = {},
  whoop = {},
  biologicalAge = {},
  sleepCoach = {}
}) {
  const steps = summary.steps || 0;
  const azm = summary.activeZoneMinutes || 0;
  const azmGoal = summary.azmGoal || 30;
  const calories = summary.caloriesOut || 0;
  const rhr = typeof heartRate.restingHeartRate === 'number' ? heartRate.restingHeartRate : null;
  const hrv = typeof healthMetrics.hrv?.dailyRmssd === 'number' ? healthMetrics.hrv.dailyRmssd : null;
  const spo2 = typeof healthMetrics.spo2?.avg === 'number' ? healthMetrics.spo2.avg : null;
  const resp = typeof healthMetrics.breathingRate?.rpm === 'number' ? healthMetrics.breathingRate.rpm : null;
  const recoveryScore = typeof whoop.recoveryScore === 'number' ? whoop.recoveryScore : null;
  const recoveryZone = whoop.recoveryZone || (recoveryScore >= 67 ? 'GREEN' : (recoveryScore >= 34 ? 'YELLOW' : 'RED'));
  const dayStrain = typeof whoop.dayStrain === 'number' ? whoop.dayStrain : 0.0;
  const sleepScore = typeof sleep.score === 'number' ? sleep.score : null;
  const sleepMins = sleep.totalMinutesAsleep || 0;
  const sleepDebt = whoop.sleepDebtMinutes || sleepCoach.sleepDebtMinutes || 0;
  const deepMins = sleep.stages?.deep?.minutes || 0;
  const remMins = sleep.stages?.rem?.minutes || 0;
  const bioAge = biologicalAge.biologicalAge;
  const pace = biologicalAge.paceOfAgingFormatted || (typeof biologicalAge.paceOfAging === 'number' ? `${biologicalAge.paceOfAging}x` : null);
  const bedtimeTarget = sleepCoach.targets?.peak?.bedtimeFormatted || '10:46 PM';

  // Check if unrecorded day
  const hasTelemetry = (steps > 0 || rhr !== null || hrv !== null || sleepScore !== null);

  if (!hasTelemetry) {
    return {
      status: 'NO_DATA',
      verdictTitle: 'No Biometric Telemetry Recorded',
      verdictSummary: 'No continuous heart rate, sleep architecture, or activity samples were detected for this calendar date. Wear your Fitbit Inspire 3 across 24h day and sleep cycles to generate personalized AI coaching.',
      recoveryReadiness: { score: '--', label: 'Unrecorded', color: 'gray', detail: 'Requires nocturnal optical sensor tracking.' },
      strainDemand: { score: '--', targetRange: '9.0 – 13.0', status: 'No Data', detail: 'Wear tracker during daytime movement.' },
      sleepDebt: { minutes: '--', recommendedBedtime: '10:30 PM', detail: 'Overnight sleep hypnogram required.' },
      strengths: [],
      areasToImprove: [
        {
          title: 'Device Adherence',
          description: 'Wear your tracker overnight to calibrate baseline resting heart rate and HRV RMSSD.',
          metric: '0 hrs worn',
          urgency: 'high',
          tag: 'Tracking'
        }
      ],
      actionPlan: {
        workout: 'Maintain baseline functional movement and track your next workout.',
        circadian: 'Target lights out by 10:30 PM to maintain regular circadian melatonin release.',
        nutritionRecovery: 'Ensure proper hydration and consistent evening wind-down routine.'
      },
      topics: {
        workout: { title: 'Training Guidance', text: 'Wear your tracker during exercise to log cardiovascular active zone minutes.' },
        sleep: { title: 'Sleep Optimization', text: 'Ensure device is snug on wrist before sleeping to enable PPG sleep stage classification.' },
        longevity: { title: 'Longevity Focus', text: 'Consistent multi-day biometric telemetry is required to compute biological pace of aging.' }
      }
    };
  }

  // Synthesize Strengths
  const strengths = [];
  if (hrv && hrv >= 65) {
    strengths.push({
      title: 'Elite Autonomic Vagal Tone',
      description: `Nocturnal HRV of ${hrv} ms RMSSD indicates dominant parasympathetic nervous system control and excellent cardiovascular stress resilience.`,
      metric: `${hrv} ms`,
      tag: 'Autonomic'
    });
  }
  if (rhr && rhr <= 52) {
    strengths.push({
      title: 'Athletic Cardiac Reserve',
      description: `Resting heart rate of ${rhr} bpm reflects superior stroke volume, minimal arterial stiffness, and efficient myocardial work efficiency.`,
      metric: `${rhr} bpm`,
      tag: 'Cardiovascular'
    });
  }
  if (sleepScore && sleepScore >= 75) {
    const restorativeTotal = deepMins + remMins;
    strengths.push({
      title: 'Restorative Sleep Architecture',
      description: `Logged ${Math.floor(sleepMins / 60)}h ${sleepMins % 60}m of sleep with ${restorativeTotal}m of restorative stages (${deepMins}m Deep, ${remMins}m REM) for cellular repair.`,
      metric: `${sleepScore} Score`,
      tag: 'Sleep'
    });
  }
  if (pace && pace.startsWith('0.')) {
    strengths.push({
      title: 'Decelerated Biological Aging',
      description: `Multi-pillar longevity markers indicate an age pace of ${pace}, decelerating cellular aging below chronological baseline.`,
      metric: `${pace} Pace`,
      tag: 'Longevity'
    });
  }

  // Synthesize Gaps / Areas to Improve
  const areasToImprove = [];
  if (azm < azmGoal) {
    const deficit = azmGoal - azm;
    areasToImprove.push({
      title: 'Cardiovascular Zone Deficit',
      description: `Accumulated ${azm} / ${azmGoal} Active Zone Minutes. With ${recoveryScore ? recoveryScore + '%' : 'high'} recovery capacity, your cardiovascular system is primed for aerobic training. Lack of physical exertion reduces tonight's sleep pressure.`,
      metric: `-${deficit} min`,
      urgency: recoveryZone === 'GREEN' ? 'high' : 'medium',
      tag: 'Cardio Training'
    });
  }
  if (steps < 7500) {
    const stepGap = 10000 - steps;
    areasToImprove.push({
      title: 'Daily Movement Volume',
      description: `Recorded ${steps.toLocaleString()} steps (${stepGap.toLocaleString()} below 10k target). Increasing non-exercise activity thermogenesis (NEAT) improves blood glucose regulation.`,
      metric: `${steps.toLocaleString()} steps`,
      urgency: 'medium',
      tag: 'Movement'
    });
  }
  if (sleepDebt > 30) {
    areasToImprove.push({
      title: 'Accumulated Sleep Debt',
      description: `Carrying ${sleepDebt} minutes of sleep debt. Amortize debt by heading to bed by ${bedtimeTarget} rather than sleeping in, protecting circadian alignment.`,
      metric: `+${sleepDebt}m Debt`,
      urgency: 'high',
      tag: 'Sleep Debt'
    });
  }
  if (areasToImprove.length === 0) {
    areasToImprove.push({
      title: 'Sustain Periodization Balance',
      description: 'All primary biometric targets satisfied. Maintain current recovery-strain ratio and avoid consecutive high-strain spikes.',
      metric: 'Balanced',
      urgency: 'low',
      tag: 'Periodization'
    });
  }

  // Determine Verdict
  let verdictTitle = '';
  let verdictSummary = '';
  let status = 'OPTIMAL';

  if (recoveryZone === 'GREEN' && azm === 0) {
    status = 'STRAIN_DEFICIT';
    verdictTitle = 'High Recovery Reserve · Cardiovascular Stimulus Needed';
    verdictSummary = `Your central nervous system is primed (${recoveryScore}% Prime Recovery, ${hrv ? hrv + ' ms HRV' : ''}), but cardiovascular load is low (${azm} AZM, ${dayStrain} Day Strain). You have significant physiological capacity for high-intensity training or progressive endurance before evening wind-down.`;
  } else if (recoveryZone === 'GREEN') {
    status = 'OPTIMAL';
    verdictTitle = 'Prime Physiological State · Optimal Adaptation Absorbed';
    verdictSummary = `Outstanding recovery balance (${recoveryScore}% Recovery). Your body is effectively adapting to accumulated physical strain (${dayStrain} / 21) with stable resting vitals.`;
  } else if (recoveryZone === 'YELLOW') {
    status = 'RECOVERY_FOCUS';
    verdictTitle = 'Moderate Autonomic Resilience · Focus on Precision Strain';
    verdictSummary = `Moderate recovery state (${recoveryScore}%). Autonomic nervous system is coping with baseline fatigue. Moderate aerobic exercise (Zone 2) is recommended; avoid exhaustive max-effort intervals today.`;
  } else {
    status = 'RECOVERY_FOCUS';
    verdictTitle = 'Autonomic Recovery Depleted · Prioritize Active Restoration';
    verdictSummary = `Recovery is compromised (${recoveryScore}%). Suppressed HRV or elevated resting HR indicates physiological stress or incomplete sleep cycles. Prioritize breathwork, hydration, and an early bedtime.`;
  }

  const actionPlan = {
    workout: (recoveryZone === 'GREEN' && azm < azmGoal)
      ? `Prescription: Perform 25–35 minutes of Zone 2 cardio (106–135 bpm) or moderate compound resistance training to reach 10.0–13.0 Day Strain.`
      : (recoveryZone === 'GREEN'
          ? `Prescription: Training stimulus satisfied. Conclude strenuous exercise at least 3 hours before sleep to allow core body temperature to decline.`
          : `Prescription: Active recovery only — 20–30 minute zone 1 walk or light mobility work. Cap Day Strain below 8.0.`),
    circadian: `Prescription: Target bed entry at ${bedtimeTarget} to align with your biological sleep gate (10:30 PM – 11:45 PM). Dim lights 45 minutes prior.`,
    nutritionRecovery: `Prescription: Finish final caloric intake 3 hours prior to bed. Ensure 500ml water with electrolytes to support overnight autonomic cardiac recovery.`
  };

  const topics = {
    workout: {
      title: 'Target Workout Strategy',
      text: recoveryZone === 'GREEN'
        ? `With a prime ${recoveryScore}% recovery score, your body has maximum anabolic sensitivity and glycogen uptake. Recommended: 30 minutes in Fat Burn/Cardio zone (106-165 bpm) or heavy compound lifting.`
        : `Your recovery is at ${recoveryScore}%. Training hard today will create excessive neural fatigue. Recommended: Light mobility, yoga, or an easy zone 1 outdoor walk.`
    },
    sleep: {
      title: 'Circadian Bedtime & Wind-Down',
      text: `Based on your wake target and ${sleepMins ? Math.floor(sleepMins/60)+'h '+sleepMins%60+'m of prior sleep' : 'circadian baseline'}, your recommended bedtime is ${bedtimeTarget}. Catching your endogenous melatonin window ensures faster sleep latency (<15m).`
    },
    longevity: {
      title: 'Longevity & Pace of Aging Impact',
      text: `Your current pace of aging is ${pace || 'optimal'}. Consistent resting heart rate under 50 bpm and nightly HRV above 90 ms contribute to arterial compliance and autonomic youthfulness.`
    }
  };

  return {
    status,
    verdictTitle,
    verdictSummary,
    recoveryReadiness: {
      score: recoveryScore != null ? `${recoveryScore}%` : '--',
      label: whoop.recoveryZone === 'GREEN' ? 'Prime Readiness' : (whoop.recoveryZone === 'YELLOW' ? 'Moderate Reserve' : 'Recovery Demanded'),
      color: whoop.recoveryZone === 'GREEN' ? 'emerald' : (whoop.recoveryZone === 'YELLOW' ? 'amber' : 'rose'),
      detail: recoveryScore >= 67 ? 'Full parasympathetic restoration' : 'Autonomic nervous system under load'
    },
    strainDemand: {
      score: dayStrain.toFixed(1),
      targetRange: whoop.strainTargetRange || '9.0 – 13.0',
      status: azm >= azmGoal ? 'Target Achieved' : 'Stimulus Capacity Available',
      detail: `${azm} / ${azmGoal} AZM accumulated`
    },
    sleepDebt: {
      minutes: sleepDebt > 0 ? `+${sleepDebt}m` : '0m Debt',
      recommendedBedtime: bedtimeTarget,
      detail: `Calibrated to wake time`
    },
    strengths,
    areasToImprove,
    actionPlan,
    topics
  };
}
