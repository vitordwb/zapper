import React, { useId, useRef } from 'react';
import type { CommandInfo, QuickLinkDynamicField } from '../../types/electron';
import { useI18n } from '../i18n';

export type QuickLinkDynamicPromptState = {
  command: CommandInfo;
  quickLinkId: string;
  fields: QuickLinkDynamicField[];
  values: Record<string, string>;
};

type QuickLinkDynamicPromptOverlayProps = {
  prompt: QuickLinkDynamicPromptState | null;
  inputRef: React.RefObject<HTMLInputElement>;
  commandTitle: string;
  setPrompt: React.Dispatch<React.SetStateAction<QuickLinkDynamicPromptState | null>>;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
};

const QuickLinkDynamicPromptOverlay: React.FC<QuickLinkDynamicPromptOverlayProps> = ({
  prompt, inputRef, commandTitle, setPrompt, onCancel, onSubmit,
}) => {
  const { t } = useI18n();
  const titleId = useId();
  const descriptionId = useId();
  const fieldPrefix = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  if (!prompt) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 'var(--sc-layer-modalScrim)', padding: 12, background: 'rgba(0,0,0,.2)' }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}
    >
      <div
        ref={dialogRef}
        data-sc-overlay-panel="quick-link"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="flex min-h-0 flex-col overflow-hidden"
        style={{ width: 'min(520px, 100%)', maxHeight: 'calc(100vh - 24px)', borderRadius: 'var(--sc-radius-control)', background: 'var(--sc-color-surface-raised)', color: 'var(--sc-color-text-primary)', border: '1px solid var(--sc-color-surface-stroke)', boxShadow: 'var(--sc-shadow-menu)' }}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input:not(:disabled), button:not(:disabled)') ?? []);
          if (controls.length === 0) return;
          if (event.shiftKey && document.activeElement === controls[0]) {
            event.preventDefault();
            controls[controls.length - 1].focus();
          } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
            event.preventDefault();
            controls[0].focus();
          }
        }}
      >
        <div id={titleId} className="shrink-0 px-4 py-3 font-medium" style={{ font: 'var(--sc-typography-result-primary)', borderBottom: '1px solid var(--sc-color-separator)' }}>
          {t('launcher.quickLinkPrompt.title')}
        </div>
        <div id={descriptionId} className="min-w-0 shrink-0 truncate px-4 pt-3" style={{ color: 'var(--sc-color-text-secondary)', font: 'var(--sc-typography-result-secondary)' }}>
          {commandTitle}
        </div>
        <div className="min-h-0 space-y-3 overflow-y-auto p-4" style={{ overscrollBehavior: 'contain' }}>
          {prompt.fields.map((field, idx) => (
            <div key={field.key}>
              <label htmlFor={`${fieldPrefix}-${idx}`} className="mb-1.5 block" style={{ color: 'var(--sc-color-text-secondary)', font: 'var(--sc-typography-control)' }}>{field.name}</label>
              <input
                id={`${fieldPrefix}-${idx}`}
                ref={idx === 0 ? inputRef : undefined}
                type="text"
                value={prompt.values[field.key] || ''}
                onChange={(event) => setPrompt((prev) => prev ? { ...prev, values: { ...prev.values, [field.key]: event.target.value } } : prev)}
                placeholder={field.defaultValue || ''}
                className="w-full px-3 py-2"
                style={{ minHeight: 36, borderRadius: 'var(--sc-radius-control)', background: 'var(--sc-color-surface-inset)', border: '1px solid var(--sc-color-surface-stroke)', color: 'var(--sc-color-text-primary)', font: 'var(--sc-typography-control)' }}
              />
            </div>
          ))}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--sc-color-separator)' }}>
          <button type="button" onClick={onCancel} className="inline-flex min-h-9 items-center gap-2 px-3" style={{ borderRadius: 'var(--sc-radius-control)', border: '1px solid var(--sc-color-surface-stroke)', background: 'var(--sc-color-surface-inset)', color: 'var(--sc-color-text-primary)', font: 'var(--sc-typography-control)' }}>
            {t('common.cancel')} <kbd aria-hidden="true" style={{ font: 'var(--sc-typography-shortcut)', color: 'var(--sc-color-text-tertiary)' }}>Esc</kbd>
          </button>
          <button type="button" onClick={() => void onSubmit()} className="inline-flex min-h-9 items-center gap-2 px-3" style={{ borderRadius: 'var(--sc-radius-control)', border: '1px solid var(--sc-color-surface-stroke)', background: 'var(--sc-color-selection-background)', color: 'var(--sc-color-text-primary)', font: 'var(--sc-typography-control)' }}>
            {t('launcher.quickLinkPrompt.submit')} <kbd aria-hidden="true" style={{ font: 'var(--sc-typography-shortcut)', color: 'var(--sc-color-text-tertiary)' }}>↩</kbd>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickLinkDynamicPromptOverlay;
