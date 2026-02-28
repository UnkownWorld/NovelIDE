/**
 * AgentStore - AI 代理状态管理
 */

import { create } from 'zustand';
import { DEFAULT_AI_CONFIG } from '../types';
import { dbAPI } from '../services/persistence';
import { generateId } from '../core/utils/IdGenerator';
import { Debouncer } from '../core/utils/Debouncer';
import { storeLogger } from '../core/utils/Logger';

interface AgentState {
  aiConfig: AIConfig;
  setAiConfig: (config: AIConfig) => void;
  loadAIConfig: () => Promise<void>;
  sessions: ChatSession[];
  currentSessionId: string | null;
  isSessionsLoading: boolean;
  isLoading: boolean;
  pendingChanges: PendingChange[];
  reviewingChangeId: string | null;
  setReviewingChangeId: (id: string | null) => void;
  loadProjectSessions: (projectId: string) => Promise<void>;
  createSession: (projectId: string, initialTitle?: string) => string;
  switchSession: (id: string) => Promise<void>;
  deleteSession: (id: string) => void;
  updateCurrentSession: (updater: (session: ChatSession) => ChatSession) => void;
  addMessage: (message: ChatMessage) => void;
  editMessageContent: (messageId: string, newText: string) => void;
  updateMessageMetadata: (messageId: string, metadata: any) => void;
  deleteMessagesFrom: (startMessageId: string, inclusive: boolean) => void;
  setLoading: (loading: boolean) => void;
  setTodos: (todos: TodoItem[]) => void;
  setPlanModeEnabled: (enabled: boolean) => void;
  addPendingChange: (change: PendingChange) => void;
  updatePendingChange: (id: string, updates: Partial<PendingChange>) => void;
  removePendingChange: (id: string) => void;
  clearPendingChanges: () => void;
}

// Persistence helpers using Debouncer class
class SessionPersistence {
  private debouncer: Debouncer<(projectId: string, sessions: ChatSession[]) => void>;
  constructor() {
    this.debouncer = new Debouncer(async (projectId, sessions) => {
      try {
        await dbAPI.saveSessions(`novel-chat-sessions-${projectId}`, sessions);
        storeLogger.debug('Sessions persisted', { projectId });
      } catch (error) {
        storeLogger.error('Failed to persist sessions', error);
      }
    }, 1000);
  }
  sync(projectId: string, sessions: ChatSession[]): void {
    this.debouncer.call(projectId, sessions);
  }
}

class PendingChangesPersistence {
  private debouncer: Debouncer<(sessionId: string, changes: PendingChange[]) => void>;
  constructor() {
    this.debouncer = new Debouncer(async (sessionId, changes) => {
      try {
        await dbAPI.savePendingChanges(sessionId, changes);
        storeLogger.debug('Pending changes persisted', { sessionId });
      } catch (error) {
        storeLogger.error('Failed to persist pending changes', error);
      }
    }, 500);
  }
  sync(sessionId: string, changes: PendingChange[]): void {
    this.debouncer.call(sessionId, changes);
  }
}

const sessionPersistence = new SessionPersistence();
const pendingChangesPersistence = new PendingChangesPersistence();

// Loading state manager (encapsulated)
class LoadingStateManager {
  private isLoading: boolean = false;
  set(loading: boolean): void { this.isLoading = loading; }
  get(): boolean { return this.isLoading; }
}

const loadingStateManager = new LoadingStateManager();

export const sessionLoadingState = {
  get isLoading() { return loadingStateManager.get(); },
  set isLoading(value) { loadingStateManager.set(value); }
};

export const useAgentStore = create<AgentState>((set, get) => ({
  aiConfig: DEFAULT_AI_CONFIG,
  
  setAiConfig: (config) => {
    set({ aiConfig: config });
    dbAPI.saveAIConfig(config);
    storeLogger.debug('AI config updated');
  },

  loadAIConfig: async () => {
    const config = await dbAPI.getAIConfig();
    if (config) {
      set({ aiConfig: { ...DEFAULT_AI_CONFIG, ...config } });
      storeLogger.debug('AI config loaded');
    }
  },

  sessions: [],
  currentSessionId: null,
  isSessionsLoading: false,
  isLoading: false,
  pendingChanges: [],
  reviewingChangeId: null,

  setReviewingChangeId: (id) => set({ reviewingChangeId: id }),

  loadProjectSessions: async (projectId: string) => {
    loadingStateManager.set(true);
    set({ isSessionsLoading: true });
    try {
      const sessions = await dbAPI.getSessions(`novel-chat-sessions-${projectId}`);
      if (sessions && sessions.length > 0) {
        sessions.sort((a, b) => b.lastModified - a.lastModified);
        const savedSessionId = await dbAPI.getCurrentSessionId(projectId);
        const sessionId = savedSessionId && sessions.find(s => s.id === savedSessionId) ? savedSessionId : sessions[0].id;
        const savedPendingChanges = await dbAPI.getPendingChanges(sessionId);
        set({ sessions, currentSessionId: sessionId, pendingChanges: savedPendingChanges || [] });
        storeLogger.debug('Sessions loaded', { count: sessions.length });
      } else {
        set({ sessions: [], currentSessionId: null });
      }
    } catch (error) {
      storeLogger.error('Failed to load sessions', error);
      set({ sessions: [], currentSessionId: null });
    } finally {
      loadingStateManager.set(false);
      set({ isSessionsLoading: false });
    }
  },

  createSession: (projectId, initialTitle = '新会话') => {
    const newSession: ChatSession = {
      id: generateId(),
      projectId,
      title: initialTitle,
      messages: [],
      todos: [],
      lastModified: Date.now()
    };
    const newSessions = [newSession, ...get().sessions];
    set({ sessions: newSessions, currentSessionId: newSession.id, pendingChanges: [], reviewingChangeId: null });
    sessionPersistence.sync(projectId, newSessions);
    dbAPI.saveCurrentSessionId(projectId, newSession.id);
    storeLogger.debug('Session created', { sessionId: newSession.id });
    return newSession.id;
  },

  switchSession: async (id) => {
    const session = get().sessions.find(s => s.id === id);
    if (session) {
      const savedPendingChanges = await dbAPI.getPendingChanges(id);
      set({ currentSessionId: id, pendingChanges: savedPendingChanges || [], reviewingChangeId: null });
      dbAPI.saveCurrentSessionId(session.projectId, id);
      storeLogger.debug('Session switched', { sessionId: id });
    }
  },

  deleteSession: (id) => {
    const sessionToDelete = get().sessions.find(s => s.id === id);
    if (!sessionToDelete) return;
    const newSessions = get().sessions.filter(s => s.id !== id);
    const newCurrentId = get().currentSessionId === id ? (newSessions.length > 0 ? newSessions[0].id : null) : get().currentSessionId;
    set({ sessions: newSessions, currentSessionId: newCurrentId });
    sessionPersistence.sync(sessionToDelete.projectId, newSessions);
    dbAPI.saveCurrentSessionId(sessionToDelete.projectId, newCurrentId);
    storeLogger.debug('Session deleted', { sessionId: id });
  },

  updateCurrentSession: (updater) => {
    const { currentSessionId, sessions } = get();
    if (!currentSessionId) return;
    const sessionIndex = sessions.findIndex(s => s.id === currentSessionId);
    if (sessionIndex === -1) return;
    const updatedSession = updater(sessions[sessionIndex]);
    const updatedSessions = [...sessions];
    updatedSessions[sessionIndex] = updatedSession;
    updatedSessions.sort((a, b) => b.lastModified - a.lastModified);
    set({ sessions: updatedSessions });
    sessionPersistence.sync(sessions[sessionIndex].projectId, updatedSessions);
  },

  addMessage: (message) => {
    get().updateCurrentSession(session => {
      let title = session.title;
      if (session.messages.length === 0 && message.role === 'user') {
        title = message.text.slice(0, 15) + (message.text.length > 15 ? '...' : '');
      }
      return { ...session, title, messages: [...session.messages, message], lastModified: Date.now() };
    });
  },

  editMessageContent: (messageId, newText) => {
    get().updateCurrentSession(session => ({
      ...session,
      messages: session.messages.map(m => m.id === messageId ? { ...m, text: newText } : m),
      lastModified: Date.now()
    }));
  },

  updateMessageMetadata: (messageId, metadata) => {
    get().updateCurrentSession(session => ({
      ...session,
      messages: session.messages.map(m => m.id === messageId ? { ...m, metadata: { ...m.metadata, ...metadata } } : m),
      lastModified: Date.now()
    }));
  },

  deleteMessagesFrom: (startMessageId, inclusive) => {
    get().updateCurrentSession(session => {
      const index = session.messages.findIndex(m => m.id === startMessageId);
      if (index === -1) return session;
      const cutIndex = inclusive ? index : index + 1;
      return { ...session, messages: session.messages.slice(0, cutIndex), lastModified: Date.now() };
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setTodos: (todos) => {
    get().updateCurrentSession(session => ({ ...session, todos, lastModified: Date.now() }));
  },

  setPlanModeEnabled: (enabled) => {
    get().updateCurrentSession(session => ({ ...session, planModeEnabled: enabled, lastModified: Date.now() }));
  },

  addPendingChange: (change) => {
    const { currentSessionId, pendingChanges } = get();
    const newPendingChanges = [...pendingChanges, change];
    set({ pendingChanges: newPendingChanges });
    if (currentSessionId) pendingChangesPersistence.sync(currentSessionId, newPendingChanges);
  },

  updatePendingChange: (id, updates) => {
    const { currentSessionId, pendingChanges } = get();
    const newPendingChanges = pendingChanges.map(c => c.id === id ? { ...c, ...updates } : c);
    set({ pendingChanges: newPendingChanges });
    if (currentSessionId) pendingChangesPersistence.sync(currentSessionId, newPendingChanges);
  },

  removePendingChange: (id) => {
    const { currentSessionId, pendingChanges, reviewingChangeId } = get();
    const newPendingChanges = pendingChanges.filter(c => c.id !== id);
    set({ pendingChanges: newPendingChanges, reviewingChangeId: reviewingChangeId === id ? null : reviewingChangeId });
    if (currentSessionId) pendingChangesPersistence.sync(currentSessionId, newPendingChanges);
  },

  clearPendingChanges: () => {
    const { currentSessionId } = get();
    set({ pendingChanges: [], reviewingChangeId: null });
    if (currentSessionId) dbAPI.deletePendingChanges(currentSessionId);
  }
}));
