import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ApiService } from '../services/ApiService';

const PairingScreen = ({ onPairingSuccess, speechService }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const qrCodeScannerRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    // Announce pairing screen for accessibility
    if (speechService && speechService.isSupported) {
      speechService.speak('Pairing screen. Scan QR code or enter backend URL manually.');
    }

    return () => {
      // Cleanup QR scanner on unmount
      if (scannerRef.current) {
        scannerRef.current.stop();
      }
    };
  }, [speechService]);

  const startQRScanner = async () => {
    try {
      setError('');
      setIsScanning(true);

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop stream immediately

      const scanner = new Html5Qrcode("qr-code-scanner");
      scannerRef.current = scanner;

      const qrCodeSuccessCallback = async (decodedText) => {
        await stopQRScanner();
        await connectToBackend(decodedText);
      };

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };      await scanner.start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback,
        (errorMessage) => {
          // QR scanning errors are normal, don't show them
        }
      );

      if (speechService && speechService.isSupported) {
        speechService.speak('QR scanner started. Point your camera at the QR code on your laptop screen.');
      }

    } catch (error) {
      setError('Failed to start camera. Please check permissions or enter URL manually.');
      setIsScanning(false);
    }
  };

  const stopQRScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setIsScanning(false);
  };

  const connectToBackend = async (url) => {
    setIsConnecting(true);
    setError('');

    try {
      // Clean URL
      let cleanUrl = url.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `http://${cleanUrl}`;
      }

      // Test connection
      const isConnected = await ApiService.testConnection(cleanUrl);
      if (isConnected) {
        onPairingSuccess(cleanUrl);
        if (speechService && speechService.isSupported) {
          speechService.speak('Successfully connected to backend.');
        }
      } else {
        setError('Failed to connect to backend. Please check the URL and try again.');
        if (speechService && speechService.isSupported) {
          speechService.speak('Failed to connect. Please check the URL and try again.');
        }
      }
    } catch (error) {
      setError('Connection failed. Please check the URL and your network connection.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualConnect = async (e) => {
    e.preventDefault();
    if (manualUrl.trim()) {
      await connectToBackend(manualUrl);
    }
  };

  const discoverBackend = async () => {
    setIsDiscovering(true);
    setError('');

    try {
      if (speechService && speechService.isSupported) {
        speechService.speak('Searching for backend on local network. This may take a moment.');
      }

      const discoveredUrl = await ApiService.discoverBackend();
      if (discoveredUrl) {
        await connectToBackend(discoveredUrl);
      } else {
        setError('No backend found on local network. Please scan QR code or enter URL manually.');
        if (speechService && speechService.isSupported) {
          speechService.speak('No backend found. Please scan QR code or enter URL manually.');
        }
      }
    } catch (error) {
      setError('Network discovery failed. Please try manual connection.');
    } finally {
      setIsDiscovering(false);
    }
  };

  return (
    <div className="pairing-screen">
      <div className="card">
        <h2>Connect to NDK Tracker Backend</h2>
        <p>
          To get started, you need to connect to the NDK Tracker backend 
          running on your laptop. Choose one of the options below:
        </p>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {/* QR Code Scanner */}
        <div className="pairing-option">
          <h3>Option 1: Scan QR Code</h3>
          <p>Scan the QR code displayed on your laptop screen.</p>
          
          {!isScanning ? (
            <button 
              className="btn btn-primary btn-large"
              onClick={startQRScanner}
              disabled={isConnecting || isDiscovering}
              aria-label="Start QR code scanner"
            >
              📱 Scan QR Code
            </button>
          ) : (
            <div>
              <div 
                id="qr-code-scanner" 
                ref={qrCodeScannerRef}
                style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}
              ></div>
              <button 
                className="btn btn-secondary"
                onClick={stopQRScanner}
                aria-label="Stop QR code scanner"
              >
                Stop Scanner
              </button>
            </div>
          )}
        </div>

        <div className="divider">
          <span>OR</span>
        </div>

        {/* Network Discovery */}
        <div className="pairing-option">
          <h3>Option 2: Auto-Discover</h3>
          <p>Automatically search for the backend on your local network.</p>
          
          <button 
            className="btn btn-secondary btn-large"
            onClick={discoverBackend}
            disabled={isScanning || isConnecting || isDiscovering}
            aria-label="Auto-discover backend"
          >
            {isDiscovering ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
                Searching...
              </>
            ) : (
              <>🔍 Auto-Discover</>
            )}
          </button>
        </div>

        <div className="divider">
          <span>OR</span>
        </div>

        {/* Manual Entry */}
        <div className="pairing-option">
          <h3>Option 3: Manual Entry</h3>
          <p>Enter the backend URL manually (e.g., http://192.168.1.100:8080).</p>
          
          {!showManualEntry ? (
            <button 
              className="btn btn-secondary"
              onClick={() => setShowManualEntry(true)}
              disabled={isScanning || isConnecting || isDiscovering}
            >
              Enter URL Manually
            </button>
          ) : (
            <form onSubmit={handleManualConnect} className="manual-entry-form">
              <div className="form-group">
                <label htmlFor="manual-url">Backend URL:</label>
                <input
                  id="manual-url"
                  type="url"
                  className="form-input"
                  placeholder="http://192.168.1.100:8080"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  disabled={isConnecting}
                  aria-describedby="url-help"
                />
                <small id="url-help">
                  Enter the full URL including http:// and port number
                </small>
              </div>
              
              <div className="form-actions">
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={!manualUrl.trim() || isConnecting}
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowManualEntry(false);
                    setManualUrl('');
                  }}
                  disabled={isConnecting}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Connection Status */}
        {isConnecting && (
          <div className="connection-status">
            <div className="spinner"></div>
            <p>Connecting to backend...</p>
          </div>
        )}
      </div>

      {/* Help Information */}
      <div className="card help-card">
        <h3>Need Help?</h3>
        <div className="help-content">
          <p><strong>Make sure your laptop backend is running:</strong></p>
          <ol>
            <li>Start the NDK Tracker backend on your laptop</li>
            <li>Look for the QR code on the laptop screen</li>
            <li>Make sure both devices are on the same WiFi network</li>
          </ol>
          
          <p><strong>Troubleshooting:</strong></p>
          <ul>
            <li>Check that camera permissions are enabled for this app</li>
            <li>Ensure your laptop firewall allows the backend port</li>
            <li>Try the auto-discovery or manual URL entry if QR scanning fails</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PairingScreen;