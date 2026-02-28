/**
 * EventEmitter - 事件发射器类
 */

type EventHandler<T = any> = (data: T) => void;

interface EventSubscription {
  id: string;
  handler: EventHandler;
  once: boolean;
}

export class EventEmitter<EventMap extends Record<string, any> = Record<string, any>> {
  private subscriptions: Map<keyof EventMap, EventSubscription[]> = new Map();
  private maxListeners: number = 100;

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    const subscriptionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const subscription: EventSubscription = {
      id: subscriptionId,
      handler: handler as EventHandler,
      once: false
    };

    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, []);
    }

    const handlers = this.subscriptions.get(event)!;
    if (handlers.length >= this.maxListeners) {
      console.warn(`[EventEmitter] Max listeners reached for event: ${String(event)}`);
    }
    
    handlers.push(subscription);
    return () => this.off(event, subscriptionId);
  }

  once<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    const subscriptionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const subscription: EventSubscription = {
      id: subscriptionId,
      handler: handler as EventHandler,
      once: true
    };

    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, []);
    }

    this.subscriptions.get(event)!.push(subscription);
    return () => this.off(event, subscriptionId);
  }

  off<K extends keyof EventMap>(event: K, subscriptionId?: string): void {
    if (!this.subscriptions.has(event)) return;

    if (subscriptionId) {
      const handlers = this.subscriptions.get(event)!;
      const index = handlers.findIndex(s => s.id === subscriptionId);
      if (index !== -1) handlers.splice(index, 1);
    } else {
      this.subscriptions.delete(event);
    }
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    if (!this.subscriptions.has(event)) return;

    const handlers = this.subscriptions.get(event)!;
    const toRemove: string[] = [];

    for (const subscription of handlers) {
      try {
        subscription.handler(data);
        if (subscription.once) toRemove.push(subscription.id);
      } catch (error) {
        console.error(`[EventEmitter] Error in handler for event "${String(event)}":`, error);
      }
    }

    if (toRemove.length > 0) {
      this.subscriptions.set(event, handlers.filter(s => !toRemove.includes(s.id)));
    }
  }

  clear(): void {
    this.subscriptions.clear();
  }

  listenerCount<K extends keyof EventMap>(event: K): number {
    return this.subscriptions.get(event)?.length || 0;
  }
}
