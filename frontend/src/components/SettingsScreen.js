import React, { useState, useEffect } from 'react';

const SettingsScreen = ({ settings, onSettingsUpdate, onNavigate, onDisconnect, speechService }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  // Removed unused schedule/isLoading state
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [speechTest, setSpeechTest] = useState({ testing: false, result: null });

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSettingChange = (category, key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleDirectSettingChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setError('');
    
    try {
      await onSettingsUpdate(localSettings);
      
      if (speechService.isSupported) {
        speechService.speak('Settings saved successfully.');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setError('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    const defaultSettings = {
      input_mode: 'voice',
      llm_model: 'llama2',
      theme: 'light',
      speech: { silence_timeout_ms: 10000 },
      accessibility: {
        high_contrast: false,
        large_text: false,
        screen_reader: false
      }
    };
    
    setLocalSettings(defaultSettings);
  };

  const testSpeechFeatures = async () => {
    setSpeechTest({ testing: true, result: null });
    
    try {
      // Test TTS
      await speechService.speak('Testing text to speech.');
      
      // Test STT
      const sttSupported = await speechService.testSpeechRecognition();
      
      setSpeechTest({
        testing: false,
        result: {
          tts: true,
          stt: sttSupported,
          overall: sttSupported
        }
      });
    } catch (error) {
      setSpeechTest({
        testing: false,
        result: {
          tts: false,
          stt: false,
          overall: false,
          error: error.message
        }
      });
    }
  };

  const renderGeneralSettings = () => (
    <div className="settings-section">
      <h3>General Settings</h3>
      
      {/* Input Mode */}
      <div className="setting-item">
        <label htmlFor="input-mode">Input Mode:</label>
        <select
          id="input-mode"
          value={localSettings.input_mode}
          onChange={(e) => handleDirectSettingChange('input_mode', e.target.value)}
          className="setting-input"
        >
          <option value="voice">Voice Only</option>
          <option value="text">Text Only</option>
          <option value="both">Voice & Text</option>
        </select>
        <p className="setting-description">
          Choose how you want to input information
        </p>
      </div>

      {/* Theme */}
      <div className="setting-item">
        <label htmlFor="theme">Theme:</label>
        <select
          id="theme"
          value={localSettings.theme}
          onChange={(e) => handleDirectSettingChange('theme', e.target.value)}
          className="setting-input"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      {/* LLM Model */}
      <div className="setting-item">
        <label htmlFor="llm-model">AI Model:</label>
        <select
          id="llm-model"
          value={localSettings.llm_model}
          onChange={(e) => handleDirectSettingChange('llm_model', e.target.value)}
          className="setting-input"
        >
          <option value="llama2">Llama 2</option>
          <option value="llama3">Llama 3</option>
          <option value="mistral">Mistral</option>
          <option value="codellama">Code Llama</option>
        </select>
        <p className="setting-description">
          Select the AI model for processing your input (requires Ollama)
        </p>
      </div>
    </div>
  );

  const renderAccessibilitySettings = () => (
    <div className="settings-section">
      <h3>Accessibility</h3>
      
      <div className="setting-item">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={localSettings.accessibility.high_contrast}
            onChange={(e) => handleSettingChange('accessibility', 'high_contrast', e.target.checked)}
          />
          <span>High Contrast Mode</span>
        </label>
        <p className="setting-description">
          Use high contrast colors for better visibility
        </p>
      </div>

      <div className="setting-item">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={localSettings.accessibility.large_text}
            onChange={(e) => handleSettingChange('accessibility', 'large_text', e.target.checked)}
          />
          <span>Large Text</span>
        </label>
        <p className="setting-description">
          Increase text size for better readability
        </p>
      </div>

      <div className="setting-item">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={localSettings.accessibility.screen_reader}
            onChange={(e) => handleSettingChange('accessibility', 'screen_reader', e.target.checked)}
          />
          <span>Screen Reader Support</span>
        </label>
        <p className="setting-description">
          Optimize for screen reader usage
        </p>
      </div>
    </div>
  );

  const renderSpeechSettings = () => (
    <div className="settings-section">
      <h3>Speech Settings</h3>
      
      <div className="setting-item">
        <div className="speech-status">
          <p><strong>Speech Support:</strong></p>
          <ul>
            <li>Text-to-Speech: {speechService.synthesis ? '✅ Supported' : '❌ Not supported'}</li>
            <li>Speech-to-Text: {speechService.isSupported ? '✅ Supported' : '❌ Not supported'}</li>
          </ul>
        </div>
      </div>

      <div className="setting-item">
        <button 
          className="btn btn-secondary"
          onClick={testSpeechFeatures}
          disabled={speechTest.testing}
        >
          {speechTest.testing ? 'Testing...' : 'Test Speech Features'}
        </button>
        
        {speechTest.result && (
          <div className="speech-test-results">
            <h4>Test Results:</h4>
            <ul>
              <li>Text-to-Speech: {speechTest.result.tts ? '✅ Working' : '❌ Failed'}</li>
              <li>Speech-to-Text: {speechTest.result.stt ? '✅ Working' : '❌ Failed'}</li>
            </ul>
            {speechTest.result.error && (
              <p className="error">Error: {speechTest.result.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Silence timeout */}
      <div className="setting-item">
        <label htmlFor="silence-timeout">Silence Timeout:</label>
        <select
          id="silence-timeout"
          className="setting-input"
          value={(localSettings.speech && localSettings.speech.silence_timeout_ms) || 10000}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            setLocalSettings(prev => ({
              ...prev,
              speech: { ...(prev.speech || {}), silence_timeout_ms: val }
            }));
          }}
        >
          <option value={3000}>3 seconds</option>
          <option value={5000}>5 seconds</option>
          <option value={8000}>8 seconds</option>
          <option value={10000}>10 seconds</option>
        </select>
        <p className="setting-description">How long the app should wait in silence before auto-stopping voice input.</p>
      </div>

      {speechService.getVoices().length > 0 && (
        <div className="setting-item">
          <label htmlFor="voice-selection">Voice:</label>
          <select
            id="voice-selection"
            className="setting-input"
            onChange={(e) => {
              // This would need to be implemented in the speech service
              console.log('Voice selected:', e.target.value);
            }}
          >
            {speechService.getVoices().map((voice, index) => (
              <option key={index} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  const renderHelpSection = () => (
    <div className="settings-section">
      <h3>Help & Support</h3>
      
      <div className="help-topics">
        <details className="help-topic">
          <summary>Getting Started</summary>
          <div className="help-content">
            <h4>First Time Setup:</h4>
            <ol>
              <li>Make sure your laptop backend is running</li>
              <li>Pair your mobile device using the QR code</li>
              <li>Test your voice input (if using voice mode)</li>
              <li>Configure your preferred settings</li>
            </ol>
          </div>
        </details>

        <details className="help-topic">
          <summary>Using Voice Input</summary>
          <div className="help-content">
            <h4>Voice Input Tips:</h4>
            <ul>
              <li>Speak clearly and at a normal pace</li>
              <li>Ensure you're in a quiet environment</li>
              <li>Grant microphone permissions when prompted</li>
              <li>Wait for the app to process before speaking again</li>
            </ul>
          </div>
        </details>

        <details className="help-topic">
          <summary>Data Privacy</summary>
          <div className="help-content">
            <h4>Your Privacy:</h4>
            <ul>
              <li>All data stays on your local network</li>
              <li>No cloud storage or external transmission</li>
              <li>Voice processing happens locally on your laptop</li>
              <li>You can delete data anytime from the backend</li>
            </ul>
          </div>
        </details>

        <details className="help-topic">
          <summary>Troubleshooting</summary>
          <div className="help-content">
            <h4>Common Issues:</h4>
            <ul>
              <li><strong>Connection Lost:</strong> Check WiFi and backend status</li>
              <li><strong>Voice Not Working:</strong> Check microphone permissions</li>
              <li><strong>Slow Response:</strong> Ensure backend has sufficient resources</li>
              <li><strong>App Won't Install:</strong> Try adding to home screen from browser menu</li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  );

  return (
    <div className="settings-screen">
      {/* Header */}
      <div className="settings-header">
        <div className="header-left">
          <button 
            className="btn btn-secondary"
            onClick={() => onNavigate('conversation')}
          >
            ← Back
          </button>
          <h2 style={{ marginLeft: '0.5rem' }}>Settings</h2>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={saveSettings}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="settings-tabs">
        {[
          { id: 'general', name: 'General' },
          { id: 'accessibility', name: 'Accessibility' },
          { id: 'speech', name: 'Speech' },
          { id: 'help', name: 'Help' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="settings-content">
        <div className="card">
          {activeTab === 'general' && renderGeneralSettings()}
          {activeTab === 'accessibility' && renderAccessibilitySettings()}
          {activeTab === 'speech' && renderSpeechSettings()}
          {activeTab === 'help' && renderHelpSection()}
        </div>
      </div>

      {/* Actions */}
      <div className="settings-actions">
        <div className="card">
          <h3>Actions</h3>
          
          <div className="action-buttons">
            <button 
              className="btn btn-secondary"
              onClick={resetSettings}
              disabled={isSaving}
            >
              Reset to Defaults
            </button>
            
            <button 
              className="btn btn-danger"
              onClick={() => {
                if (window.confirm('Are you sure you want to disconnect? You will need to pair again.')) {
                  onDisconnect();
                }
              }}
              disabled={isSaving}
            >
              Disconnect Backend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;