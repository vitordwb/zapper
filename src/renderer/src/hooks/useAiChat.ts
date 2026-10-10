/**
 * useAiChat.ts
 *
 * Multi-turn AI chat state with conversation history.
 * - Owns `messages` array for the active conversation
 * - Persists conversation list + bodies in the Electron main process
 * - Streams assistant responses into the last message
 * - startAiChat(query): enter AI mode; if query present, auto-send
 * - sendMessage(text): append user msg, stream assistant reply
 * - stopStreaming(): cancel in-flight
 * - newChat(): start a fresh conversation
 * - selectConversation(id): load an existing conversation
 * - deleteConversation(id): remove from history
 * - exitAiMode(): leave AI mode (conversation is kept in history)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  AiChatConversation as AiConversation,
  AiChatMessage as AiMessage,
  AiChatSnapshot,
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
  aiQuery: string;
  setAiQuery: (value: string) => void;
  aiInputRef: React.RefObject<HTMLInputElement>;
  aiResponseRef: React.RefObject<HTMLDivElement>;
  setAiAvailable: (value: boolean) => void;
  conversations: AiConversation[];
  activeConversationId: string | null;
  startAiChat: (searchQuery: string) => void;
  sendMessage: (text: string) => void;
  stopStreaming: () => void;
  newChat: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  exitAiMode: () => void;
}

const MAX_CONVERSATIONS = 50;

function makeTitle(text: string): string {
  const t = (text || '').trim().replace(/\s+/g, ' ');
  if (!t) return 'New Chat';
  return t.length > 48 ? `${t.slice(0, 48)}…` : t;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSnapshot(snapshot: AiChatSnapshot | null | undefined): AiConversation[] {
  if (!snapshot || !Array.isArray(snapshot.conversations)) return [];
  return snapshot.conversations.slice(0, MAX_CONVERSATIONS);
}

export function useAiChat({ onExitAiMode, setAiMode }: UseAiChatOptions): UseAiChatReturn {
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  // Defers snapshot loading and IPC listeners until AI mode is first entered.
  const [hasBeenActivated, setHasBeenActivated] = useState(false);

  const aiRequestIdRef = useRef<string | null>(null);
  const aiStreamingRef = useRef(false);
  const streamingMessageIdRef = useRef<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const messagesRef = useRef<AiMessage[]>([]);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const aiResponseRef = useRef<HTMLDivElement>(null);
  const conversationsRef = useRef<AiConversation[]>([]);
  const pendingTextRef = useRef('');
  const flushStreamingRef = useRef<() => void>(() => {});
  const finalizeStreamingRef = useRef<() => void>(() => {});

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const applySnapshot = useCallback((snapshot: AiChatSnapshot | null | undefined) => {
    if (aiStreamingRef.current) return;
    const nextConversations = normalizeSnapshot(snapshot);
    conversationsRef.current = nextConversations;
    setConversations(nextConversations);

    const activeId = activeConversationIdRef.current;
    if (!activeId) return;

    const nextActive = nextConversations.find((conversation) => conversation.id === activeId);
    if (nextActive) {
      messagesRef.current = nextActive.messages;
      setMessages(nextActive.messages);
      return;
    }

    if (messagesRef.current.length === 0) {
      activeConversationIdRef.current = null;
      setActiveConversationId(null);
    }
  }, []);

  const refreshSnapshot = useCallback(() => {
    void window.electron.getAiChatSnapshot()
      .then((snapshot) => {
        applySnapshot(snapshot);
      })
      .catch(() => {});
  }, [applySnapshot]);

  useEffect(() => {
    if (!hasBeenActivated) return;
    refreshSnapshot();
  }, [hasBeenActivated, refreshSnapshot]);

  useEffect(() => {
    if (!hasBeenActivated) return;
    return window.electron.onAiChatsUpdated(() => {
      refreshSnapshot();
    });
  }, [hasBeenActivated, refreshSnapshot]);

  const persistConversation = useCallback((conversation: AiConversation) => {
    const next = [conversation, ...conversationsRef.current.filter((entry) => entry.id !== conversation.id)]
      .slice(0, MAX_CONVERSATIONS);
    conversationsRef.current = next;
    setConversations(next);
    void window.electron.upsertAiChatConversation(conversation);
  }, []);

  useEffect(() => {
    if (!hasBeenActivated) return;
    let frame: number | null = null;
    let fallback: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      if (fallback !== null) clearTimeout(fallback);
      frame = null;
      fallback = null;
      const chunk = pendingTextRef.current;
      pendingTextRef.current = '';
      const msgId = streamingMessageIdRef.current;
      if (!chunk || !msgId) return;
      const next = messagesRef.current.map((message) =>
        message.id === msgId ? { ...message, content: message.content + chunk } : message
      );
      messagesRef.current = next;
      setMessages(next);
    };
    flushStreamingRef.current = flush;

    const finalizeConversation = () => {
      const conversationId = activeConversationIdRef.current;
      if (!conversationId) return;
      const current = messagesRef.current;
      const existing = conversationsRef.current.find((entry) => entry.id === conversationId);
      persistConversation({
        id: conversationId,
        title: existing?.title && existing.title !== 'New Chat'
          ? existing.title
          : makeTitle(current.find((message) => message.role === 'user')?.content || 'New Chat'),
        messages: current,
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        source: existing?.source || 'local',
        ...(existing?.sourceConversationId ? { sourceConversationId: existing.sourceConversationId } : {}),
        ...(existing?.metadata ? { metadata: existing.metadata } : {}),
      });
    };
    finalizeStreamingRef.current = finalizeConversation;

    const removeChunk = window.electron.onAIStreamChunk(({ requestId, chunk }) => {
      if (requestId !== aiRequestIdRef.current || !aiStreamingRef.current) return;
      pendingTextRef.current += chunk;
      if (frame === null) {
        frame = requestAnimationFrame(flush);
        fallback = setTimeout(flush, 100);
      }
    });
    const removeDone = window.electron.onAIStreamDone(({ requestId }) => {
      if (requestId !== aiRequestIdRef.current) return;
      flush();
      aiRequestIdRef.current = null;
      aiStreamingRef.current = false;
      setAiStreaming(false);
      streamingMessageIdRef.current = null;
      finalizeConversation();
    });
    const removeError = window.electron.onAIStreamError(({ requestId, error }) => {
      if (requestId !== aiRequestIdRef.current) return;
      flush();
      const msgId = streamingMessageIdRef.current;
      if (msgId) {
        const next = messagesRef.current.map((message) => message.id === msgId
          ? { ...message, content: message.content + (message.content ? '\n\n' : '') + `Error: ${error}` }
          : message);
        messagesRef.current = next;
        setMessages(next);
      }
      aiRequestIdRef.current = null;
      aiStreamingRef.current = false;
      setAiStreaming(false);
      streamingMessageIdRef.current = null;
      finalizeConversation();
    });

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      if (fallback !== null) clearTimeout(fallback);
      pendingTextRef.current = '';
      removeChunk?.();
      removeDone?.();
      removeError?.();
    };
  }, [hasBeenActivated, persistConversation]);

  useEffect(() => {
    if (aiResponseRef.current) {
      aiResponseRef.current.scrollTop = aiResponseRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    window.electron.aiIsAvailable().then(setAiAvailable);
  }, []);

  const stopStreaming = useCallback(() => {
    if (!aiRequestIdRef.current || !aiStreamingRef.current) return;
    flushStreamingRef.current();
    void window.electron.aiCancel(aiRequestIdRef.current);
    const messageId = streamingMessageIdRef.current;
    if (messageId) {
      const next = messagesRef.current.map((message) =>
        message.id === messageId ? { ...message, cancelled: true } : message
      );
      messagesRef.current = next;
      setMessages(next);
    }
    aiRequestIdRef.current = null;
    aiStreamingRef.current = false;
    streamingMessageIdRef.current = null;
    setAiStreaming(false);
    finalizeStreamingRef.current();
  }, []);

  const sendChatTurn = useCallback((allMessages: AiMessage[]) => {
    if (aiStreamingRef.current) stopStreaming();
    const requestId = uid('ai');
    aiRequestIdRef.current = requestId;
    aiStreamingRef.current = true;
    setAiStreaming(true);
    const payload = allMessages.map((message) => ({ role: message.role, content: message.content }));
    void window.electron.aiChat(requestId, payload);
  }, [stopStreaming]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !aiAvailable) return;
      if (aiStreamingRef.current) stopStreaming();

      let conversationId = activeConversationIdRef.current;
      if (!conversationId) {
        conversationId = uid('conv');
        activeConversationIdRef.current = conversationId;
        setActiveConversationId(conversationId);
        persistConversation({
          id: conversationId,
          title: makeTitle(trimmed),
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          source: 'local',
        });
      }

      const userMessage: AiMessage = {
        id: uid('msg'),
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
      };
      const assistantMessage: AiMessage = {
        id: uid('msg'),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      };
      streamingMessageIdRef.current = assistantMessage.id;
      const previous = messagesRef.current;
      const next = [...previous, userMessage, assistantMessage];
      messagesRef.current = next;
      setMessages(next);
      sendChatTurn([...previous, userMessage]);
      setAiQuery('');
    },
    [aiAvailable, persistConversation, sendChatTurn, stopStreaming]
  );

  const startAiChat = useCallback(
    (searchQuery: string) => {
      if (!aiAvailable) return;
      stopStreaming();
      setHasBeenActivated(true);
      activeConversationIdRef.current = null;
      setActiveConversationId(null);
      messagesRef.current = [];
      setMessages([]);
      setAiMode(true);
      const trimmed = searchQuery.trim();
      if (trimmed) setTimeout(() => sendMessage(trimmed), 0);
      else setAiQuery('');
    },
    [aiAvailable, setAiMode, sendMessage, stopStreaming]
  );

  const newChat = useCallback(() => {
    stopStreaming();
    activeConversationIdRef.current = null;
    setActiveConversationId(null);
    messagesRef.current = [];
    setMessages([]);
    setAiQuery('');
    setTimeout(() => aiInputRef.current?.focus(), 0);
  }, [stopStreaming]);

  const selectConversation = useCallback((id: string) => {
    const conversation = conversationsRef.current.find((entry) => entry.id === id);
    if (!conversation) return;
    stopStreaming();
    activeConversationIdRef.current = id;
    setActiveConversationId(id);
    messagesRef.current = conversation.messages;
    setMessages(conversation.messages);
    setAiQuery('');
    setTimeout(() => aiInputRef.current?.focus(), 0);
  }, [stopStreaming]);

  const deleteConversation = useCallback((id: string) => {
    conversationsRef.current = conversationsRef.current.filter((entry) => entry.id !== id);
    setConversations(conversationsRef.current);
    void window.electron.deleteAiChatConversation(id);
    if (activeConversationIdRef.current === id) {
      if (aiRequestIdRef.current && aiStreamingRef.current) {
        void window.electron.aiCancel(aiRequestIdRef.current);
      }
      pendingTextRef.current = '';
      aiRequestIdRef.current = null;
      aiStreamingRef.current = false;
      streamingMessageIdRef.current = null;
      activeConversationIdRef.current = null;
      setActiveConversationId(null);
      messagesRef.current = [];
      setMessages([]);
      setAiStreaming(false);
    }
  }, []);

  const exitAiMode = useCallback(() => {
    stopStreaming();
    setAiMode(false);
    setAiQuery('');
    onExitAiMode?.();
  }, [setAiMode, onExitAiMode, stopStreaming]);

  useEffect(() => {
    if (messages.length === 0 && !aiQuery && !aiStreaming) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        exitAiMode();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [messages.length, aiQuery, aiStreaming, exitAiMode]);

  return {
    messages,
    aiStreaming,
    aiAvailable,
    aiQuery,
    setAiQuery,
    aiInputRef,
    aiResponseRef,
    setAiAvailable,
    conversations,
    activeConversationId,
    startAiChat,
    sendMessage,
    stopStreaming,
    newChat,
    selectConversation,
    deleteConversation,
    exitAiMode,
  };
}
