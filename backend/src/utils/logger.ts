import { Request, Response, NextFunction } from 'express';

// ANSI color codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Log levels
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'API';

const levelColors: Record<LogLevel, string> = {
  INFO: colors.green,
  WARN: colors.yellow,
  ERROR: colors.red,
  DEBUG: colors.cyan,
  API: colors.magenta,
};

const levelIcons: Record<LogLevel, string> = {
  INFO: 'ℹ️ ',
  WARN: '⚠️ ',
  ERROR: '❌',
  DEBUG: '🔧',
  API: '🌐',
};

class Logger {
  private formatTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  private log(level: LogLevel, module: string, message: string, data?: any) {
    const timestamp = this.formatTimestamp();
    const color = levelColors[level];
    const icon = levelIcons[level];
    
    console.log(
      `${colors.dim}[${timestamp}]${colors.reset} ${color}${icon} ${level}${colors.reset} ${colors.bright}[${module}]${colors.reset} ${message}`
    );
    
    if (data) {
      if (data instanceof Error) {
        console.log(`${colors.red}   └─ Error: ${data.message}${colors.reset}`);
        if (data.stack) {
          console.log(`${colors.dim}   └─ Stack: ${data.stack.split('\n')[1]?.trim()}${colors.reset}`);
        }
      } else if (typeof data === 'object') {
        console.log(`${colors.dim}   └─ Data: ${JSON.stringify(data, null, 2).substring(0, 500)}${colors.reset}`);
      } else {
        console.log(`${colors.dim}   └─ ${data}${colors.reset}`);
      }
    }
  }

  info(module: string, message: string, data?: any) {
    this.log('INFO', module, message, data);
  }

  warn(module: string, message: string, data?: any) {
    this.log('WARN', module, message, data);
  }

  error(module: string, message: string, data?: any) {
    this.log('ERROR', module, message, data);
  }

  debug(module: string, message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      this.log('DEBUG', module, message, data);
    }
  }

  api(method: string, path: string, status: number, duration: number) {
    const statusColor = status >= 500 ? colors.red : status >= 400 ? colors.yellow : colors.green;
    const timestamp = this.formatTimestamp();
    
    console.log(
      `${colors.dim}[${timestamp}]${colors.reset} ${colors.magenta}🌐 API${colors.reset} ` +
      `${colors.bright}${method.padEnd(7)}${colors.reset} ${path} ` +
      `${statusColor}${status}${colors.reset} ${colors.dim}${duration}ms${colors.reset}`
    );
  }
}

export const logger = new Logger();

// Express middleware for API logging
export function apiLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Log request
  logger.debug('Request', `${req.method} ${req.path}`, {
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - startTime;
    logger.api(req.method, req.path, res.statusCode, duration);
    return originalSend.call(this, body);
  };

  next();
}

// Print all available routes
export function printRoutes(app: any) {
  console.log('\n' + colors.bright + colors.cyan + '═══════════════════════════════════════════════════════' + colors.reset);
  console.log(colors.bright + '  📋 Available API Endpoints' + colors.reset);
  console.log(colors.cyan + '═══════════════════════════════════════════════════════' + colors.reset + '\n');

  const routes: { method: string; path: string }[] = [];

  function extractRoutes(stack: any[], basePath: string = '') {
    stack.forEach((layer: any) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
        methods.forEach(method => {
          routes.push({ method, path: basePath + layer.route.path });
        });
      } else if (layer.name === 'router' && layer.handle.stack) {
        const routerPath = layer.regexp.source
          .replace('\\/?', '')
          .replace('(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace(/\^/g, '');
        extractRoutes(layer.handle.stack, basePath + routerPath);
      }
    });
  }

  extractRoutes(app._router.stack);

  // Group routes by base path
  const grouped: Record<string, { method: string; path: string }[]> = {};
  routes.forEach(route => {
    const base = '/' + (route.path.split('/')[1] || '');
    if (!grouped[base]) grouped[base] = [];
    grouped[base].push(route);
  });

  Object.keys(grouped).sort().forEach(base => {
    console.log(colors.yellow + `  ${base}` + colors.reset);
    grouped[base].forEach(route => {
      const methodColor = 
        route.method === 'GET' ? colors.green :
        route.method === 'POST' ? colors.blue :
        route.method === 'PUT' ? colors.yellow :
        route.method === 'DELETE' ? colors.red : colors.white;
      console.log(`    ${methodColor}${route.method.padEnd(7)}${colors.reset} ${route.path}`);
    });
  });

  console.log('\n' + colors.cyan + '═══════════════════════════════════════════════════════' + colors.reset + '\n');
}
