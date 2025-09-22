export class SpeechService {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isSupported = this.checkSupport();
    this.isListening = false;
    this.voices = [];
    
    // Initialize speech recognition if supported
    if (this.isSupported) {
      this.initializeSpeechRecognition();
      this.loadVoices();
    }
  }

  checkSupport() {
    return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
  }

  initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      // Use continuous mode so we can control stop behavior (e.g., silence timeout)
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }
  }

  loadVoices() {
    this.voices = this.synthesis.getVoices();
    
    // If voices aren't loaded yet, wait for the event
    if (this.voices.length === 0) {
      this.synthesis.addEventListener('voiceschanged', () => {
        this.voices = this.synthesis.getVoices();
      });
    }
  }

  // Speech Recognition (Speech-to-Text)
  startListening(onResult, onError, onEnd, options = {}) {
    if (!this.isSupported || !this.recognition) {
      if (onError) onError(new Error('Speech recognition not supported'));
      return;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.isListening = true;
    const silenceMs = typeof options.silenceMs === 'number' ? options.silenceMs : 5000;
    const stopOnSilence = options.stopOnSilence !== false; // default true
    const stopOnFinal = options.stopOnFinal === true; // default false
    let silenceTimer = null;
    let aggregatedFinal = '';
    let lastInterim = '';
    
    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Aggregate results
      if (finalTranscript) {
        aggregatedFinal += (aggregatedFinal ? ' ' : '') + finalTranscript.trim();
      }
      lastInterim = interimTranscript.trim();

      // Callback to UI for live display
      if (onResult) {
        onResult({
          final: aggregatedFinal,
          interim: lastInterim,
          isFinal: stopOnFinal && finalTranscript.length > 0
        });
      }

      // Reset silence timer on any result
      if (stopOnSilence) {
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          // Consider whatever we have as the final transcript
          const combined = (aggregatedFinal + ' ' + lastInterim).trim();
          try {
            this.stopListening();
          } finally {
            if (onResult && combined) {
              onResult({ final: combined, interim: '', isFinal: true });
            }
            if (onEnd) onEnd();
          }
        }, silenceMs);
      }
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      if (silenceTimer) clearTimeout(silenceTimer);
      if (onError) onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (silenceTimer) clearTimeout(silenceTimer);
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
    } catch (error) {
      this.isListening = false;
      if (onError) onError(error);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  // Text-to-Speech
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set options
      utterance.rate = options.rate || 1;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;
      
      // Select voice
      if (options.voiceName && this.voices.length > 0) {
        const voice = this.voices.find(v => v.name === options.voiceName);
        if (voice) utterance.voice = voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(event.error));

      this.synthesis.speak(utterance);
    });
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  // Get available voices
  getVoices() {
    return this.voices;
  }

  // Check if currently speaking
  isSpeaking() {
    return this.synthesis && this.synthesis.speaking;
  }

  // Utility method for conversational interaction
  async askQuestion(question, options = {}) {
    return new Promise((resolve, reject) => {
      // First, speak the question
      this.speak(question, options.ttsOptions)
        .then(() => {
          // Then start listening for the response
          if (options.waitForResponse !== false) {
            this.startListening(
              (result) => {
                if (result.isFinal && result.final.trim()) {
                  resolve(result.final);
                }
              },
              (error) => reject(error),
              () => {
                // If listening ended without a final result, resolve with empty string
                resolve('');
              }
            );
          } else {
            resolve();
          }
        })
        .catch(reject);
    });
  }

  // Get microphone permission
  async requestMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  // Test speech recognition
  async testSpeechRecognition() {
    return new Promise((resolve) => {
      if (!this.isSupported) {
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => {
        this.stopListening();
        resolve(false);
      }, 5000);

      this.startListening(
        (result) => {
          if (result.isFinal || result.interim) {
            clearTimeout(timeout);
            this.stopListening();
            resolve(true);
          }
        },
        () => {
          clearTimeout(timeout);
          resolve(false);
        },
        () => {
          clearTimeout(timeout);
          resolve(false);
        }
      );
    });
  }

  // Test text-to-speech
  async testTextToSpeech() {
    try {
      await this.speak('Test', { volume: 0.1 });
      return true;
    } catch (error) {
      return false;
    }
  }
}