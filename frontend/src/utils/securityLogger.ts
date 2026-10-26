export interface SecurityLog {
  id: string;
  timestamp: string;
  event: 'LOGIN_ATTEMPT' | 'LOGIN_FAILURE' | 'MFA_VERIFICATION' | 'MFA_FAILURE' | 'SESSION_TIMEOUT' | 'THEME_CHANGE' | 'DEVICE_TRUSTED' | 'RATE_LIMIT_LOCK';
  details: string;
  ipAddress: string;
}

const LOGS_KEY = 'finsight_security_logs';

export const securityLogger = {
  log: (event: SecurityLog['event'], details: string) => {
    const newLog: SecurityLog = {
      id: `log_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      event,
      details,
      ipAddress: '192.168.1.104' // Simulated local secure IP
    };

    // Store in LocalStorage
    try {
      const existingLogs = localStorage.getItem(LOGS_KEY);
      const logsList: SecurityLog[] = existingLogs ? JSON.parse(existingLogs) : [];
      // Keep only last 100 logs for demo
      logsList.unshift(newLog);
      localStorage.setItem(LOGS_KEY, JSON.stringify(logsList.slice(0, 100)));
    } catch (e) {
      console.error('Failed to save security log:', e);
    }

    // Beautiful console logging for demo purposes
    const colors = {
      LOGIN_ATTEMPT: 'color: #00D4FF; font-weight: bold;',
      LOGIN_FAILURE: 'color: #EF4444; font-weight: bold;',
      MFA_VERIFICATION: 'color: #10B981; font-weight: bold;',
      MFA_FAILURE: 'color: #EF4444; font-weight: bold;',
      SESSION_TIMEOUT: 'color: #F59E0B; font-weight: bold;',
      THEME_CHANGE: 'color: #8B5CF6; font-weight: bold;',
      DEVICE_TRUSTED: 'color: #10B981; font-weight: bold;',
      RATE_LIMIT_LOCK: 'color: #EF4444; font-weight: bold; background: rgba(239, 68, 68, 0.1);'
    };

    console.log(
      `%c[🔒 FinSightAI Audit] %c${event} %c- ${details}`,
      'color: #94A3B8; font-family: monospace;',
      colors[event] || 'color: white;',
      'color: #E2E8F0; font-family: sans-serif;'
    );
  },

  getLogs: (): SecurityLog[] => {
    try {
      const logs = localStorage.getItem(LOGS_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  },

  clearLogs: () => {
    localStorage.removeItem(LOGS_KEY);
  }
};
