# NDK Tracker

A privacy-first family health tracker PWA for neurodiverse children with local data storage and voice-first interaction.

This README documents two audiences and workflows:

- For users: how to run the app using the packaged Windows executable (no developer tools required)
- For developers: how to build/package the app using the PowerShell script

## Features

- 🔒 **Privacy First** - All data stays local, no cloud storage
- 🎤 **Voice Interface** - Speech-to-text and conversational input
- 📊 **Activity Tracking** - Food, medication, behavior, exercise, and more
- 📈 **Timeline Visualization** - Multi-track timeline with filtering
- ♿ **Accessibility** - High contrast, large text, screen reader support
- 📱 **PWA Ready** - Install from browser on mobile devices

## Architecture

- **Backend**: FastAPI server with local LLM processing (Ollama)
- **Frontend**: React PWA with Web Speech API
- **Storage**: Local JSON files, no database required
- **Pairing**: QR code device pairing over local WiFi

## Documentation

- [Setup Guide](docs/setup.md) - Detailed development setup
- [Project Overview](docs/README.md) - Complete documentation
- [Backend README](backend/README.md) - Backend-specific docs


## For users (Non-developers):
You don't need developer tools. Use the latest packaged Windows executable provided by your developer/team from the releases section.

## For users: Install and run (Windows):
The following section is useful for user level testing.

1. Obtain the folder named `dist` that contains the Windows executable and optional `pwa/`, `models/`, and `data/` subfolders.

1. Double‑click the executable in `dist` to start the backend on your laptop. On first launch:

   - Windows Defender SmartScreen may warn about an unknown publisher — choose “More info” → “Run anyway”.
   - A console window opens and prints a QR code and pairing links using your laptop's local IP, for example:
     - HTTPS: <https://LAN-IP:8443>
     - PWA:   <https://LAN-IP:8443/pwa>
   - The main pairing URL is also copied to your clipboard automatically.

1. On your phone/tablet (same Wi‑Fi network):

   - Open the camera and scan the QR, or paste the copied HTTPS URL into the browser.
   - The first time, your browser will ask to trust a self‑signed certificate — accept/continue to proceed.
   - Tap “Install” or “Add to Home screen” to add the NDK Tracker icon on your device.

1. Next time, just launch from the home screen icon. The app remembers the backend and will auto‑connect when your phone and laptop are on the same network.

Notes:

- Voice input requires HTTPS. Always use the <https://LAN-IP:8443> links (not <http://localhost>) on mobile.
- Your models and data (if present) live next to the executable in `dist/models` and `dist/data` and are preserved across updates.

Where things live in `dist/`:

- Executable: `dist/` (one or more .exe files)
- PWA assets (optional standalone hosting): `dist/pwa/`
- Models: `dist/models/` (e.g., .gguf files)
- Data: `dist/data/`

## For developers: Build and package (Windows)

Use the one‑shot PowerShell script to build the React PWA and package the backend into a Windows executable. Run this from the repo root in your existing PowerShell session (don’t spawn a new console).

Prerequisites:

- Windows
- Node.js (for frontend build)
- Python 3.10+ (for backend and PyInstaller)

Build/package steps:

```powershell
# From repo root
./build_package.ps1
```

What the script does:

- Builds the React PWA into `frontend/build`
- Mirrors the PWA into `backend/frontend/build` so it can be served at `/pwa`
- Ensures `backend/.venv` exists and installs Python dependencies
- Uses PyInstaller with `backend/NDK_tracker_setup.spec` to create the executable(s)
- Writes all outputs to `dist/` (not `backend/dist`) and copies standalone PWA to `dist/pwa/`
- Preserves any existing `dist/models` and `dist/data` between builds; only non‑data artifacts are cleaned
- If `backend/models` exists, syncs model files (.gguf) into `dist/models` non‑destructively

Outputs:

- Executable(s): `dist/`
- PWA (optional standalone hosting): `dist/pwa/`
- Models (if present): `dist/models/`

Optional: Development mode (without packaging)

- Backend (not recommended for voice in dev due to HTTPS limitations):
  - Create and use a venv, install requirements, then run `main.py`
  - The mobile device must be on the same network and connect to your laptop's IP/port
- Frontend: `npm start` serves the PWA dev server

The packaged flow above is the recommended way to test the full onboarding, HTTPS, QR pairing, and PWA install experience.

## Offline-first logging (SyncService)

The PWA includes a small helper (`frontend/src/services/SyncService.js`) that ensures logs are not lost if the backend is temporarily unreachable.

How it works:

- When you submit a log, the app tries to POST to the backend (`/input/log`).
- If the request fails (WiFi drop, backend down), the log is added to a local queue in IndexedDB (`log-queue`).
- When connectivity returns (browser `online` event), the app automatically replays queued items to the backend.

Key APIs:

- `sendOrQueue(session, backendUrl)`: try sending now, otherwise queue.
- `flushQueue(backendUrl)`: replay all queued items to the backend.
- `setupOnlineFlush(backendUrlProvider)`: installs an `online` listener that calls `flushQueue` when the network returns.

Minimal wiring example in your app component:

```js
// in a top-level component (e.g., App.js)
import { sendOrQueue, setupOnlineFlush } from './services/SyncService';

function getBackendUrl() {
  return localStorage.getItem('ndk_backend_url');
}

// On mount, set up auto-flush when network comes back
useEffect(() => {
  const teardown = setupOnlineFlush(getBackendUrl);
  return teardown;
}, []);

async function handleSubmitLog(session) {
  const backendUrl = getBackendUrl();
  const result = await sendOrQueue(session, backendUrl);
  if (result.status === 'queued') {
    // Show a friendly toast/snackbar: "Saved locally; will sync when online"
  }
}
```

This keeps the UX smooth: parents can continue logging even during brief outages, and the data will be persisted to the backend automatically.

## Quick Development Setup (optional)

If you prefer a traditional dev setup (without packaging):

1. Backend

- Create a venv and install deps
- Run the app
- Note: Voice features may not work reliably in HTTP dev mode on mobile

1. Frontend

- `npm install` and `npm start`

1. Pairing

- Use the LAN IP of your laptop; mobile and laptop must be on the same Wi‑Fi
- For full voice functionality, use the packaged HTTPS flow

## Data Privacy

- All processing happens locally on your devices
- No external API calls or cloud storage
- Voice processing via Web Speech API (local)
- Data stored as JSON files you fully control

## License

[Add license information]

## Troubleshooting

Common issues and fixes when running the packaged app:

1. Windows SmartScreen blocks the app

- Click “More info” → “Run anyway”. This occurs because the build isn’t code‑signed.

1. Browser warns about connection security on first use

- The backend serves HTTPS with a self‑signed certificate. On first visit to <https://LAN-IP:8443> your browser will prompt to proceed — accept/continue. Subsequent visits won’t re‑prompt.

1. PWA doesn’t show “Install / Add to Home screen”

- Ensure you’re using the HTTPS link (not <http://localhost>).
- Use a supported mobile browser (Chrome on Android, Safari on iOS) and visit <https://LAN-IP:8443/pwa>.
- If you previously dismissed the prompt, open the browser menu and choose “Install app” or “Add to Home Screen”.

1. Voice input not working

- Voice requires HTTPS. Confirm the address bar shows <https://LAN-IP:8443>.
- Grant microphone permission when prompted; check browser/site settings if previously denied.
- Close other apps that might be using the microphone.

1. Mobile can’t connect to the backend

- Phone and laptop must be on the same Wi‑Fi network.
- Windows Firewall or antivirus may block ports 8000/8443. Allow the app in Firewall or temporarily test by allowing the Python executable used by the packaged backend.
- Confirm the console shows the correct LAN IP and that you’re using the same IP on mobile.

1. QR code doesn’t scan

- Increase screen brightness or view the plain URL printed under the QR in the console.
- The pairing URL is also copied to the Windows clipboard on launch — paste it directly if needed.

1. Models or data missing after update

- The packager preserves `dist/models` and `dist/data`. If you replaced the whole `dist` folder, move your old `models` and `data` back into the new `dist`.

If issues persist, share a screenshot of the console output and the exact URL you’re using.

## Release checklist (maintainers)

Before sharing a new build with users:

1. Build

- From repo root, run `./build_package.ps1` in PowerShell.
- Confirm it completes without errors.

1. Verify outputs

- `dist/` contains the executable(s).
- `dist/pwa/` exists and mirrors the frontend build.
- Existing `dist/models` and `dist/data` remain intact (not deleted).

1. Smoke test onboarding

- Double‑click the `.exe`; confirm the console prints HTTPS and QR using the LAN IP.
- Confirm the pairing URL is copied to the clipboard.

1. Mobile flow

- On a phone on the same Wi‑Fi, open <https://LAN-IP:8443/pwa>.
- Accept the self‑signed cert prompt.
- Confirm install prompt appears or can be invoked from the browser menu; add to home screen.

1. Voice and permissions

- Test voice input in the PWA over HTTPS and verify mic permission prompts appear and work.

1. Data/model checks

- If `backend/models` exists, ensure `.gguf` files were synced to `dist/models`.
- Confirm test logs are saved and persist in `dist/data`.

1. Firewall

- On Windows, verify the app can accept connections on ports 8000/8443; adjust Firewall rules if needed.

Package and share the `dist` folder contents (or zip) with users; remind them to run the `.exe` and follow the QR/HTTPS pairing instructions.
