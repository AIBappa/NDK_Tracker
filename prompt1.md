# Project Brief:
Build a privacy-first family health tracker for neurodiverse children that logs and visualizes food, medication, behavior, exercise, water, potty, and school feedback. The system consists of a Progressive Web App (PWA) for mobile/desktop (installed from browser—not an APK) and a single-click install backend (.exe) that runs locally on the user’s laptop. All data must be processed and stored locally, never in the cloud.

1. Functionality
Voice-first and text-based logging of daily events (food, meds, behavior, exercise, water, potty, school), with all processing and storage local to the user's laptop.

Uses browser Web Speech API for speech-to-text and text-to-speech (TTS) interaction.

Provides conversational, slot-filling flow: detects missing/unclear info, asks clarifying follow-up questions, and gathers all necessary details before saving.

Includes robust onboarding help and troubleshooting info (Help button).

Visualizes daily and weekly records in a multi-track timeline (aligned by type).

Allows configuration of reminders/schedule, input mode (voice/text), and LLM model switching.

Secure device pairing (PWA to backend) with easy onboarding.

All data saved as structured JSON with both raw and structured fields for audit/review.

2. Onboarding & Device Pairing
After backend (.exe) install and launch, present a "Pair your mobile" screen on laptop:

Shows backend’s local WiFi IP address and port.

Displays a QR code encoding the backend’s API endpoint (e.g., http://192.168.1.10:8080).

Provides simple instructions with illustrations to assist users.

The user opens the PWA on their mobile browser (installable from browser as PWA), taps "Scan QR to pair," and points device at the laptop screen.

The PWA saves this endpoint for seamless future connectivity; manual IP entry is supported as fallback.

3. Tech Stack
Frontend (PWA):

ReactJS (or Vue/Svelte) PWA using Web Speech API for STT and TTS.

QR code scan (jsQR, html5-qrcode) for pairing; QR generation (qrcode.react/qrious) on backend.

Timeline visualization: vis-timeline.js, Chart.js Gantt, or D3.js.

Fully installable from browser ("Add to Home Screen").

Backend:

FastAPI (Python) or Node.js (Express), packaged as a Windows .exe.

Local LLM models via Ollama or llama.cpp (model selection in settings).

mDNS/ZeroConf for network discovery (optional).

Handles REST API, data parsing, and file storage.

Data Storage:

Daily or session-based JSON files on backend device, including raw and structured data.

Security:

All traffic remains on local WiFi; support for HTTPS (self-signed) is a desirable enhancement.

Accessibility:

Ensure accessible UI (large text, contrast modes, buttons, TTS, screen reader-friendly).

4. API Endpoints
Endpoint	Method	Description
/setup/schedule	POST	Set/change daily logging times
/input/log	POST	Submit/append structured event log
/input/clarify	POST	Answer follow-up/slot filling
/data/summary	GET	Fetch daily/weekly structured data
/timeline/view	GET	Fetch JSON data for visualization
/settings	GET/POST	Get/update app/LLM/config
5. User Interface Screens and Flow
Onboarding & Pairing:

Shown immediately after backend install. Includes QR code for easy mobile pairing, manual IP as fallback, and simple illustrated guide.

Main Conversational Entry:

Top half:

Displays current app prompt (e.g. “Tell me about food today.”)

Shows two prominent buttons:

Answer: Begins voice or text input.

Quit: Allows user to skip or exit, with confirmation dialog for discard/save as draft.

Bottom half:

Features [Settings] and [Timeline] buttons, always visible for easy access:

Settings: Opens screen for schedule/reminder setup, LLM model picker, input mode, preferences, and Help (onboarding/how-to, troubleshooting).

Timeline: Opens a synchronized, multi-track view of logged events filtered by date/week/type, with drill-down for detail.

Conversational Model:

Each session proceeds through conversational questions and clarifications. No data is written to disk until all required fields are complete and the session confirmed by the user.

6. Data Storage Format
Store each session as a full JSON record, e.g.

json
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
Use one file per day, or a central log file into which new session objects are appended.

Optional: Add “status” field for incomplete/draft/confirmed sessions.

7. Additional Notes
Ensure robust Help/about/how-to in Settings for first time users and troubleshooting.

PWA should detect and notify if backend becomes unreachable (e.g. WiFi disconnect).

All privacy expectations and data flows should be clearly described to users.

Consider future-optional enhancements (multi-profile support, encryption, backup/export/import, accessibility extras).