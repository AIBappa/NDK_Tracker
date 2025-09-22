# NDK Tracker

A privacy-first family health tracker PWA for neurodiverse children with local data storage and voice-first interaction.

## Quick Start

### Backend (Laptop)
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend (Mobile PWA)
```bash
cd frontend
npm install
npm start
```

Then pair devices using the QR code displayed by the backend.

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

## Release steps

Use the one-shot script to package the app (PWA + backend) in a single pass. Run from the repo root in your existing PowerShell session (do not open a new window):

1. Ensure Node.js and Python are installed
2. Run the packager:
	 - `./build_package.ps1`
3. Results:
	 - `dist/` contains the generated Windows `.exe` (from `backend/dist`) and
	 - `dist/pwa/` contains the standalone PWA files (optional hosting)

The script will:
- Build the React PWA (frontend/build)
- Mirror it into `backend/frontend/build` (served at `/pwa`)
- Ensure `backend/.venv` exists and install Python deps
- Build the `.exe` using `backend/NDK_tracker_setup.spec`

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

## Quick Development Setup

1. **Clone the repository**
2. **Backend setup**: Install Python deps, run `python main.py`
3. **Frontend setup**: Install Node deps, run `npm start`
4. **Pairing**: Scan QR code from mobile browser
5. **PWA install**: Use "Add to Home Screen" in mobile browser

## Data Privacy

- All processing happens locally on your devices
- No external API calls or cloud storage
- Voice processing via Web Speech API (local)
- Data stored as JSON files you fully control

## License

[Add license information]