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

To create a standalone .exe file:

```bash
pip install pyinstaller
pyinstaller --onefile --name autism_tracker_backend main.py
```

The executable will be in the `dist/` folder.

## Security Notes

- All traffic stays on local WiFi network
- No cloud storage or external data transmission
- Self-signed HTTPS support can be added for additional security
- QR code pairing provides secure device connection