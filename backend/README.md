# Autism Tracker Backend

A FastAPI-based backend server for the Autism Tracker PWA that runs locally on your laptop.

## Features

- Local data storage (no cloud required)
- Voice and text input processing via LLM
- QR code pairing with mobile PWA
- Timeline data visualization
- Conversational slot-filling interface
- Settings and schedule management

## Requirements

- Python 3.8+
- Ollama (optional, for local LLM processing)

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. (Optional) Install Ollama for LLM processing:
   - Download from https://ollama.ai
   - Install llama2 model: `ollama pull llama2`

## Running the Server

### Development Mode
```bash
python main.py --reload
```

### Production Mode
```bash
python main.py --host 0.0.0.0 --port 8080
```

### Command Line Options
- `--host`: Host to bind to (default: 0.0.0.0)
- `--port`: Port to bind to (default: 8080)
- `--reload`: Enable auto-reload for development

## API Endpoints

### Pairing
- `GET /` - Root endpoint with pairing info
- `GET /pairing/info` - QR code and pairing instructions

### Data Input
- `POST /input/log` - Submit new log entry
- `POST /input/clarify` - Answer clarification questions
- `POST /input/save_session` - Save completed session

### Data Retrieval
- `GET /data/summary` - Get daily/range summary
- `GET /timeline/view` - Get timeline visualization data

### Configuration  
- `GET /settings` - Get current settings
- `POST /settings` - Update settings
- `GET /setup/schedule` - Get schedule config
- `POST /setup/schedule` - Update schedule

### Health
- `GET /health` - Health check and status

## Data Storage

All data is stored locally in the `./data/` directory:
- `./data/sessions/YYYY-MM-DD.json` - Daily session files
- `./data/settings.json` - App settings
- `./data/schedule.json` - Reminder schedule

## Building Executable

### Platform Requirements

**⚠️ Important**: PyInstaller builds executables for the platform where it runs:
- **Windows → Windows .exe** (for Windows 11 users)
- **WSL/Linux → Linux binary** (won't run on Windows)

### Windows Build (Recommended for Windows 11)

Build on Windows PowerShell/CMD for Windows 11 compatibility:

```powershell
# Create virtual environment (recommended)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies and build tools
pip install -r requirements.txt
pip install pyinstaller

# Build Windows executable
pyinstaller --onefile --name autism_tracker_backend main.py
```

### WSL/Linux Build

For WSL users (creates Linux binary only):

```bash
# Install system dependencies first
sudo apt update
sudo apt install -y python3-full python3-venv build-essential cmake libomp-dev

# Create virtual environment (required for PEP 668)
python3 -m venv .venv
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
pip install pyinstaller

# Build Linux binary (NOT Windows compatible)
pyinstaller --onefile --name autism_tracker_backend main.py
```

The executable will be in the `dist/` folder.

## Minimal Setup (Recommended)

For the easiest deployment, use the minimal setup that includes everything in one executable:

### Build Minimal Setup Executable

**For Windows 11 executable (build on Windows):**

```powershell
# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
pip install pyinstaller

# Build Windows executable
# Include backend 'main' module explicitly so PyInstaller bundles it
pyinstaller --onefile --name autism_tracker_setup --hidden-import=main minimal_setup.py
```

**For WSL users (Linux binary only):**

```bash
# Install system dependencies
sudo apt update
sudo apt install -y python3-full python3-venv build-essential cmake libomp-dev

# Create virtual environment (required for PEP 668)
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install pyinstaller

# Build Linux binary
pyinstaller --onefile --name autism_tracker_setup --hidden-import=main minimal_setup.py

### Troubleshooting builds

- ModuleNotFoundError: No module named 'requests'
   - Ensure `requests` is listed in `backend/requirements.txt` and reinstall deps
   - Rebuild the exe. PyInstaller only bundles packages installed in the build env.

- ModuleNotFoundError: No module named 'main'
   - Build with `--hidden-import=main` as shown above so the backend module is included.
   - Alternatively, verify `main.py` is in the same folder as `minimal_setup.py` at build time.
```

### What the Minimal Setup Does

1. **Downloads a small LLM model** (~200MB TinyLlama model)
2. **Starts the backend server** automatically
3. **Provides one-click setup** for end users

### Usage

**For end users:**

1. Download `autism_tracker_setup.exe`
2. Double-click to run
3. Wait for model download (~200MB)
4. Backend starts automatically at `http://localhost:8000`

**For developers:**

```bash
# Build the executable
pyinstaller --onefile --name autism_tracker_setup minimal_setup.py

# Test the setup (skip download if model exists)
./dist/autism_tracker_setup --skip-download
```

### Minimal Setup Features

- **TinyLlama model**: 1.1B parameters (much smaller than 7B models)
- **Automatic model download**: No manual setup required
- **Self-contained**: Everything bundled in one executable
- **Cross-platform**: Works on Windows, Mac, and Linux
- **One-click deployment**: Perfect for non-technical users

### Alternative: Separate Setup

If you need more control over model selection:

1. **Model Setup Executable:**

   ```bash
   pyinstaller --onefile --name model_setup setup_models.py
   ```

2. **Backend Executable:**

   ```bash
   pyinstaller --onefile autism_tracker_backend.spec
   ```

Then run: `model_setup.exe --download llama2-7b` followed by `autism_tracker_backend.exe`

## Security Notes

- All traffic stays on local WiFi network
- No cloud storage or external data transmission
- Self-signed HTTPS support can be added for additional security
- QR code pairing provides secure device connection
