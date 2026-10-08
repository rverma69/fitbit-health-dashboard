# 📱 Google Health API & Fitbit Inspire 3 Setup Guide

As of **September 2026**, Google officially deprecated legacy Fitbit Web API registrations on `dev.fitbit.com` and migrated to the **Next-Gen Google Health API** powered by **Google Cloud OAuth 2.0**.

PulseBoard is fully updated to support the new Google Cloud OAuth standard as well as Android Google Health Connect!

---

## ⚡ Method 1: Google Cloud OAuth 2.0 (Official Google Health API)

Instead of the old Fitbit developer portal, all new registrations now use the standard **Google Cloud Console**.

### Step 1: Create OAuth Credentials in Google Cloud (Takes 60 seconds)
1. Go to the **[Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials)**.
2. Sign in with your Google account.
3. If prompted, select or create a project (e.g., `PulseBoard Health`).
4. Click **Create Credentials** at the top → select **OAuth client ID**.
5. Set **Application type**: **`Web application`**.
6. Set **Name**: `PulseBoard Dashboard`.
7. Under **Authorized redirect URIs**, click **+ ADD URI** and enter:
   ```
   http://localhost:3000/auth/callback
   ```
8. Click **Create**.
9. A dialog will show your:
   - **Client ID** (e.g., `1234567890-abcdef.apps.googleusercontent.com`)
   - **Client Secret** (e.g., `GOCSPX-xxxxxxxxxxxxxxxx`)

---

### Step 2: Authorize PulseBoard
1. Open PulseBoard in your browser at **`http://localhost:3000`**.
2. Click **Connect Account** (top-right navigation).
3. Paste your **Client ID** and **Client Secret**.
4. Click **Save & Authorize**.
5. A native **Sign in with Google** consent screen will open. Select your Google account and grant permissions.
6. 🎉 You're done! Your Inspire 3 steps, 24-hour intraday heart rate, sleep stages, HRV, SpO2, and skin temperature will now stream directly to your Apple Health-styled dashboard!

---

## 📲 Method 2: Android Google Health Connect Bridge (Webhook / Direct Push)

**Google Health Connect** is the Android on-device framework where Google Fit, Fitbit, Samsung Health, and other apps store health records locally on your phone.

Because Health Connect is strictly local to Android (it doesn't have a public web API for browser access), PulseBoard includes a local webhook endpoint:
```http
POST http://localhost:3000/api/health-connect/sync
```

### How to Sync from Android:
You can push data from Health Connect to PulseBoard using:

1. **Health Sync (Android App - Play Store)**:
   - Install **Health Sync** on Android.
   - Set source as **Fitbit / Health Connect**.
   - Set destination or webhook to `http://<your-pc-ip>:3000/api/health-connect/sync`.

2. **Automated Webhook via Tasker / Automate**:
   - Query Health Connect daily summary.
   - POST the JSON payload to PulseBoard.

3. **Drag & Drop JSON File**:
   - In PulseBoard, click **Health Connect** in the top navigation.
   - Drag and drop any exported Health Connect JSON file directly into the dropzone to ingest it into your health archive.

4. **Run the Test Simulation Script**:
   To test the Health Connect pipeline right now:
   ```powershell
   node scripts/test-health-connect.js
   ```

---

## 🛠️ Running the Dashboard

To start PulseBoard locally:
```powershell
npm start
```
Then visit **`http://localhost:3000`** in your browser.

To toggle between **Demo Mode** (realistic simulated Inspire 3 metrics) and **Live Cloud**, click the Settings modal in the top right.
