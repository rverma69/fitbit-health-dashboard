// Test script to simulate Google Health Connect Android sync payload
// Global native fetch available in Node 18+

const ENDPOINT = 'http://localhost:3000/api/health-connect/sync';

async function testHealthConnectSync() {
  // Use a historical fixture date so test runs do not pollute today's live user data
  const testDate = '2026-09-20';

  // Standard Android Health Connect Jetpack Record Schemas
  const sampleHealthConnectPayload = [
    {
      recordType: 'StepsRecord',
      count: 11450,
      startTime: `${testDate}T06:00:00Z`,
      endTime: `${testDate}T22:30:00Z`,
      metadata: {
        dataOrigin: 'com.google.android.apps.fitness',
        device: { manufacturer: 'Fitbit', model: 'Inspire 3' }
      }
    },
    {
      recordType: 'SleepSessionRecord',
      title: 'Night Sleep',
      startTime: `${testDate}T23:00:00Z`,
      endTime: `${testDate}T07:15:00Z`,
      stages: [
        { stage: 'DEEP', durationMinutes: 94 },
        { stage: 'REM', durationMinutes: 108 },
        { stage: 'LIGHT', durationMinutes: 254 },
        { stage: 'AWAKE', durationMinutes: 39 }
      ],
      metadata: { dataOrigin: 'com.fitbit.FitbitMobile' }
    },
    {
      recordType: 'OxygenSaturationRecord',
      percentage: 98.4,
      time: `${testDate}T04:20:00Z`,
      metadata: { dataOrigin: 'com.fitbit.FitbitMobile' }
    },
    {
      recordType: 'RespiratoryRateRecord',
      rate: 14.1,
      time: `${testDate}T04:20:00Z`,
      metadata: { dataOrigin: 'com.fitbit.FitbitMobile' }
    },
    {
      recordType: 'HeartRateVariabilityRmssdRecord',
      heartRateVariabilityMillis: 58.2,
      time: `${testDate}T05:00:00Z`,
      metadata: { dataOrigin: 'com.fitbit.FitbitMobile' }
    }
  ];

  console.log(`📡 Sending test Health Connect payload to ${ENDPOINT}...`);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleHealthConnectPayload)
    });

    const body = await res.json();
    console.log(`✅ Response [${res.status}]:`, body);
  } catch (err) {
    console.error(`❌ Error sending test sync:`, err.message);
  }
}

testHealthConnectSync();
