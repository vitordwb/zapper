import React, { useEffect, useRef } from 'react';
import type { LauncherAction } from '../utils/command-helpers';
import { getShortcutDisplayParts } from '../utils/command-helpers';
import { useI18n } from '../i18n';
import { useLauncherMenuBounds } from './launcher-overlay-style';

type LauncherActionsOverlayProps = {
  actions: LauncherAction[];
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  overlayRef: React.RefObject<HTMLDivElement>;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onClose: () => void;
  onActionClick: (action: LauncherAction) => void | Promise<void>;
};

export function LauncherActionMenuItems({ actions, selectedIndex, setSelectedIndex, onActionClick, idPrefix }: {
  actions: LauncherAction[];
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  onActionClick: (action: LauncherAction) => void | Promise<void>;
  idPrefix: string;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const selected = actions[selectedIndex];
    if (!selected || selected.enabled === false) return;
    const row = Array.from(bodyRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
      .find((item) => item.id === `${idPrefix}-${encodeURIComponent(selected.id)}`);
    row?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }, [actions, selectedIndex, idPrefix]);
  return (
    <div ref={bodyRef} className="min-h-0 overflow-y-auto p-1" style={{ overscrollBehavior: 'contain' }}>
      {actions.map((action, idx) => (
        <React.Fragment key={action.id}>
          {action.separatorBefore && <div role="separator" className="mx-2 my-1 border-t" style={{ borderColor: 'var(--sc-color-separator)' }} />}
          <div
            id={`${idPrefix}-${encodeURIComponent(action.id)}`}
            role="menuitem"
            aria-disabled={action.enabled === false || undefined}
            className="flex min-h-8 items-center gap-2 px-3 py-1.5 text-left"
            style={{
              borderRadius: 'var(--sc-radius-control)',
              background: idx === selectedIndex ? 'var(--sc-color-selection-background)' : 'transparent',
              color: action.enabled === false ? 'var(--sc-color-text-disabled)' : action.style === 'destructive' ? 'var(--sc-color-status-error)' : 'var(--sc-color-text-primary)',
              opacity: action.enabled === false ? 'var(--sc-opacity-disabled)' : 1,
              cursor: action.enabled === false ? 'default' : 'pointer',
              font: 'var(--sc-typography-control)',
            }}
            onMouseMove={() => {
              if (action.enabled !== false && idx !== selectedIndex) setSelectedIndex(idx);
            }}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (action.enabled !== false) void onActionClick(action);
            }}
          >
            {action.icon && <span className="shrink-0" aria-hidden="true">{action.icon}</span>}
            <span className="min-w-0 flex-1 truncate">{action.title}</span>
            {action.shortcut && (
              <span className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
                {getShortcutDisplayParts(action.shortcut).map((key, keyIdx) => (
                  <kbd key={`${action.id}-${key}-${keyIdx}`} className="inline-flex min-w-[22px] items-center justify-center px-1" style={{ minHeight: 22, borderRadius: 'var(--sc-radius-keycap)', background: 'var(--sc-color-surface-inset)', color: 'var(--sc-color-text-tertiary)', font: 'var(--sc-typography-shortcut)' }}>{key}</kbd>
                ))}
              </span>
            )}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

const LauncherActionsOverlay: React.FC<LauncherActionsOverlayProps> = ({
  actions, selectedIndex, setSelectedIndex, overlayRef, onKeyDown, onClose, onActionClick,
}) => {
  const { t } = useI18n();
  const bounds = useLauncherMenuBounds(overlayRef, null);
  const previousFocus = useRef<Element | null>(null);
  useEffect(() => {
    const panel = overlayRef.current;
    previousFocus.current = document.activeElement;
    return () => {
      if (panel?.contains(document.activeElement) && previousFocus.current instanceof HTMLElement && previousFocus.current.isConnected) {
        previousFocus.current.focus();
      }
    };
  }, [overlayRef]);

  if (actions.length === 0) return null;
  const active = actions[selectedIndex];
  return (
    <div className="fixed inset-0" style={{ zIndex: 'var(--sc-layer-modalScrim)', background: 'rgba(0,0,0,.12)' }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div
        ref={overlayRef}
        data-sc-overlay-panel="actions"
        role="menu"
        aria-label={t('common.actions')}
        aria-activedescendant={active && active.enabled !== false ? `sc-actions-${encodeURIComponent(active.id)}` : undefined}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
          onKeyDown(event);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        style={{ ...bounds, zIndex: 'var(--sc-layer-modal)', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 'var(--sc-radius-control)', background: 'var(--sc-color-surface-raised)', color: 'var(--sc-color-text-primary)', border: '1px solid var(--sc-color-surface-stroke)', boxShadow: 'var(--sc-shadow-menu)', outlineOffset: 2 }}
      >
        <LauncherActionMenuItems actions={actions} selectedIndex={selectedIndex} setSelectedIndex={setSelectedIndex} onActionClick={onActionClick} idPrefix="sc-actions" />
      </div>
    </div>
  );
};

export default LauncherActionsOverlay;
