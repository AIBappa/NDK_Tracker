# Updated Project Brief: NDK Tracker (Prompt 2)

## Overview

Build a privacy-first family health tracker for neurodiverse children that logs and visualizes food, medication, behavior, exercise, water, potty, and school feedback. The system consists of a Progressive Web App (PWA) for mobile/desktop (installed from browser—not an APK) and a single-click install backend (.exe) that runs locally on the user's laptop. All data must be processed and stored locally, never in the cloud.

**Key Updates from Prompt 1**:

- Integrate the PWA build into the backend .exe for seamless distribution.
- Modify onboarding: QR code links to a local pairing page (/pair) that provides PWA download/install instructions.
- Ensure PWA is installable via browser after scanning QR code.
- Add must-have components: manifest.json, service worker, and updated build process.

## 1. Functionality

Voice-first and text-based logging of daily events (food, meds, behavior, exercise, water, potty, school), with all processing and storage local to the user's laptop.

Uses browser Web Speech API for speech-to-text and text-to-speech (TTS) interaction.

Provides conversational, slot-filling flow: detects missing/unclear info, asks clarifying follow-up questions, and gathers all necessary details before saving.

Includes robust onboarding help and troubleshooting info (Help button).

Visualizes daily and weekly records in a multi-track timeline (aligned by type).

Allows configuration of reminders/schedule, input mode (voice/text), and LLM model switching.

Secure device pairing (PWA to backend) with easy onboarding.

All data saved as structured JSON with both raw and structured fields for audit/review.

## 2. Onboarding & Device Pairing (Updated)
After backend (.exe) install and launch, present a "Pair your mobile" screen on laptop:

Shows backend's local WiFi IP address and port.

Displays a QR code encoding the pairing page URL (e.g., `http://192.168.1.10:8080/pair`).

Provides simple instructions with illustrations to assist users.

The user scans the QR code on their mobile, which opens the pairing page in the browser. The page includes:

- Instructions to install the PWA (link to /pwa).
- Fallback manual IP entry for the PWA.

Once installed, the PWA handles pairing via API calls and saves the endpoint for future use.

## 3. Tech Stack
Frontend (PWA):

ReactJS PWA using Web Speech API for STT and TTS.

QR code scan (jsQR, html5-qrcode) for pairing; QR generation (qrcode.react) on backend.

Timeline visualization: vis-timeline.js, Chart.js Gantt, or D3.js.

Fully installable from browser ("Add to Home Screen").

Must-haves:
- manifest.json: Defines app metadata, icons, and install behavior.
- Service worker (sw.js): Enables offline caching, faster loads, and background tasks.
- Build process: Use `npm run build` to generate production files in frontend/build/.

Backend:

FastAPI (Python), packaged as a Windows .exe via PyInstaller.

Local LLM models via Ollama or llama.cpp (model selection in settings).

mDNS/ZeroConf for network discovery (optional).

Handles REST API, data parsing, and file storage.

Must-haves:
- Serve PWA static files at /pwa (mount frontend/build/).
- Host pairing page at /pair (HTML template with PWA link).
- Update PyInstaller spec to bundle frontend/build/.
- Support self-signed HTTPS for security.

Data Storage:

Daily or session-based JSON files on backend device, including raw and structured data.

Security:

All traffic remains on local WiFi; implement self-signed HTTPS.

Accessibility:

Ensure accessible UI (large text, contrast modes, buttons, TTS, screen reader-friendly).

## 4. Build and Packaging Process (New)

### Manual Steps

1. **Frontend Build**:
   - Navigate to frontend/ folder.
   - Run `npm install` to install dependencies.
   - Run `npm run build` to generate production files in frontend/build/ (includes index.html, static JS/CSS, manifest.json, sw.js).

2. **Backend Integration**:
   - Update backend/main.py to mount /pwa for static files and add /pair endpoint.
   - Update NDK_tracker_setup.spec to include frontend/build/ in datas.
   - Run PyInstaller to build .exe, bundling both backend and PWA.

3. **Distribution**:
   - Single .exe file for users to install backend and access PWA.

### Automated Packaging Script (Recommended)

For a one-shot build process, create a `build_package.bat` script in the root directory:

```bat
@echo off
echo Building frontend...
cd frontend
npm install
npm run build
cd ..

echo Copying frontend build to backend...
if not exist backend\frontend mkdir backend\frontend
xcopy frontend\build backend\frontend\build /E /I /Y

echo Building .exe with PyInstaller...
cd backend
pyinstaller --onefile --windowed NDK_tracker_setup.spec
cd ..

echo Build complete! Check backend\dist\ for the .exe file.
```

Run this script from the root directory to automate: npm build → copy files → PyInstaller packaging.

## 5. API Endpoints

Endpoint | Method | Description
---------|--------|-------------
/setup/schedule | POST | Set/change daily logging times
/input/log | POST | Submit/append structured event log
/input/clarify | POST | Answer follow-up/slot filling
/data/summary | GET | Fetch daily/weekly structured data
/timeline/view | GET | Fetch JSON data for visualization
/settings | GET/POST | Get/update app/LLM/config
/pair | GET | Serve pairing page with PWA install link
/pairing/info | GET | Return pairing page URL for QR code
/pwa | GET | Serve PWA static files

## 6. User Interface Screens and Flow
Onboarding & Pairing:

Shown immediately after backend install. Includes QR code linking to /pair, with instructions and PWA install link.

Main Conversational Entry:

Top half:

Displays current app prompt (e.g., "Tell me about food today.")

Shows two prominent buttons:

Answer: Begins voice or text input.

Quit: Allows user to skip or exit, with confirmation dialog for discard/save as draft.

Bottom half:

Features [Settings] and [Timeline] buttons, always visible for easy access:

Settings: Opens screen for schedule/reminder setup, LLM model picker, input mode, preferences, and Help (onboarding/how-to, troubleshooting).

Timeline: Opens a synchronized, multi-track view of logged events filtered by date/week/type, with drill-down for detail.

Conversational Model:

Each session proceeds through conversational questions and clarifications. No data is written to disk until all required fields are complete and the session confirmed by the user.

## 7. Data Storage Format
Store each session as a full JSON record, e.g.

```json
{
  "datetime": "2025-09-20T08:41:00",
  "conversation": [
    { "from": "app", "message": "Tell me about food today." },
    { "from": "user", "message": "She had broccoli pasta for lunch." },
    { "from": "app", "message": "What time did she eat?" },
    { "from": "user", "message": "At 1 pm." }
  ],
  "raw_aggregate_text": "She had broccoli pasta for lunch. At 1 pm.",
  "structured_data": {
    "food": ["broccoli pasta"],
    "mealtime": "lunch",
    "time": "13:00"
  }
}
```

Use one file per day, or a central log file into which new session objects are appended.

Optional: Add "status" field for incomplete/draft/confirmed sessions.

## 8. Additional Notes
Ensure robust Help/about/how-to in Settings for first time users and troubleshooting.

PWA should detect and notify if backend becomes unreachable (e.g., WiFi disconnect).

All privacy expectations and data flows should be clearly described to users.

Implement manifest.json and service worker for PWA installability and offline support.

Consider future-optional enhancements (multi-profile support, encryption, backup/export/import, accessibility extras).
