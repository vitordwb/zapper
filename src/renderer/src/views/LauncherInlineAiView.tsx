import React, { useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowsOut, Copy, PaperPlaneRight, Stop, X } from '@phosphor-icons/react';
import type { LauncherSurfaceSnapshot } from '../../../shared/launcher-surface';
import { LAUNCHER_LAYOUT } from '../../../shared/launcher-surface';
import LauncherSurface from '../components/LauncherSurface';
import type { AiMessage } from '../hooks/useAiChat';
import { useI18n } from '../i18n';
import ChatMarkdown from './ChatMarkdown';

export interface LauncherInlineAiViewProps {
  surface: LauncherSurfaceSnapshot;
  answerSurfaceRef: React.RefObject<HTMLElement>;
  aiResponseRef: React.RefObject<HTMLDivElement>;
  aiInputRef: React.RefObject<HTMLInputElement>;
  messages: AiMessage[];
  aiStreaming: boolean;
  aiAvailable: boolean;
  aiQuery: string;
  setAiQuery: (query: string) => void;
  sendMessage: (text: string) => void;
  stopStreaming: () => void;
  retryLastMessage: () => void;
  onCopy: (content: string) => void;
  onBack: () => void;
  onClose: () => void;
  onExpand: () => void;
  onOpenSettings: () => void;
}

/** Presentation and local interaction only; the chat hook owns requests and persistence. */
export default function LauncherInlineAiView({
  surface, answerSurfaceRef, aiResponseRef, aiInputRef, messages, aiStreaming,
  aiAvailable, aiQuery, setAiQuery, sendMessage, stopStreaming, retryLastMessage,
  onCopy, onBack, onClose, onExpand, onOpenSettings,
}: LauncherInlineAiViewProps) {
  const { t } = useI18n();
  const [announcement, setAnnouncement] = useState('');
  const lastAnnouncement = useRef('');
  const followBottom = useRef(true);
  const lastMessage = messages[messages.length - 1];
  let lastAssistant: AiMessage | undefined;
  let lastUserMessage: AiMessage | undefined;
  for (let index = messages.length - 1; index >= 0 && (!lastAssistant || !lastUserMessage); index--) {
    if (messages[index].role === 'assistant' && !lastAssistant) lastAssistant = messages[index];
    if (messages[index].role === 'user' && !lastUserMessage) lastUserMessage = messages[index];
  }
  const lastUserId = useRef<string | undefined>(lastUserMessage?.id);
  const failedLatest = !aiStreaming && lastMessage?.role === 'assistant' && Boolean(lastMessage.error);
  const status = aiStreaming ? (lastAssistant?.content ? 'streaming' : 'thinking')
    : failedLatest ? 'failed'
      : lastMessage?.role === 'assistant' && lastMessage.cancelled ? 'cancelled'
        : lastMessage?.role === 'assistant' ? 'completed' : 'idle';
  const eventKey = status === 'streaming' || status === 'thinking'
    ? `${lastUserMessage?.id ?? ''}:started`
    : `${lastMessage?.id ?? ''}:${status}`;

  useLayoutEffect(() => {
    const viewport = aiResponseRef.current;
    if (!viewport) return;
    const newTurn = lastUserMessage?.id !== lastUserId.current;
    lastUserId.current = lastUserMessage?.id;
    if (newTurn || followBottom.current) {
      viewport.scrollTop = viewport.scrollHeight;
      followBottom.current = true;
    }
  }, [messages, aiResponseRef, lastUserMessage?.id]);

  // The live region receives only terminal state changes, never streamed prose.
  useLayoutEffect(() => {
    if (eventKey === lastAnnouncement.current) return;
    lastAnnouncement.current = eventKey;
    if (aiStreaming) setAnnouncement(t('launcher.inlineAi.started'));
    else if (status === 'completed') setAnnouncement(t('launcher.inlineAi.completed'));
    else if (status === 'cancelled') setAnnouncement(t('launcher.inlineAi.cancelled'));
    else if (status === 'failed') setAnnouncement(t('launcher.inlineAi.failed'));
  }, [eventKey, aiStreaming, status, t]);

  const submit = () => {
    const query = aiQuery.trim();
    if (!query || aiStreaming || !aiAvailable) return;
    sendMessage(query);
    setAiQuery('');
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape' || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    event.preventDefault();
    event.stopPropagation();
    onBack();
  };

  return (
    <main
      data-sc-experience="primary"
      data-sc-view="answer"
      data-sc-appearance={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
      data-sc-material={surface.material}
      data-sc-reduced-motion={String(surface.preferences.reduceMotion)}
      data-sc-increased-contrast={String(surface.preferences.increaseContrast)}
      className="sc-primary-launcher sc-inline-ai"
      style={{
        ['--sc-layout-answer-width' as string]: `${LAUNCHER_LAYOUT.answerWidth}px`,
        ['--sc-layout-panel-shadowInset' as string]: `${LAUNCHER_LAYOUT.shadowInset}px`,
        ['--sc-radius-answer' as string]: `${LAUNCHER_LAYOUT.answerRadius}px`,
      } as React.CSSProperties}
      onKeyDown={onKeyDown}
    >
      <LauncherSurface region="answer" regionRef={answerSurfaceRef} className="sc-inline-ai-panel">
        <header data-sc-answer-header className="sc-inline-ai-header">
          <button type="button" className="sc-inline-ai-icon" aria-label={t('common.back')} title={t('common.back')} onClick={onBack}>
            <ArrowLeft size={18} weight="regular" aria-hidden="true" />
          </button>
          <h1 className="sc-inline-ai-heading">{t('launcher.aiMode.response')}</h1>
          <div className="sc-inline-ai-header-actions">
            <button type="button" className="sc-inline-ai-icon" aria-label={t('launcher.inlineAi.expand')} title={t('launcher.inlineAi.expand')} onClick={onExpand}>
              <ArrowsOut size={18} weight="regular" aria-hidden="true" />
            </button>
            <button type="button" className="sc-inline-ai-icon" aria-label={t('common.close')} title={t('common.close')} onClick={onClose}>
              <X size={18} weight="regular" aria-hidden="true" />
            </button>
          </div>
        </header>
        <div
          data-sc-answer-content
          ref={aiResponseRef}
          className="sc-inline-ai-transcript"
          aria-label={t('launcher.aiMode.response')}
          aria-busy={aiStreaming}
          onScroll={event => {
            const viewport = event.currentTarget;
            followBottom.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 32;
          }}
        >
          {messages.map((message, index) => {
            if (message.role === 'user') {
              return <div key={message.id} className="sc-inline-ai-user sc-ai-selectable">{message.content}</div>;
            }
            const streaming = aiStreaming && index === messages.length - 1;
            const content = message.content;
            return (
              <div key={message.id} className="sc-inline-ai-assistant">
                {content && <div className="sc-inline-ai-prose ai-markdown sc-ai-selectable"><ChatMarkdown content={content} streaming={streaming} /></div>}
                {streaming && <div className="sc-inline-ai-status">
                  <span className="sc-inline-ai-progress" aria-hidden="true" />
                  {t(content ? 'launcher.aiMode.streaming' : 'launcher.aiMode.thinking')}
                </div>}
                {message.error && <div className="sc-inline-ai-error" role="alert">
                  <span>{message.error}</span>
                  {failedLatest && index === messages.length - 1 && <div className="sc-inline-ai-recovery">
                    <button type="button" className="sc-inline-ai-action" onClick={retryLastMessage}>{t('launcher.inlineAi.retry')}</button>
                    <button type="button" className="sc-inline-ai-action" onClick={onOpenSettings}>{t('launcher.inlineAi.openSettings')}</button>
                  </div>}
                </div>}
                {message.cancelled && <div className="sc-inline-ai-status">{t('launcher.inlineAi.cancelled')}</div>}
                {content && <button type="button" className="sc-inline-ai-action sc-inline-ai-copy" onClick={() => onCopy(content)} aria-label={t('common.copy')}>
                  <Copy size={16} weight="regular" aria-hidden="true" />{t('common.copy')}
                </button>}
              </div>
            );
          })}
          {aiStreaming && lastMessage?.role !== 'assistant' && <div className="sc-inline-ai-status">
            <span className="sc-inline-ai-progress" aria-hidden="true" />{t('launcher.aiMode.thinking')}
          </div>}
          {!aiAvailable && !aiStreaming && <div className="sc-inline-ai-error" role="alert">
            <span>{t('launcher.inlineAi.unavailable')}</span>
            <button type="button" className="sc-inline-ai-action" onClick={onOpenSettings}>{t('launcher.inlineAi.openSettings')}</button>
          </div>}
        </div>
        <form data-sc-answer-composer className="sc-inline-ai-composer" onSubmit={event => { event.preventDefault(); submit(); }}>
          <label className="sc-inline-ai-visually-hidden" htmlFor="sc-inline-ai-followup">{t('launcher.inlineAi.followUpLabel')}</label>
          <input
            id="sc-inline-ai-followup"
            ref={aiInputRef}
            type="text"
            value={aiQuery}
            placeholder={t('launcher.inlineAi.followUp')}
            onChange={event => setAiQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || event.repeat || aiStreaming)) event.preventDefault();
            }}
            disabled={!aiAvailable && !aiStreaming}
            autoComplete="off"
          />
          {aiStreaming ? (
            <button type="button" className="sc-inline-ai-icon sc-inline-ai-stop" aria-label={t('launcher.inlineAi.stop')} title={t('launcher.inlineAi.stop')} onClick={stopStreaming}>
              <Stop size={18} weight="fill" aria-hidden="true" />
            </button>
          ) : (
            <button type="submit" className="sc-inline-ai-icon sc-inline-ai-send" aria-label={t('launcher.inlineAi.send')} title={t('launcher.inlineAi.send')} disabled={!aiQuery.trim() || !aiAvailable}>
              <PaperPlaneRight size={18} weight="fill" aria-hidden="true" />
            </button>
          )}
        </form>
        <div className="sc-inline-ai-visually-hidden" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
      </LauncherSurface>
    </main>
  );
}
