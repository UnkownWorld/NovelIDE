/**
 * BaseService - 服务基类
 */

import { EventEmitter } from '../utils/EventEmitter';
import { Logger } from '../utils/Logger';

export interface ServiceEvents {
  'service:init': void;
  'service:destroy': void;
  'service:error': Error;
}

export abstract class BaseService<Events extends Record<string, any> = ServiceEvents> {
  protected logger: Logger;
  protected events: EventEmitter<Events>;
  private initialized: boolean = false;
  private destroyed: boolean = false;

  constructor(name: string) {
    this.logger = Logger.create(name);
    this.events = new EventEmitter<Events>();
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await this.onInit();
      this.initialized = true;
      this.logger.info('Service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize service', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    try {
      await this.onDestroy();
      this.destroyed = true;
      this.events.clear();
      this.logger.info('Service destroyed');
    } catch (error) {
      this.logger.error('Failed to destroy service', error);
      throw error;
    }
  }

  isInitialized(): boolean { return this.initialized; }
  isDestroyed(): boolean { return this.destroyed; }

  on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): () => void {
    return this.events.on(event, handler);
  }

  protected async onInit(): Promise<void> {}
  protected async onDestroy(): Promise<void> {}

  protected ensureInitialized(): void {
    if (!this.initialized) throw new Error(`Service ${this.constructor.name} is not initialized`);
    if (this.destroyed) throw new Error(`Service ${this.constructor.name} has been destroyed`);
  }
}
