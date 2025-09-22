# NDK Tracker Backend

FastAPI backend for the NDK Tracker PWA. Runs locally on your laptop, serves both HTTP and HTTPS, and provides a smooth pairing flow for mobile devices on the same Wi‑Fi network.

## Highlights

- Local data storage (no cloud required)
- Voice and text input processing via LLM
- Dual HTTP/HTTPS serving with self‑signed certificate
- QR pairing and Windows clipboard copy of the pairing URL
- Serves the PWA bundle at `/pwa` when present
- Timeline data endpoints and conversational interface

## Requirements

- Python 3.10+ (recommended)
- Ollama (optional, for local LLM processing)

Install Python dependencies:

```powershell
pip install -r requirements.txt
```

## How it runs (minimal_setup)

The recommended entrypoint is `minimal_setup.py`. It:

- Locates or downloads a small GGUF model (TinyLlama) unless `--skip-download` is used
- Sets up environment variables for llama-cpp when using a local GGUF
- Generates a self‑signed certificate (with localhost + LAN IP SAN)
- Starts HTTP on port 8000 and HTTPS on port 8443
- Prints the LAN IP URLs and a QR code for pairing; copies the pairing URL to the clipboard on Windows

Run locally with HTTPS and pairing support:

```powershell
# From backend/ directory
python minimal_setup.py --skip-download
```

What you’ll see on start:

- HTTP: <http://LAN-IP:8000>
- HTTPS: <https://LAN-IP:8443>
- Pairing page: <https://LAN-IP:8443/pair>
- An ASCII QR code for the pairing link
- On Windows, the pairing URL is copied to your clipboard automatically

Press Ctrl+C to stop. Logs are written to `models/NDK_tracker.log` next to where the model lives.

## Development mode (basic)

You can also run the app in a minimal HTTP-only mode:

```powershell
python main.py --reload
```

Note: Voice input on mobile usually requires HTTPS; prefer `minimal_setup.py` when testing microphone features across devices.

## Packaging and distribution

Use the repo‑root PowerShell script (recommended):

```powershell
# From repo root (not backend/)
./build_package.ps1
```

This script will:

- Build the React PWA and mirror it into `backend/frontend/build` (served at `/pwa`)
- Ensure `backend/.venv` exists and install Python deps
- Package the backend using `backend/NDK_tracker_setup.spec`
- Place the final executable(s) into `dist/` at the repo root
- Copy standalone PWA assets to `dist/pwa/`
- Preserve `dist/models` and `dist/data` between builds; sync `.gguf` models non‑destructively

End users only need the `.exe` in `dist/`. Double‑click to start; pairing info and QR will be shown.

Advanced: If you need a direct PyInstaller call without the script, use the spec file the script relies on:

```powershell
# From backend/
python -m PyInstaller --noconfirm --distpath ..\dist --workpath .\build NDK_tracker_setup.spec
```

## API endpoints (core)

Pairing and PWA:

- `GET /` — Root, may show pairing/help
- `GET /pair` — Pairing page (used by QR)
- `GET /pwa` — Serves the PWA build if present at `backend/frontend/build`

Data input:

- `POST /input/log` — Submit a new log entry
- `POST /input/clarify` — Answer clarification questions
- `POST /input/save_session` — Save a completed session

Data retrieval:

- `GET /data/summary` — Get daily/range summary
- `GET /timeline/view` — Timeline data for visualization

Configuration:

- `GET /settings` — Get current settings
- `POST /settings` — Update settings
- `GET /setup/schedule` — Get schedule config
- `POST /setup/schedule` — Update schedule

Health:

- `GET /health` — Health check and status

## Data and models

- Data defaults to `./data/` (alongside the backend)
  - `./data/sessions/YYYY-MM-DD.json` — Daily session files
  - `./data/settings.json` — App settings
  - `./data/schedule.json` — Reminder schedule

- Models live next to the executable when packaged: `dist/models/`
  - `minimal_setup.py` prefers a GGUF model in `dist/models` and sets `LLAMA_CPP_MODEL_PATH`
  - If none found and not `--skip-download`, it downloads a small TinyLlama `.gguf`

## Security and certificates

- HTTPS is enabled automatically on port 8443 with a self‑signed certificate
- The cert/key are stored under `models/certs/`
- On first mobile use, accept the certificate warning to proceed
- Always use the HTTPS link on mobile to enable voice input

## Notes

- Windows clipboard integration copies the pairing URL automatically at startup
- LAN IP detection prefers private ranges (192.168.x, 10.x, 172.16–31.x)
- The backend runs HTTP and HTTPS in parallel so older clients can still connect over HTTP if needed
