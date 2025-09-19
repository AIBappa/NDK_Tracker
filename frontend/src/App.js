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
    accessibility: {
      high_contrast: false,
      large_text: false,
      screen_reader: false
    }
  });

  // Initialize services
  const apiService = new ApiService(backendUrl);
  const speechService = new SpeechService();

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
        <h1>Autism Tracker</h1>
        {isConnected && (
          <div className="connection-status connected">
            <span className="status-dot"></span>
            Connected
          </div>
        )}
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
    </div>
  );
}

export default App;