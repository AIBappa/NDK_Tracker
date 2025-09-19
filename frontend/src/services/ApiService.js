export class ApiService {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url) {
    this.baseUrl = url;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, mergedOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // Pairing
  async getPairingInfo() {
    return this.request('/pairing/info');
  }

  // Data input
  async logEntry(message, voiceInput = false, sessionId = null) {
    return this.request('/input/log', {
      method: 'POST',
      body: JSON.stringify({
        message,
        voice_input: voiceInput,
        session_id: sessionId,
      }),
    });
  }

  async clarifyEntry(response, sessionId) {
    return this.request('/input/clarify', {
      method: 'POST',
      body: JSON.stringify({
        response,
        session_id: sessionId,
      }),
    });
  }

  async saveSession(sessionData) {
    return this.request('/input/save_session', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  // Data retrieval
  async getDataSummary(date = null, startDate = null, endDate = null) {
    let endpoint = '/data/summary';
    const params = new URLSearchParams();
    
    if (date) params.append('date', date);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    return this.request(endpoint);
  }

  async getTimelineData(startDate = null, endDate = null) {
    let endpoint = '/timeline/view';
    const params = new URLSearchParams();
    
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    return this.request(endpoint);
  }

  // Settings
  async getSettings() {
    return this.request('/settings');
  }

  async updateSettings(settings) {
    return this.request('/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  // Schedule
  async getSchedule() {
    return this.request('/setup/schedule');
  }

  async updateSchedule(schedule) {
    return this.request('/setup/schedule', {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
  }

  // Test connection to a potential backend URL
  static async testConnection(url) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        const data = await response.json();
        return data.status === 'healthy';
      }
    } catch (error) {
      console.error('Connection test failed:', error);
    }
    return false;
  }

  // Discover backend on local network (basic implementation)
  static async discoverBackend() {
    const commonPorts = [8080, 8000, 3000, 5000];
    const localIpBase = '192.168.1.'; // Simplified - real implementation would scan more ranges
    
    for (let i = 1; i < 255; i++) {
      for (const port of commonPorts) {
        const url = `http://${localIpBase}${i}:${port}`;
        try {
          if (await ApiService.testConnection(url)) {
            return url;
          }
        } catch (error) {
          // Continue scanning
        }
      }
    }
    
    return null;
  }
}