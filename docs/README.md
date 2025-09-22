# NDK Tracker - Privacy-First Family Health Tracker

A comprehensive Progressive Web App (PWA) and local backend system for tracking daily activities of neurodiverse children with complete privacy and local data storage.

## Overview

The NDK Tracker consists of two main components:
- **Backend**: A FastAPI server that runs locally on your laptop (.exe file)
- **Frontend**: A React PWA that installs on mobile devices from the browser

## Key Features

### 🔒 Privacy First
- All data stored locally on your device
- No cloud storage or external data transmission
- Secure device pairing via QR codes
- Works entirely on your local WiFi network

### 🎤 Voice-First Interface
- Web Speech API for speech-to-text input
- Text-to-speech responses and prompts
- Conversational slot-filling for missing information
- Fallback text input option

### 📊 Activity Tracking
- Food and meal logging
- Medication tracking
- Behavior and mood monitoring
- Exercise and physical activity
- Water intake tracking
- Bathroom/potty activities
- School feedback and events

### 📈 Visualization
- Timeline view with multi-track display
- Category-based filtering
- Date range selection
- Interactive data exploration
- Summary statistics

### ♿ Accessibility Features
- High contrast mode
- Large text options
- Screen reader support
- Keyboard navigation
- Touch-friendly interface

## Architecture

```
Mobile Device (PWA)     Local Network     Laptop/Desktop (Backend)
┌─────────────────┐    ┌─────────────┐    ┌──────────────────────┐
│  React PWA      │◄───│ WiFi/HTTP   │───►│  FastAPI Server      │
│  - Voice Input  │    │ QR Pairing  │    │  - Local LLM         │
│  - Timeline     │    │ Port 8080   │    │  - JSON Storage      │
│  - Settings     │    │             │    │  - Ollama Integration│
└─────────────────┘    └─────────────┘    └──────────────────────┘
```

## Technology Stack

### Backend
- **FastAPI** - Python web framework
- **Ollama** - Local LLM processing (optional)
- **PyInstaller** - Single executable creation
- **QRCode** - Device pairing
- **Zeroconf** - Network discovery

### Frontend
- **React 18** - UI framework
- **Web Speech API** - Voice input/output
- **HTML5 QR Code** - QR scanning
- **Vis.js Timeline** - Data visualization
- **Service Workers** - PWA functionality

### Data Storage
- **JSON files** - Local file system storage
- **Session-based** - Daily activity logs
- **Structured format** - Easy data export/backup

## Project Structure

```
NDK_Tracker/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   ├── NDK_tracker_backend.spec  # PyInstaller spec
│   └── README.md           # Backend documentation
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API and speech services
│   │   └── App.js          # Main application
│   ├── public/
│   │   ├── manifest.json   # PWA manifest
│   │   └── sw.js          # Service worker
│   └── package.json        # Node dependencies
├── docs/
│   ├── setup.md           # Development setup guide
│   └── README.md          # This file
└── prompt1.md             # Original project requirements
```

## Getting Started

1. **Setup Backend** (on laptop/desktop)
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```

2. **Setup Frontend** (development)
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Pair Devices**
   - Open PWA on mobile browser
   - Scan QR code displayed by backend
   - Install PWA using "Add to Home Screen"

For detailed setup instructions, see [setup.md](setup.md).

## Use Cases

### Daily Routine Tracking
- Morning medication reminders and logging
- Meal and snack documentation with time stamps
- Behavior observations throughout the day
- School feedback and incident reports
- Evening routine and bedtime activities

### Pattern Analysis
- Weekly timeline views to identify patterns
- Correlation between activities and behaviors
- Medication effectiveness tracking
- School day vs. weekend comparisons
- Long-term trend visualization

### Family Communication
- Share daily summaries between caregivers
- Teacher-parent communication via logs
- Medical appointment preparation
- Therapy session documentation
- Progress tracking over time

## Data Privacy

### What We Store
- Activity logs and timestamps
- Voice transcript text (processed locally)
- User preferences and settings
- Conversation history for sessions

### What We DON'T Store
- Audio recordings (voice is processed in real-time)
- Personal identifying information in logs
- Cloud backups or external copies
- Analytics or usage tracking data

### Data Location
- All data stored in `./data/` folder on backend machine
- JSON format for easy backup and portability
- No database required - simple file system storage
- Full user control over data retention and deletion

## Security Features

- Local network communication only
- QR code device pairing with secure tokens
- Optional HTTPS with self-signed certificates
- No external API calls or data transmission
- Offline-capable PWA functionality

## Accessibility Compliance

- WCAG 2.1 AA compliance target
- Screen reader compatible
- High contrast mode available
- Large text scaling options
- Keyboard-only navigation support
- Voice-first interaction design

## Future Enhancements

- Multi-child profile support
- Data export/import functionality
- Backup and sync between devices
- Advanced analytics and insights
- Integration with wearable devices
- Medication reminder notifications

## Contributing

This is a privacy-focused family application. For development:

1. Fork the repository
2. Create a feature branch
3. Follow existing code patterns
4. Test thoroughly on multiple devices
5. Submit pull request with detailed description

## License

[Specify license here]

## Support

For technical support or questions:
- Check the [setup guide](setup.md)
- Review backend logs for errors
- Test network connectivity between devices
- Verify speech API browser support

## Acknowledgments

Built with privacy and accessibility as core principles, designed specifically for neurodiverse families who need reliable, local data tracking without compromising personal information security.
