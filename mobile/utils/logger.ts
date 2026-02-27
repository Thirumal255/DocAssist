/**
 * DocAssist Frontend Logger
 * 
 * Usage:
 *   import { log } from '../utils/logger';
 *   log.info('ModuleName', 'Action description', { optional: 'data' });
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_COLORS = {
  DEBUG: '#6B7280', // gray
  INFO: '#0A7B6E',  // teal
  WARN: '#F59E0B',  // amber
  ERROR: '#EF4444', // red
};

const LOG_ICONS = {
  DEBUG: '🔧',
  INFO: 'ℹ️',
  WARN: '⚠️',
  ERROR: '❌',
};

// Enable/disable logging
const IS_DEV = __DEV__ || process.env.NODE_ENV === 'development';
const LOG_TO_CONSOLE = true;

class Logger {
  private formatTimestamp(): string {
    return new Date().toISOString().substring(11, 19); // HH:MM:SS
  }

  private formatMessage(level: LogLevel, module: string, message: string): string {
    return `${LOG_ICONS[level]} [${this.formatTimestamp()}] [${module}] ${message}`;
  }

  private logToConsole(level: LogLevel, module: string, message: string, data?: any) {
    if (!LOG_TO_CONSOLE) return;

    const formattedMsg = this.formatMessage(level, module, message);
    const color = LOG_COLORS[level];

    switch (level) {
      case 'ERROR':
        console.error(`%c${formattedMsg}`, `color: ${color}; font-weight: bold`);
        break;
      case 'WARN':
        console.warn(`%c${formattedMsg}`, `color: ${color}`);
        break;
      case 'DEBUG':
        if (IS_DEV) {
          console.log(`%c${formattedMsg}`, `color: ${color}`);
        }
        break;
      default:
        console.log(`%c${formattedMsg}`, `color: ${color}`);
    }

    if (data !== undefined) {
      if (data instanceof Error) {
        console.log(`   └─ Error: ${data.message}`);
        if (IS_DEV && data.stack) {
          console.log(`   └─ Stack: ${data.stack.split('\n').slice(0, 3).join('\n')}`);
        }
      } else if (typeof data === 'object') {
        console.log('   └─ Data:', data);
      } else {
        console.log(`   └─ ${data}`);
      }
    }
  }

  debug(module: string, message: string, data?: any) {
    this.logToConsole('DEBUG', module, message, data);
  }

  info(module: string, message: string, data?: any) {
    this.logToConsole('INFO', module, message, data);
  }

  warn(module: string, message: string, data?: any) {
    this.logToConsole('WARN', module, message, data);
  }

  error(module: string, message: string, data?: any) {
    this.logToConsole('ERROR', module, message, data);
  }

  // API call logging helper
  api(method: string, endpoint: string, status?: number, duration?: number) {
    const statusEmoji = status ? (status >= 400 ? '❌' : '✅') : '🔄';
    const statusText = status ? ` → ${status}` : '';
    const durationText = duration ? ` (${duration}ms)` : '';
    
    this.info('API', `${statusEmoji} ${method} ${endpoint}${statusText}${durationText}`);
  }

  // Screen navigation logging
  screen(screenName: string, action: 'mount' | 'unmount' | 'focus' = 'mount') {
    const emoji = action === 'mount' ? '📱' : action === 'unmount' ? '👋' : '👁️';
    this.info('Navigation', `${emoji} ${screenName} ${action}`);
  }

  // User action logging
  action(module: string, action: string, data?: any) {
    this.info(module, `👆 User action: ${action}`, data);
  }

  // Group of logs
  group(title: string) {
    console.group(`📦 ${title}`);
  }

  groupEnd() {
    console.groupEnd();
  }
}

export const log = new Logger();

// Convenience exports
export const logDebug = (module: string, message: string, data?: any) => log.debug(module, message, data);
export const logInfo = (module: string, message: string, data?: any) => log.info(module, message, data);
export const logWarn = (module: string, message: string, data?: any) => log.warn(module, message, data);
export const logError = (module: string, message: string, data?: any) => log.error(module, message, data);
export const logApi = (method: string, endpoint: string, status?: number, duration?: number) => log.api(method, endpoint, status, duration);
