/**
 * createPersistingStore - 统一持久化策略工具
 */

import { create, StateCreator } from 'zustand';
import { Debouncer } from '../core/utils/Debouncer';
import { Logger } from '../core/utils/Logger';

export interface PersistingStoreConfig<T> {
  name: string;
  initialState: T;
  saver: (state: T) => Promise<any>;
  debounceMs?: number;
}

type WithSetState<T> = T & {
  setState: (update: Partial<T> | ((prev: T) => Partial<T>)) => void;
};

export function createPersistingStore<T extends object>(
  config: PersistingStoreConfig<T>
) {
  const { name, initialState, saver, debounceMs = 1000 } = config;
  const logger = Logger.create(`Store:${name}`);

  const debouncer = new Debouncer(async (state: T) => {
    try {
      await saver(state);
      logger.debug('State persisted');
    } catch (error) {
      logger.error('Failed to persist state', error);
    }
  }, debounceMs);

  const store = create<WithSetState<T>>((set, get) => ({
    ...initialState,
    setState: (update) => {
      set(update);
      debouncer.call(get());
    },
  }));

  // 修复: 返回正确的变量名 (store 而不是 Store)
  return store;
}

export function flushPersistingStore<T = any>(
  store: ReturnType<ReturnType<typeof create<T>>>
): void {
  console.warn('[flushPersistingStore] Manual flush not implemented.');
}
