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