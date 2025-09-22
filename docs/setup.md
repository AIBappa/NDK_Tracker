# NDK Tracker Setup Guide

This guide will help you set up and run the NDK Tracker application for development.

## System Requirements

- **Backend (Laptop/Desktop)**:
  - Python 3.8 or later
  - Windows, macOS, or Linux
  - 4GB RAM minimum (8GB recommended)
  - WiFi network connection

- **Frontend (Mobile/Tablet)**:
  - Modern web browser with Web Speech API support
  - Chrome, Edge, Safari, or Firefox (latest versions)
  - Camera access for QR scanning
  - Microphone access for voice input
  - Same WiFi network as backend

## Quick Start

### 1. Backend Setup (Run on your laptop/desktop)

1. **Install Python Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Install Ollama (Optional but recommended)**
   - Download from https://ollama.ai
   - Install a model: `ollama pull llama2`

3. **Run the Backend**
   ```bash
   python main.py
   ```
   
   The server will start on `http://0.0.0.0:8080` and display:
   - Local IP address
   - QR code for pairing
   - Health status

### 2. Frontend Setup (Access from mobile device)

1. **Install Node.js Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm start
   ```
   
   This runs the frontend at `http://localhost:3000`

3. **Install as PWA**
   - Open the app in your mobile browser
   - Use "Add to Home Screen" option
   - The app will install as a Progressive Web App

### 3. Pairing Devices

1. Ensure both devices are on the same WiFi network
2. Start the backend on your laptop - note the QR code displayed
3. Open the PWA on your mobile device
4. Tap "Scan QR Code" and point camera at laptop screen
5. The devices will pair automatically

## Development Setup

### Backend Development

1. **Environment Setup**
   ```bash
   cd backend
   python -m venv NDK_tracker_env
   
   # Windows
   NDK_tracker_env\Scripts\activate
   
   # macOS/Linux
   source NDK_tracker_env/bin/activate
   
   pip install -r requirements.txt
   ```

2. **Run in Development Mode**
   ```bash
   python main.py --reload
   ```

3. **API Documentation**
   - Visit `http://localhost:8080/docs` for interactive API docs
   - Use `http://localhost:8080/health` to check server status

### Frontend Development

1. **Start Development Server**
   ```bash
   cd frontend
   npm start
   ```
   
   - App opens at `http://localhost:3000`
   - Hot reload enabled for development
   - Browser console shows any errors

2. **Build for Production**
   ```bash
   npm run build
   ```
   
   - Creates optimized build in `build/` folder
   - Ready for deployment or serving

### Testing the Connection

1. **Check Backend Health**
   ```bash
   curl http://localhost:8080/health
   ```

2. **Test API Endpoints**
   ```bash
   # Get pairing info
   curl http://localhost:8080/pairing/info
   
   # Submit a log entry
   curl -X POST http://localhost:8080/input/log \
     -H "Content-Type: application/json" \
     -d '{"message": "Test message", "voice_input": false}'
   ```

## Building for Production

### Backend Executable

1. **Install PyInstaller**
   ```bash
   pip install pyinstaller
   ```

2. **Build Executable**
   ```bash
   cd backend
   pyinstaller NDK_tracker_backend.spec
   ```
   
   The `.exe` file will be in `dist/NDK_tracker_backend.exe`

### Frontend PWA Build

1. **Create Production Build**
   ```bash
   cd frontend
   npm run build
   ```

2. **Serve Static Files**
   The build folder can be served by any web server or the backend can serve it.

## Configuration

### Backend Configuration

- **Data Storage**: Located in `./data/` directory
  - `sessions/YYYY-MM-DD.json` - Daily activity logs
  - `settings.json` - App settings
  - `schedule.json` - Reminder schedule

- **Settings File** (`./data/settings.json`):
  ```json
  {
    "input_mode": "voice",
    "llm_model": "llama2",
    "theme": "light",
    "accessibility": {
      "high_contrast": false,
      "large_text": false,
      "screen_reader": false
    }
  }
  ```

### Network Configuration

- **Firewall**: Ensure port 8080 is open on the backend machine
- **WiFi**: Both devices must be on the same local network
- **IP Address**: The backend automatically detects and displays local IP

## Troubleshooting

### Backend Issues

1. **Port Already in Use**
   ```bash
   python main.py --port 8081
   ```

2. **Ollama Not Working**
   - Install Ollama from https://ollama.ai
   - Pull a model: `ollama pull llama2`
   - Restart the backend

3. **Permission Errors**
   - Run as administrator (Windows) or with sudo (Linux/macOS)
   - Check file permissions in data directory

### Frontend Issues

1. **QR Scanner Not Working**
   - Grant camera permissions
   - Try manual URL entry
   - Use auto-discovery feature

2. **Voice Input Issues**
   - Grant microphone permissions
   - Test in browser settings
   - Use text input as fallback

3. **Connection Lost**
   - Check WiFi connection
   - Restart backend server
   - Re-pair devices if needed

### Network Issues

1. **Can't Connect to Backend**
   - Verify both devices on same WiFi
   - Check firewall settings
   - Try manual IP entry: `http://192.168.1.XXX:8080`

2. **Slow Performance**
   - Check CPU usage on backend machine
   - Reduce LLM model complexity
   - Close unnecessary applications

## Development Tips

### Backend Development

- Use `--reload` flag for auto-restart on code changes
- Check logs in terminal for debugging
- Test with curl or API docs at `/docs`
- Monitor data files in `./data/` directory

### Frontend Development

- Use browser dev tools for debugging
- Test voice features in latest Chrome/Edge
- Check PWA installation with Lighthouse
- Test offline functionality

### Data Structure

Example session data:
```json
{
  "datetime": "2025-09-20T14:30:00Z",
  "conversation": [
    {
      "from": "app",
      "message": "Tell me about food today."
    },
    {
      "from": "user",
      "message": "She had pasta for lunch at 1pm."
    }
  ],
  "raw_aggregate_text": "She had pasta for lunch at 1pm.",
  "structured_data": {
    "food": ["pasta"],
    "mealtime": "lunch",
    "time": "13:00"
  }
}
```

## Security Considerations

- All data remains on local network
- No cloud storage or external transmission
- Self-signed certificates can be added for HTTPS
- Backend runs on localhost by default
- PWA can work offline after initial load

## Support

For development issues:
1. Check the logs in backend terminal
2. Use browser developer tools for frontend issues
3. Verify network connectivity between devices
4. Ensure all dependencies are installed correctly

## Next Steps

After setting up development environment:
1. Test voice input functionality
2. Create sample data entries
3. Verify timeline visualization
4. Test PWA installation on mobile
5. Build production executable for deployment