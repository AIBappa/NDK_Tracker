import React, { useState, useEffect } from 'react';
import './App.css';
import PairingScreen from './components/PairingScreen';
import ConversationScreen from './components/ConversationScreen';
import TimelineScreen from './components/TimelineScreen';
import SettingsScreen from './components/SettingsScreen';
import { ApiService } from './services/ApiService';
import { SpeechService } from './services/SpeechService';

function App() {
  const [currentScreen, setCurrentScreen] = useState('pairing');
  const [isConnected, setIsConnected] = useState(false);
  const [backendUrl, setBackendUrl] = useState(localStorage.getItem('backendUrl') || '');
  const [settings, setSettings] = useState({
    input_mode: 'voice',
    theme: 'light',
    speech: { silence_timeout_ms: 5000 },
    accessibility: {
      high_contrast: false,
      large_text: false,
      screen_reader: false
    }
  });
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [justInstalled, setJustInstalled] = useState(false);
  const [autoInstallRequested, setAutoInstallRequested] = useState(false);

  // Initialize services
  const apiService = new ApiService(backendUrl);
  const speechService = new SpeechService();

  // Initial connection and settings load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Check if we have a saved backend URL and test connection
    if (backendUrl) {
      testConnection();
    }
    
    // Load settings
    loadSettings();

    // Apply accessibility settings
    applyAccessibilitySettings();
  }, [backendUrl]);

  // Read backend URL from query param during first load (e.g., /pwa?backend=http://192.168.x.x:8000)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const backend = params.get('backend');
      if (backend) {
        // Normalize and save
        let clean = backend.trim();
        if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
          clean = `http://${clean}`;
        }
        localStorage.setItem('backendUrl', clean);
        setBackendUrl(clean);
        setIsConnected(false);
        setCurrentScreen('pairing');
        // Trigger a quick connection test
        (async () => {
          const ok = await ApiService.testConnection(clean);
          if (ok) {
            handlePairingSuccess(clean);
          }
        })();
      }
    } catch (e) {
      // ignore
    }
    // run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PWA install prompt and appinstalled handling
  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onAppInstalled = () => {
      setJustInstalled(true);
      setDeferredPrompt(null);
      if (speechService && speechService.isSupported) {
        speechService.speak('NDK Tracker installed. The app icon should now be on your home screen.');
      }
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
    // We intentionally do not include speechService to avoid retriggering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If pairing page asked for install (install=1), prompt automatically when possible
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('install') === '1' && deferredPrompt && !autoInstallRequested) {
      setAutoInstallRequested(true);
      (async () => {
        try {
          deferredPrompt.prompt();
          await deferredPrompt.userChoice;
        } catch (_) {
          // ignore
        }
      })();
    }
  }, [deferredPrompt, autoInstallRequested]);

  const testConnection = async () => {
    try {
      const response = await apiService.healthCheck();
      if (response.status === 'healthy') {
        setIsConnected(true);
        setCurrentScreen('conversation');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setIsConnected(false);
      setCurrentScreen('pairing');
    }
  };

  const loadSettings = async () => {
    if (backendUrl && isConnected) {
      try {
        const userSettings = await apiService.getSettings();
        setSettings(userSettings);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  };

  const applyAccessibilitySettings = () => {
    const root = document.documentElement;
    
    if (settings.accessibility.high_contrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (settings.accessibility.large_text) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    if (settings.theme === 'dark') {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }
  };

  const handlePairingSuccess = (url) => {
    setBackendUrl(url);
    localStorage.setItem('backendUrl', url);
    setIsConnected(true);
    setCurrentScreen('conversation');
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setBackendUrl('');
    localStorage.removeItem('backendUrl');
    setCurrentScreen('pairing');
  };

  const handleSettingsUpdate = async (newSettings) => {
    try {
      await apiService.updateSettings(newSettings);
      setSettings(newSettings);
      applyAccessibilitySettings();
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'pairing':
        return (
          <PairingScreen 
            onPairingSuccess={handlePairingSuccess}
            speechService={speechService}
          />
        );
      case 'conversation':
        return (
          <ConversationScreen
            apiService={apiService}
            speechService={speechService}
            settings={settings}
            onNavigate={setCurrentScreen}
          />
        );
      case 'timeline':
        return (
          <TimelineScreen
            apiService={apiService}
            onNavigate={setCurrentScreen}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            settings={settings}
            onSettingsUpdate={handleSettingsUpdate}
            onNavigate={setCurrentScreen}
            onDisconnect={handleDisconnect}
            speechService={speechService}
          />
        );
      default:
        return (
          <div className="error-screen">
            <h2>Unknown Screen</h2>
            <button onClick={() => setCurrentScreen('conversation')}>
              Go to Home
            </button>
          </div>
        );
    }
  };

  return (
    <div className={`App ${settings.theme}`}>
      <header className="App-header">
        <div className="header-left">
          <h1>NDK Tracker</h1>
          {isConnected && (
            <div className="connection-status connected" title="Connected to backend">
              <span className="status-dot"></span>
              Connected
            </div>
          )}
        </div>
        <div className="header-actions">
          {/* Simple install CTA if supported */}
          {deferredPrompt && (
            <button
              className="btn btn-secondary"
              onClick={async () => {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                  // User accepted install; await appinstalled event
                }
              }}
            >
              Install App
            </button>
          )}
        </div>
      </header>
      
      <main className="App-main">
        {renderCurrentScreen()}
      </main>
      
      {/* Connection lost notification */}
      {!isConnected && backendUrl && currentScreen !== 'pairing' && (
        <div className="notification error">
          <p>Connection to backend lost. Please check your connection.</p>
          <button onClick={() => setCurrentScreen('pairing')}>
            Reconnect
          </button>
        </div>
      )}

      {/* Post-install message */}
      {justInstalled && (
        <div className="notification success" role="status" aria-live="polite">
          <p>NDK Tracker installed. An app icon should now be on your home screen. Open it to continue.</p>
          <button onClick={() => setJustInstalled(false)}>Dismiss</button>
        </div>
      )}
    </div>
  );
}

export default App;