import React, { useState, useEffect, useRef } from 'react';

const ConversationScreen = ({ apiService, speechService, settings, onNavigate }) => {
  const [currentPrompt, setCurrentPrompt] = useState('Tell me about today\'s activities.');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);

  const textAreaRef = useRef(null);

  // Initialize conversation once
  useEffect(() => {
    startNewSession();
  }, []);

  // Auto-focus text input when input mode switches to text
  useEffect(() => {
    if (settings.input_mode === 'text' && textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [settings.input_mode]);

  // Do not auto-speak the prompt. Per design, speaking should only happen in response to user action.

  const startNewSession = () => {
    const newSessionId = `session_${Date.now()}`;
    setSessionId(newSessionId);
    setConversationHistory([]);
    setIsSessionActive(true);
    setCurrentPrompt('Tell me about today\'s activities.');
  };

  const handleVoiceInput = async () => {
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
      return;
    }

    // Check browser support and security context requirements
    if (!speechService.isSupported) {
      alert('Voice input is not supported in this browser. Please use Text, or try Chrome on Android.');
      setShowTextInput(true);
      setTimeout(() => textAreaRef.current?.focus(), 50);
      return;
    }

    // Many browsers require a secure context (HTTPS/localhost) for mic access
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!window.isSecureContext && !isLocalhost) {
      alert('Voice input requires a secure connection. Please install the app (Add to Home Screen) or enable HTTPS on the backend. Switching to Text input.');
      setShowTextInput(true);
      setTimeout(() => textAreaRef.current?.focus(), 50);
      return;
    }

    // Request microphone permission proactively
    const micOk = await speechService.requestMicrophonePermission();
    if (!micOk) {
      alert('Microphone permission denied. Please allow microphone access and try again.');
      setShowTextInput(true);
      setTimeout(() => textAreaRef.current?.focus(), 50);
      return;
    }

    try {
      setIsListening(true);
      setTranscript('');
      
      speechService.startListening(
        (result) => {
          setTranscript(result.interim || result.final);
          
          if (result.isFinal && result.final.trim()) {
            setIsListening(false);
            submitInput(result.final, true);
          }
        },
        (error) => {
          setIsListening(false);
          console.error('Speech recognition error:', error);
          alert('Voice input failed. Please try again or use Text.');
          setShowTextInput(true);
          setTimeout(() => textAreaRef.current?.focus(), 50);
        },
        () => {
          setIsListening(false);
        }
      );
    } catch (error) {
      setIsListening(false);
      console.error('Failed to start voice input:', error);
    }
  };

  const handleTextInput = () => {
    if (!showTextInput) {
      setShowTextInput(true);
      setTimeout(() => textAreaRef.current?.focus(), 100);
    } else {
      if (textInput.trim()) {
        submitInput(textInput, false);
        setTextInput('');
        setShowTextInput(false);
      }
    }
  };

  const submitInput = async (input, isVoiceInput) => {
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    
    // Add user input to conversation history
    const userMessage = {
      from: 'user',
      message: input,
      timestamp: new Date().toISOString(),
      isVoice: isVoiceInput
    };
    
    setConversationHistory(prev => [...prev, userMessage]);

    try {
      const response = await apiService.logEntry(input, isVoiceInput, sessionId);
      
      if (response.clarification_needed && response.question) {
        // Add app response to history
        const appMessage = {
          from: 'app',
          message: response.question,
          timestamp: new Date().toISOString()
        };
        
        setConversationHistory(prev => [...prev, appMessage]);
        setCurrentPrompt(response.question);
        
        // Speak the clarification question
        if (settings.input_mode !== 'text' && speechService.isSupported) {
          speechService.speak(response.question);
        }
      } else if (response.ready_to_save) {
        // Session is complete, show save options
        showSaveConfirmation(response);
      }
    } catch (error) {
      console.error('Failed to process input:', error);
      alert('Failed to process your input. Please try again.');
    } finally {
      setIsProcessing(false);
      setTranscript('');
    }
  };

  const showSaveConfirmation = (sessionData) => {
    const confirmation = window.confirm(
      'I\'ve gathered all the information. Would you like to save this session?'
    );
    
    if (confirmation) {
      saveSession(sessionData);
    } else {
      // Continue the session or discard
      const continueSession = window.confirm(
        'Would you like to continue adding more information, or discard this session?'
      );
      
      if (!continueSession) {
        discardSession();
      }
    }
  };

  const saveSession = async (sessionData) => {
    try {
      await apiService.saveSession({ session_id: sessionId, ...sessionData });
      
      if (speechService.isSupported) {
        speechService.speak('Session saved successfully. Starting a new session.');
      }
      
      // Start new session
      startNewSession();
    } catch (error) {
      console.error('Failed to save session:', error);
      alert('Failed to save session. Please try again.');
    }
  };

  const discardSession = () => {
    if (speechService.isSupported) {
      speechService.speak('Session discarded. Starting fresh.');
    }
    startNewSession();
  };

  const quitSession = () => {
    if (isSessionActive && conversationHistory.length > 0) {
      const saveBeforeQuit = window.confirm(
        'You have an active session. Would you like to save it before quitting?'
      );
      
      if (saveBeforeQuit) {
        // This is simplified - in real implementation, we'd need the full session data
        saveSession({ session_id: sessionId });
      }
    }
    
    setIsSessionActive(false);
    setConversationHistory([]);
    setCurrentPrompt('Tell me about today\'s activities.');
  };

  const getInputModeButtons = () => {
    switch (settings.input_mode) {
      case 'voice':
        return (
          <button 
            className={`btn btn-primary btn-large ${isListening ? 'listening' : ''}`}
            onClick={handleVoiceInput}
            disabled={isProcessing}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          >
            {isListening ? '🛑 Stop' : '🎤 Answer'}
          </button>
        );
      
      case 'text':
        return (
          <button 
            className="btn btn-primary btn-large"
            onClick={handleTextInput}
            disabled={isProcessing}
            aria-label="Answer with text"
          >
            ✏️ Answer
          </button>
        );
      
      case 'both':
      default:
        return (
          <div className="input-mode-buttons">
            <button 
              className={`btn btn-primary ${isListening ? 'listening' : ''}`}
              onClick={handleVoiceInput}
              disabled={isProcessing}
              aria-label={isListening ? 'Stop voice input' : 'Answer with voice'}
            >
              {isListening ? '🛑 Stop' : '🎤 Voice'}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={handleTextInput}
              disabled={isProcessing}
              aria-label="Answer with text"
            >
              ✏️ Text
            </button>
          </div>
        );
    }
  };

  return (
    <div className="conversation-screen">
      {/* Current Prompt Section */}
      <div className="prompt-section">
        <div className="card">
          <div className="prompt-content">
            <h2>{currentPrompt}</h2>
            
            {transcript && (
              <div className="transcript">
                <p><em>"{transcript}"</em></p>
              </div>
            )}
            
            {isProcessing && (
              <div className="processing-indicator">
                <div className="spinner"></div>
                <p>Processing your input...</p>
              </div>
            )}
          </div>
          
          <div className="input-actions">
            {getInputModeButtons()}
            
            <button 
              className="btn btn-secondary quit-btn"
              onClick={quitSession}
              disabled={isProcessing || isListening}
              aria-label="Quit current session"
            >
              ⏹️ Quit
            </button>
          </div>
        </div>
        
        {/* Text Input Area */}
        {showTextInput && (
          <div className="text-input-section">
            <textarea
              ref={textAreaRef}
              className="text-input"
              placeholder="Type your response here..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextInput();
                }
              }}
              disabled={isProcessing}
              rows={4}
              aria-label="Text input area"
            />
            <div className="text-input-actions">
              <button 
                className="btn btn-primary"
                onClick={handleTextInput}
                disabled={!textInput.trim() || isProcessing}
              >
                Send
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowTextInput(false);
                  setTextInput('');
                }}
                disabled={isProcessing}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Section */}
      <div className="navigation-section">
        <div className="nav-buttons">
          <button 
            className="btn btn-secondary"
            onClick={() => onNavigate('settings')}
            disabled={isProcessing || isListening}
            aria-label="Open settings"
          >
            ⚙️ Settings
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={() => onNavigate('timeline')}
            disabled={isProcessing || isListening}
            aria-label="View timeline"
          >
            📊 Timeline
          </button>
        </div>
      </div>

      {/* Conversation History (Collapsible) */}
      {conversationHistory.length > 0 && (
        <div className="conversation-history">
          <details className="history-details">
            <summary>Conversation History ({conversationHistory.length} messages)</summary>
            <div className="history-content">
              {conversationHistory.map((message, index) => (
                <div key={index} className={`message ${message.from}`}>
                  <div className="message-header">
                    <span className="sender">
                      {message.from === 'user' ? '👤 You' : '🤖 App'}
                      {message.isVoice && ' (Voice)'}
                    </span>
                    <span className="timestamp">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="message-content">
                    {message.message}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Voice Input Indicator */}
      {isListening && (
        <div className="voice-indicator">
          <div className="voice-animation">
            <div className="voice-wave"></div>
            <div className="voice-wave"></div>
            <div className="voice-wave"></div>
          </div>
          <p>Listening... Speak now</p>
        </div>
      )}
    </div>
  );
};

export default ConversationScreen;