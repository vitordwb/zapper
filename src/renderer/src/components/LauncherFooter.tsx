import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { BrowserProfileSetting, CommandInfo } from '../../types/electron';
import {
  getCommandDisplayTitle,
  type LauncherAction,
  type MemoryFeedback,
  renderCommandIcon,
  renderShortcutLabel,
} from '../utils/command-helpers';

type LauncherFooterProps = {
  status: MemoryFeedback;
  selectedCommand: CommandInfo | null;
  selectedAction: LauncherAction | undefined;
  browserProfiles: BrowserProfileSetting[];
  resultCount: number;
  onOpenActions: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const keycapClass = 'inline-flex min-h-[22px] min-w-[22px] shrink-0 items-center justify-center bg-[var(--sc-color-surface-inset)] px-1.5 text-[length:.6875rem] leading-[.875rem] text-[var(--sc-color-text-tertiary)]';
const keycapStyle = { borderRadius: 'var(--sc-radius-keycap)' };

const LauncherFooter: React.FC<LauncherFooterProps> = ({
  status,
  selectedCommand,
  selectedAction,
  browserProfiles,
  resultCount,
  onOpenActions,
  t,
}) => {
  const footerRef = useRef<HTMLDivElement>(null);
  const isBrowserProfileAction = Boolean(
    selectedCommand?.browserActionInput ||
    selectedCommand?.browserUrl ||
    selectedCommand?.browserMatchKind ||
    selectedCommand?.browserResultKind ||
    selectedCommand?.rootSearchSource === 'browser' ||
    selectedCommand?.rootSearchSource === 'open-url' ||
    selectedCommand?.rootSearchSource === 'direct-search'
  );
  const targetProfileLabel = selectedCommand?.browserTargetProfileLabel || '';
  const alternateProfileLabel = selectedCommand?.browserAlternateProfileLabel || '';
  const profileCount = Math.max(selectedCommand?.browserProfileCount || 0, browserProfiles.length);
  const showProfileHint = profileCount > 1 && Boolean(alternateProfileLabel);
  const showFocusHint = selectedCommand?.browserResultKind === 'open-tab' && selectedCommand.browserFocusAvailable === true;
  const [optionHeld, setOptionHeld] = useState(false);

  useEffect(() => {
    const isOptionEvent = (event: KeyboardEvent | MouseEvent | PointerEvent) =>
      Boolean(event.altKey || ('getModifierState' in event && event.getModifierState?.('Alt')));
    const onKeyDown = (event: KeyboardEvent) => {
      if (isOptionEvent(event) || event.key === 'Alt' || event.code === 'AltLeft' || event.code === 'AltRight') {
        setOptionHeld(true);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Alt' || event.code === 'AltLeft' || event.code === 'AltRight' || !isOptionEvent(event)) {
        setOptionHeld(false);
      }
    };
    const onPointerMove = (event: PointerEvent) => setOptionHeld(isOptionEvent(event));
    const onMouseMove = (event: MouseEvent) => setOptionHeld(isOptionEvent(event));
    const onBlur = () => setOptionHeld(false);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('blur', onBlur);
    const cleanupModifier = window.electron?.onModifierStateChanged?.((state) => {
      setOptionHeld(Boolean(state?.altKey));
    });
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('mousemove', onMouseMove, true);
      window.removeEventListener('blur', onBlur);
      cleanupModifier?.();
    };
  }, []);

  return (
    <div ref={footerRef} className="flex min-h-[52px] flex-wrap items-center gap-x-[var(--sc-space-12)] gap-y-[var(--sc-space-8)] border-t border-[var(--sc-color-separator)] px-[var(--sc-space-20)] py-[var(--sc-space-8)] text-[length:.8125rem] leading-[1.125rem] text-[var(--sc-color-text-secondary)] [-webkit-app-region:no-drag]">
      <div role={status ? 'status' : undefined} className="flex min-w-[120px] flex-[1_1_140px] items-center gap-[var(--sc-space-8)]">
        {status ? (
          <>
            <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.type === 'success' ? 'bg-[var(--sc-color-status-success)]' : 'bg-[var(--sc-color-status-error)]'}`} />
            <span className="min-w-0 break-words" style={{ color: status.type === 'error' ? 'var(--sc-color-status-error)' : 'var(--sc-color-status-success)' }}>{status.text}</span>
          </>
        ) : selectedCommand ? (
          <>
            <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden">{renderCommandIcon(selectedCommand)}</span>
            <span className="min-w-0 truncate">{getCommandDisplayTitle(selectedCommand, t)}</span>
          </>
        ) : (
          <span>{t('launcher.status.results', { count: resultCount })}</span>
        )}
      </div>
      {selectedAction && isBrowserProfileAction && selectedCommand ? (
        <div className="flex min-w-0 flex-[1_1_240px] flex-wrap items-center justify-end gap-x-[var(--sc-space-8)] gap-y-[var(--sc-space-4)]">
          <button type="button" onClick={() => selectedAction.execute()} className="min-h-[var(--sc-layout-control-hitTarget)] text-left font-medium text-[var(--sc-color-text-primary)] hover:opacity-70">{selectedAction.title}</button>
          {targetProfileLabel ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <BrowserAppIcon iconDataUrl={selectedCommand.browserTargetProfileIconDataUrl} />
              <span className="max-w-24 truncate">{targetProfileLabel}</span>
            </span>
          ) : null}
          <kbd className={keycapClass} style={keycapStyle}>↩</kbd>
          {showProfileHint ? (
            <>
              <span>{t('launcher.browserSearch.profileAction')}</span>
              <kbd className={keycapClass} style={keycapStyle}>⌥</kbd>
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <BrowserAppIcon iconDataUrl={selectedCommand.browserAlternateProfileIconDataUrl} />
                <span className="max-w-24 truncate">{alternateProfileLabel}</span>
              </span>
              {optionHeld ? (
                <BrowserProfileMenu
                  anchorRef={footerRef}
                  profiles={browserProfiles}
                  iconForBrowserId={(browserId) =>
                    browserId === selectedCommand.browserTargetProfileBrowserId
                      ? selectedCommand.browserTargetProfileIconDataUrl
                      : browserId === selectedCommand.browserAlternateProfileBrowserId
                        ? selectedCommand.browserAlternateProfileIconDataUrl
                        : undefined
                  }
                />
              ) : null}
            </>
          ) : null}
          {showFocusHint ? (
            <>
              <span>{t('launcher.actions.focusExistingTab')}</span>
              <kbd className={keycapClass} style={keycapStyle}>⌘</kbd><kbd className={keycapClass} style={keycapStyle}>↩</kbd>
            </>
          ) : null}
        </div>
      ) : selectedAction ? (
        <div className="flex flex-wrap items-center justify-end gap-[var(--sc-space-8)]">
          <button type="button" onClick={() => selectedAction.execute()} className="min-h-[var(--sc-layout-control-hitTarget)] text-left font-medium text-[var(--sc-color-text-primary)] hover:opacity-70">{selectedAction.title}</button>
          {selectedAction.shortcut ? <kbd className={keycapClass} style={keycapStyle}>{renderShortcutLabel(selectedAction.shortcut)}</kbd> : null}
        </div>
      ) : null}
      {!isBrowserProfileAction ? (
        <button type="button" onClick={onOpenActions} className="flex min-h-[var(--sc-layout-control-hitTarget)] items-center gap-1.5 text-[var(--sc-color-text-secondary)] hover:text-[var(--sc-color-text-primary)]">
          <span>{t('common.actions')}</span><kbd className={keycapClass} style={keycapStyle}>⌘</kbd><kbd className={keycapClass} style={keycapStyle}>K</kbd>
        </button>
      ) : null}
    </div>
  );
};

const BrowserAppIcon: React.FC<{ iconDataUrl?: string }> = ({ iconDataUrl }) => (
  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden bg-[var(--sc-color-surface-inset)]" style={keycapStyle}>
    {iconDataUrl ? <img src={iconDataUrl} alt="" className="h-4 w-4 object-contain" draggable={false} /> : null}
  </span>
);

const BrowserProfileMenu: React.FC<{
  anchorRef: React.RefObject<HTMLDivElement>;
  profiles: BrowserProfileSetting[];
  iconForBrowserId: (browserId: string) => string | undefined;
}> = ({ anchorRef, profiles, iconForBrowserId }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const anchor = anchorRef.current;
    if (!menu || !anchor) return;
    const update = () => {
      const rect = anchor.getBoundingClientRect();
      const width = menu.offsetWidth;
      const height = menu.offsetHeight;
      setPosition({
        left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)),
        top: Math.max(12, Math.min(rect.top - height - 8, window.innerHeight - height - 12)),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(menu);
    observer.observe(anchor);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef, profiles]);
  if (profiles.length === 0) return null;
  const root = anchorRef.current?.closest('[data-sc-experience="primary"]');
  return createPortal(
    <div ref={menuRef} role="note" className="custom-scrollbar fixed z-[var(--sc-layer-popover)] max-h-[calc(100vh-24px)] w-[min(320px,calc(100vw-24px))] overflow-y-auto border border-[var(--sc-color-surface-stroke)] bg-[var(--sc-color-surface-raised)] p-[var(--sc-space-4)] text-[length:.8125rem] text-[var(--sc-color-text-primary)] shadow-[var(--sc-shadow-menu)] [-webkit-app-region:no-drag]" style={{ ...position, borderRadius: 'var(--sc-radius-control)' }}>
      {profiles.map((profile, index) => (
        <div key={profile.id} className="flex min-h-[var(--sc-layout-control-hitTarget)] items-center gap-[var(--sc-space-8)] px-[var(--sc-space-8)]">
          <BrowserAppIcon iconDataUrl={iconForBrowserId(profile.browserId)} />
          <span className="min-w-0 flex-1 truncate">{profile.displayName || profile.detectedName || profile.profileId}</span>
          <kbd className={keycapClass} style={keycapStyle}>{index === 0 ? '↩' : index === 1 ? '⌥' : `⌥${index - 1}`}</kbd>
        </div>
      ))}
    </div>,
    root || document.body
  );
};

export default LauncherFooter;
