/**
 * Logger - 统一日志管理类
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LogContext {
  [key: string]: any;
}

export class Logger {
  private static instances: Map<string, Logger> = new Map();
  private level: LogLevel;
  private prefix: string;

  private constructor(prefix: string = 'App') {
    const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
    this.level = isProduction ? LogLevel.WARN : LogLevel.DEBUG;
    this.prefix = prefix;
  }

  static getInstance(prefix: string = 'App'): Logger {
    if (!Logger.instances.has(prefix)) {
      Logger.instances.set(prefix, new Logger(prefix));
    }
    return Logger.instances.get(prefix)!;
  }

  static create(prefix: string): Logger {
    return new Logger(prefix);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private format(level: string, message: string, context?: LogContext): string {
    const parts = [`[${new Date().toISOString()}]`, `[${this.prefix}]`, `[${level}]`, message];
    if (context && Object.keys(context).length > 0) {
      parts.push(JSON.stringify(context));
    }
    return parts.join(' ');
  }

  debug(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.DEBUG) console.debug(this.format('DEBUG', message, context));
  }

  info(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.INFO) console.info(this.format('INFO', message, context));
  }

  warn(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.WARN) console.warn(this.format('WARN', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.level <= LogLevel.ERROR) {
      const errorContext = error instanceof Error 
        ? { ...context, error: error.message, stack: error.stack }
        : { ...context, error };
      console.error(this.format('ERROR', message, errorContext));
    }
  }
}

export const logger = Logger.getInstance('NovelIDE');
export const agentLogger = Logger.create('Agent');
export const storeLogger = Logger.create('Store');
export const editorLogger = Logger.create('Editor');
