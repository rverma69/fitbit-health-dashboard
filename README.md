# Statix — Precision Biometric Intelligence Dashboard ⚡

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Google Health API v4](https://img.shields.io/badge/Google%20Health-API%20v4-4285F4?style=flat&logo=google&logoColor=white)](https://developers.google.com/health)
[![WHOOP & Garmin Calibrated](https://img.shields.io/badge/Algorithms-WHOOP%20%7C%20Garmin%20%7C%20KDM-00E5FF?style=flat)](#-biometric-algorithms)

> **Statix** is a luxury, dark-mode personal health dashboard that pulls authentic raw sensor telemetry directly from **Google Health API v4** (paired with Fitbit Inspire 3 / Pixel Watch / Galaxy Watch) and calculates peer-reviewed sports science metrics: **WHOOP Recovery**, **Cardiovascular Day Strain**, **Firstbeat Body Battery**, **Biological Age & Pace of Aging**, and **Circadian Sleep Coaching** without paywalls or synthetic fallbacks.

---

## 🌟 Key Highlights

* **100% Authentic Telemetry**: Direct ingestion of intraday PPG heart rate, nocturnal HRV RMSSD, SpO2, sleep architecture stages (Deep, REM, Light, Awake), and respiratory rate.
* **Zero Fake Data**: If sensors were unrecorded on a given calendar day, metrics gracefully degrade to clean `--` indicators instead of guessing or hallucinating synthetic numbers.
* **Apple Health & WHOOP Aesthetics**: Obsidian/OLED dark palette, paper-thin hairline borders, pure-glass floating control islands, Conthrax techno brand typography, and zero glowing blur halos.
* **Circadian Sleep Coach**: Borbély Two-Process Model calculating bedtime windows based on homeostatic sleep debt, strain compensation, and endogenous melatonin onset.
* **100% Free & Open**: Run locally on your computer or deploy 24/7 to the cloud on Render for free.

---

## 🔬 Biometric Algorithms & Scientific Literature

| Metric | Range | Scientific Methodology & Citations |
| :--- | :--- | :--- |
| **WHOOP Recovery Score** | 0 – 100% | *Capodilupo et al. (WHOOP US Patent 9,636,044)*: Continuous logistic sigmoid activation on log-transformed RMSSD $z$-scores (*Koenig & Thayer 2016*) + Resting HR elevation penalty + Restorative sleep architecture ratio. |
| **Cardiovascular Day Strain** | 0.0 – 21.0 | *Eric Banister's TRIMP (1991)*: Intraday exponential cardiac impulse $\sum \Delta t \cdot y \cdot 0.64 e^{1.92y}$ logarithmically mapped to the 21-point Borg RPE scale. |
| **Firstbeat Body Battery** | 0 – 100 | *Firstbeat Analytics White Paper*: Exponential nocturnal parasympathetic vagal charging saturating at restorative sleep thresholds, with daily TRIMP discharge. |
| **Biological Age & Pace of Aging** | Years & Ratio | *Klemera-Doubal Method (KDM) & Levine PhenoAge adaptation*: 4-pillar multi-biomarker weighting (35% HRV vagal tone, 30% resting heart rate, 20% slow-wave sleep cellular restoration, 15% cardiorespiratory fitness). |
| **Circadian Bedtime Planner** | HH:MM AM/PM | *Borbély Two-Process Model (1982)*: Baseline biological need (465m) + TRIMP exercise compensation (+2.8m/strain unit) + 25% sleep debt repayment buffer. |
| **Baevsky Stress Index (SI)** | 0 – 300+ | *Roman Baevsky (1979)*: Statistical variational pulsometry and sympathovagal balance. |

---

## 🚀 Quickstart: Running Locally

### 1. Prerequisites
* [Node.js](https://nodejs.org/) v18.0.0 or higher.
* A Google Cloud Project with the **Google Health API** enabled (instructions below).

### 2. Clone & Install
```bash
git clone https://github.com/rverma69/fitbit-health-dashboard.git
cd fitbit-health-dashboard
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
```env
PORT=3000
FITBIT_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
FITBIT_CLIENT_SECRET=your_google_client_secret
FITBIT_REDIRECT_URI=http://localhost:3000/auth/callback
GEMINI_API_KEY=your_optional_gemini_api_key
```

### 4. Start the Application
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser and click **Connect Google Health**.

---

## 🔑 Google Cloud Console Setup (One-Time)

To allow Statix to fetch your authentic Fitbit / Google Health data:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `Statix Health`).
3. Enable the **Google Health API**:
   * Navigate to **APIs & Services** > **Library**.
   * Search for **Google Health API** and click **Enable**.
4. Configure the **OAuth Consent Screen**:
   * User Type: **External**.
   * App Name: `Statix`.
   * Add Scopes:
     * `.../auth/userinfo.email`
     * `.../auth/userinfo.profile`
     * `.../auth/googlehealth.activity_and_fitness.readonly`
     * `.../auth/googlehealth.health_metrics_and_measurements.readonly`
     * `.../auth/googlehealth.sleep.readonly`
   * Under **Test Users**, add your Gmail address (and any friends' emails).
5. Create **OAuth 2.0 Credentials**:
   * Go to **Credentials** > **Create Credentials** > **OAuth client ID**.
   * Application type: **Web application**.
   * **Authorized JavaScript origins**:
     * `http://localhost:3000` (for local development)
     * `https://your-app-name.onrender.com` (for production)
   * **Authorized redirect URIs**:
     * `http://localhost:3000/auth/callback` (for local development)
     * `https://your-app-name.onrender.com/auth/callback` (for production)
6. Copy the **Client ID** and **Client Secret** into your `.env` file.

---

## ☁️ Free 24/7 Cloud Deployment (Render.com)

You can run Statix 24/7 in the cloud for **$0** so you can check your dashboard from your phone without keeping your computer on:

1. Fork or push this repository to your GitHub account.
2. Sign in to [Render.com](https://render.com) (Free).
3. Click **New +** > **Web Service** and connect your GitHub repository.
4. Settings:
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `node server.js`
   * **Plan**: `Free`
5. Under **Environment Variables**, add:
   * `FITBIT_CLIENT_ID`
   * `FITBIT_CLIENT_SECRET`
   * `FITBIT_REDIRECT_URI` = `https://<your-render-subdomain>.onrender.com/auth/callback`
   * `GEMINI_API_KEY` (optional)
6. In Google Cloud Console, add `https://<your-render-subdomain>.onrender.com/auth/callback` to your authorized redirect URIs.
7. Click **Deploy**! Statix will be online 24/7 with free SSL/HTTPS.

---

## 🔒 Security & Privacy

* **No Hardcoded Credentials**: All secrets, client IDs, and keys are strictly managed via environment variables.
* **Protected Storage**: OAuth access and refresh tokens are stored locally in `data/` and excluded from git via `.gitignore`.
* **Zero Telemetry Tracking**: No third-party tracking scripts, ads, or cookies. All communication happens strictly between your server and Google Health API.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
