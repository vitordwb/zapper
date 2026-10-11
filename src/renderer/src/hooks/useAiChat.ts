import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  AiChatConversation as AiConversation,
  AiChatMessage as AiMessage,
} from '../../types/electron';

export type { AiConversation, AiMessage };

export interface UseAiChatOptions {
  onExitAiMode?: () => void;
  setAiMode: (value: boolean) => void;
}

export interface UseAiChatReturn {
  messages: AiMessage[];
  aiStreaming: boolean;
  aiAvailable: boolean;
  aiPresentation: 'inline' | 'history';
  aiQuery: string;
  setAiQuery: (value: string) => void;
  aiInputRef: React.RefObject<HTMLInputElement>;
  aiResponseRef: React.RefObject<HTMLDivElement>;
  setAiAvailable: (value: boolean) => void;
  conversations: AiConversation[];
  activeConversationId: string | null;
  startAiChat: (searchQuery: string) => void;
  expandAiChat: () => void;
  sendMessage: (text: string) => void;
  retryLastMessage: () => void;
  stopStreaming: () => void;
  newChat: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  exitAiMode: (options?: { restoreFocus?: boolean }) => void;
}

const MAX_CONVERSATIONS = 50;

function makeTitle(text: string): string {
  const title = text.trim().replace(/\s+/g, ' ');
  if (!title) return 'New Chat';
  return title.length > 48 ? `${title.slice(0, 48)}…` : title;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}


function errorText(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason || 'AI request failed');
}

export function useAiChat({ onExitAiMode, setAiMode }: UseAiChatOptions): UseAiChatReturn {
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiPresentation, setAiPresentation] = useState<'inline' | 'history'>('inline');
  const [aiQuery, setAiQuery] = useState('');
  const [hasBeenActivated, setHasBeenActivated] = useState(false);
  const [startEpoch, setStartEpoch] = useState(0);

  const aiInputRef = useRef<HTMLInputElement>(null);
  const aiResponseRef = useRef<HTMLDivElement>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const messagesRef = useRef<AiMessage[]>([]);
  const conversationsRef = useRef<AiConversation[]>([]);
  const requestRef = useRef<{ id: string; messageId: string } | null>(null);
  const pendingStartRef = useRef<{ epoch: number; query: string } | null>(null);
  const epochRef = useRef(0);
  const mutationRevisionRef = useRef(0);
  const snapshotSequenceRef = useRef(0);
  const mountedRef = useRef(true);
  const pendingTextRef = useRef('');
  const frameRef = useRef<number | null>(null);
  const fallbackRef = useRef<number | null>(null);

  const updateMessages = useCallback((next: AiMessage[]) => {
    messagesRef.current = next;
    mutationRevisionRef.current++;
    if (mountedRef.current) setMessages(next);
  }, []);

  const persistConversation = useCallback(() => {
    const id = activeConversationIdRef.current;
    if (!id || messagesRef.current.length === 0) return;
    const existing = conversationsRef.current.find((entry) => entry.id === id);
    const current = messagesRef.current;
    const conversation: AiConversation = {
      id,
      title: existing?.title && existing.title !== 'New Chat'
        ? existing.title : makeTitle(current.find((message) => message.role === 'user')?.content || ''),
      messages: current,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      source: existing?.source || 'local',
      ...(existing?.sourceConversationId ? { sourceConversationId: existing.sourceConversationId } : {}),
      ...(existing?.metadata ? { metadata: existing.metadata } : {}),
    };
    const next = [conversation, ...conversationsRef.current.filter((entry) => entry.id !== id)]
      .slice(0, MAX_CONVERSATIONS);
    conversationsRef.current = next;
    mutationRevisionRef.current++;
    if (mountedRef.current) setConversations(next);
    void window.electron.upsertAiChatConversation(conversation).catch(() => {});
  }, []);

  const flush = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    clearTimeout(fallbackRef.current ?? undefined);
    frameRef.current = null;
    fallbackRef.current = null;
    const chunk = pendingTextRef.current;
    pendingTextRef.current = '';
    const messageId = requestRef.current?.messageId;
    if (!chunk || !messageId) return;
    updateMessages(messagesRef.current.map((message) => message.id === messageId
      ? { ...message, content: message.content + chunk } : message));
  }, [updateMessages]);

  const finalize = useCallback((requestId: string, terminal?: { error?: string; cancelled?: boolean }) => {
    const request = requestRef.current;
    if (!request || request.id !== requestId) return;
    flush();
    if (terminal?.error || terminal?.cancelled) {
      updateMessages(messagesRef.current.map((message) => message.id === request.messageId
        ? { ...message, ...(terminal.error ? { error: terminal.error } : {}),
            ...(terminal.cancelled ? { cancelled: true } : {}) } : message));
    }
    requestRef.current = null;
    if (mountedRef.current) setAiStreaming(false);
    persistConversation();
  }, [flush, persistConversation, updateMessages]);

  const stopStreaming = useCallback(() => {
    pendingStartRef.current = null;
    epochRef.current++;
    const request = requestRef.current;
    if (!request) return;
    finalize(request.id, { cancelled: true });
    void window.electron.aiCancel(request.id).catch(() => {});
  }, [finalize]);

  const dispatchTurn = useCallback((conversationMessages: AiMessage[], assistantId: string) => {
    const id = uid('ai');
    requestRef.current = { id, messageId: assistantId };
    setAiStreaming(true);
    // Never send terminal empty records or UI status labels to a provider.
    const payload = conversationMessages.filter((message) => message.content.trim())
      .map(({ role, content }) => ({ role, content }));
    try {
      void window.electron.aiChat(id, payload).catch((reason) => finalize(id, { error: errorText(reason) }));
    } catch (reason) {
      finalize(id, { error: errorText(reason) });
    }
  }, [finalize]);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !aiAvailable || requestRef.current) return;
    pendingStartRef.current = null;
    epochRef.current++;
    let id = activeConversationIdRef.current;
    if (!id) {
      id = uid('conv');
      activeConversationIdRef.current = id;
      setActiveConversationId(id);
    }
    const user: AiMessage = { id: uid('msg'), role: 'user', content: trimmed, createdAt: Date.now() };
    const assistant: AiMessage = { id: uid('msg'), role: 'assistant', content: '', createdAt: Date.now() };
    const context = [...messagesRef.current.filter((message) => message.content.trim()), user];
    updateMessages([...messagesRef.current, user, assistant]);
    setAiQuery('');
    dispatchTurn(context, assistant.id);
  }, [aiAvailable, dispatchTurn, updateMessages]);

  const retryLastMessage = useCallback(() => {
    if (!aiAvailable || requestRef.current || pendingStartRef.current) return;
    const previous = messagesRef.current;
    const failed = previous[previous.length - 1];
    const user = previous[previous.length - 2];
    if (!failed?.error || failed.role !== 'assistant' || user?.role !== 'user') return;
    const replacement: AiMessage = { id: uid('msg'), role: 'assistant', content: '', createdAt: Date.now() };
    const context = previous.slice(0, -1).filter((message) => message.content.trim());
    updateMessages([...previous.slice(0, -1), replacement]);
    dispatchTurn(context, replacement.id);
  }, [aiAvailable, dispatchTurn, updateMessages]);

  const startAiChat = useCallback((searchQuery: string) => {
    if (!aiAvailable) return;
    stopStreaming();
    activeConversationIdRef.current = null;
    setActiveConversationId(null);
    updateMessages([]);
    setAiQuery('');
    setAiPresentation('inline');
    setAiMode(true);
    const query = searchQuery.trim();
    const epoch = ++epochRef.current;
    pendingStartRef.current = query ? { epoch, query } : null;
    setHasBeenActivated(true);
    setStartEpoch(epoch);
  }, [aiAvailable, setAiMode, stopStreaming, updateMessages]);

  const expandAiChat = useCallback(() => setAiPresentation('history'), []);

  const newChat = useCallback(() => {
    stopStreaming();
    activeConversationIdRef.current = null;
    setActiveConversationId(null);
    updateMessages([]);
    setAiQuery('');
    setAiPresentation('history');
    aiInputRef.current?.focus();
  }, [stopStreaming, updateMessages]);

  const selectConversation = useCallback((id: string) => {
    const conversation = conversationsRef.current.find((entry) => entry.id === id);
    if (!conversation) return;
    stopStreaming();
    activeConversationIdRef.current = id;
    setActiveConversationId(id);
    updateMessages(conversation.messages);
    setAiQuery('');
    setAiPresentation('history');
    aiInputRef.current?.focus();
  }, [stopStreaming, updateMessages]);

  const deleteConversation = useCallback((id: string) => {
    if (activeConversationIdRef.current === id) {
      stopStreaming();
      activeConversationIdRef.current = null;
      setActiveConversationId(null);
      updateMessages([]);
    }
    const next = conversationsRef.current.filter((entry) => entry.id !== id);
    conversationsRef.current = next;
    mutationRevisionRef.current++;
    setConversations(next);
    void window.electron.deleteAiChatConversation(id).catch(() => {});
  }, [stopStreaming, updateMessages]);

  const exitAiMode = useCallback((options?: { restoreFocus?: boolean }) => {
    stopStreaming();
    setAiMode(false);
    setAiQuery('');
    if (options?.restoreFocus !== false) onExitAiMode?.();
  }, [onExitAiMode, setAiMode, stopStreaming]);

  const refreshSnapshot = useCallback(() => {
    const revision = mutationRevisionRef.current;
    const sequence = ++snapshotSequenceRef.current;
    void window.electron.getAiChatSnapshot().then((snapshot) => {
      if (!mountedRef.current || sequence !== snapshotSequenceRef.current ||
          revision !== mutationRevisionRef.current || requestRef.current || pendingStartRef.current) return;
      const next = Array.isArray(snapshot?.conversations)
        ? snapshot.conversations.slice(0, MAX_CONVERSATIONS) : [];
      conversationsRef.current = next;
      setConversations(next);
      const activeId = activeConversationIdRef.current;
      if (!activeId) return;
      const active = next.find((entry) => entry.id === activeId);
      if (active) {
        messagesRef.current = active.messages;
        setMessages(active.messages);
      } else if (messagesRef.current.length === 0) {
        activeConversationIdRef.current = null;
        setActiveConversationId(null);
      }
    }).catch(() => {});
  }, []);

  // Effects install all listeners before consuming a pending first turn.
  useEffect(() => {
    if (!hasBeenActivated) return;
    refreshSnapshot();
    return window.electron.onAiChatsUpdated(refreshSnapshot);
  }, [hasBeenActivated, refreshSnapshot]);

  useEffect(() => {
    if (!hasBeenActivated) return;
    const removeChunk = window.electron.onAIStreamChunk(({ requestId, chunk }) => {
      if (requestRef.current?.id !== requestId) return;
      pendingTextRef.current += chunk;
      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(flush);
        fallbackRef.current = window.setTimeout(flush, 100);
      }
    });
    const removeDone = window.electron.onAIStreamDone(({ requestId }) => finalize(requestId));
    const removeError = window.electron.onAIStreamError(({ requestId, error }) =>
      finalize(requestId, { error }));
    return () => { removeChunk?.(); removeDone?.(); removeError?.(); };
  }, [hasBeenActivated, finalize, flush]);

  useEffect(() => {
    const pending = pendingStartRef.current;
    if (!hasBeenActivated || !pending || pending.epoch !== startEpoch) return;
    pendingStartRef.current = null;
    sendMessage(pending.query);
  }, [hasBeenActivated, sendMessage, startEpoch]);

  useEffect(() => {
    let active = true;
    void window.electron.aiIsAvailable().then((available) => {
      if (active) setAiAvailable(available);
    }).catch(() => {
      if (active) setAiAvailable(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pendingStartRef.current = null;
      const request = requestRef.current;
      if (request) {
        finalize(request.id, { cancelled: true });
        void window.electron.aiCancel(request.id).catch(() => {});
      }
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      clearTimeout(fallbackRef.current ?? undefined);
    };
  }, [finalize]);

  return {
    messages, aiStreaming, aiAvailable, aiPresentation, aiQuery, setAiQuery,
    aiInputRef, aiResponseRef, setAiAvailable, conversations, activeConversationId,
    startAiChat, expandAiChat, sendMessage, retryLastMessage, stopStreaming,
    newChat, selectConversation, deleteConversation, exitAiMode,
  };
}
