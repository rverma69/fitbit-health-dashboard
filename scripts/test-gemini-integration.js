/**
 * Automated Verification: Real-Time Google Gemini AI Integration
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TEST SUITE: GOOGLE GEMINI REAL-TIME AI INTEGRATION ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failCount++;
  }
}

// 1. Audit DOM Elements in public/index.html
console.log('--- 1. Auditing DOM Markup in public/index.html ---');
const htmlContent = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

const requiredIds = [
  'aiCouncilSection',
  'modelTierLiteBtn',
  'modelTierFlashBtn',
  'modelTierProBtn',
  'openGeminiKeyModalBtn',
  'geminiStatusBadge',
  'geminiKeyBtnLabel',
  'councilTabCardio',
  'councilTabNutrition',
  'councilTabTrainer',
  'councilTabSleep',
  'runGeminiAnalysisBtn',
  'councilContentArea',
  'geminiChatArea',
  'geminiChatInput',
  'sendGeminiChatBtn',
  'geminiChatReplyBox',
  'geminiKeyModal',
  'modalGeminiKeyInput',
  'modalGeminiModelSelect',
  'saveGeminiKeyBtn',
  'removeGeminiKeyBtn'
];

for (const id of requiredIds) {
  assert(htmlContent.includes(`id="${id}"`), `DOM element #${id} exists in public/index.html`);
}

// 2. Audit Client-Side Functions in public/app.js
console.log('\n--- 2. Auditing app.js Gemini Methods ---');
const jsContent = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

const requiredJsTokens = [
  'activeGeminiModel',
  'selectGeminiTier',
  'triggerGeminiAnalysis',
  'renderGeminiAnalysis',
  'askGeminiQuestion',
  'openGeminiKeyModal',
  'closeGeminiKeyModal',
  'checkGeminiStatus',
  'formatMarkdown',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-pro-latest'
];

for (const token of requiredJsTokens) {
  assert(jsContent.includes(token), `app.js includes '${token}'`);
}

// 3. Test Live Server Endpoints
console.log('\n--- 3. Testing Backend Endpoints at http://localhost:3000 ---');

function makeRequest(method, pathName, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: pathName,
      method: method,
      headers: payload ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      } : {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runApiTests() {
  try {
    // GET /api/gemini/status
    const statusRes = await makeRequest('GET', '/api/gemini/status');
    assert(statusRes.status === 200, 'GET /api/gemini/status returns 200 OK');
    assert(typeof statusRes.json.configured === 'boolean', 'status.configured is boolean');
    assert(typeof statusRes.json.model === 'string', `status.model is '${statusRes.json?.model}'`);

    // POST /api/gemini/model
    const modelRes = await makeRequest('POST', '/api/gemini/model', { model: 'gemini-flash-lite-latest' });
    assert(modelRes.status === 200 && modelRes.json.model === 'gemini-flash-lite-latest', 'POST /api/gemini/model updates model to gemini-flash-lite-latest');

    // Reset back to gemini-flash-latest
    await makeRequest('POST', '/api/gemini/model', { model: 'gemini-flash-latest' });

    // POST /api/gemini/key validation
    const emptyKeyRes = await makeRequest('POST', '/api/gemini/key', { apiKey: '' });
    assert(emptyKeyRes.status === 400 && emptyKeyRes.json.error === 'INVALID_KEY', 'POST /api/gemini/key properly rejects empty key with 400 INVALID_KEY');

    // POST /api/gemini/analyze (without configured key test)
    const noKeyAnalyzeRes = await makeRequest('POST', '/api/gemini/analyze', { userApiKey: '' });
    assert(noKeyAnalyzeRes.status === 400 || noKeyAnalyzeRes.status === 200, `POST /api/gemini/analyze handles request safely (status: ${noKeyAnalyzeRes.status})`);

    // POST /api/gemini/chat validation
    const noMsgChatRes = await makeRequest('POST', '/api/gemini/chat', { userApiKey: 'test-fake-key', message: '' });
    assert(noMsgChatRes.status === 400, 'POST /api/gemini/chat rejects empty message with 400');

    console.log(`\n========================================`);
    console.log(`SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log(`========================================`);

    if (failCount > 0) process.exit(1);
    else process.exit(0);
  } catch (err) {
    console.error('Error during HTTP endpoint tests:', err.message);
    process.exit(1);
  }
}

runApiTests();
