import React, { useEffect, useRef } from 'react';
import type { CommandInfo } from '../../types/electron';
import type { LauncherAction } from '../utils/command-helpers';
import { useI18n } from '../i18n';
import { LauncherActionMenuItems } from './LauncherActionsOverlay';
import { useLauncherMenuBounds } from './launcher-overlay-style';

export type LauncherContextMenuState = {
  x: number;
  y: number;
  command: CommandInfo;
};

type LauncherContextMenuOverlayProps = {
  contextMenu: LauncherContextMenuState | null;
  actions: LauncherAction[];
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  menuRef: React.RefObject<HTMLDivElement>;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onClose: () => void;
  onActionClick: (action: LauncherAction) => void | Promise<void>;
};

const LauncherContextMenuOverlay: React.FC<LauncherContextMenuOverlayProps> = ({
  contextMenu, actions, selectedIndex, setSelectedIndex, menuRef, onKeyDown, onClose, onActionClick,
}) => {
  const { t } = useI18n();
  const bounds = useLauncherMenuBounds(menuRef, contextMenu);
  const previousFocus = useRef<Element | null>(null);
  useEffect(() => {
    if (!contextMenu) return;
    const panel = menuRef.current;
    previousFocus.current = document.activeElement;
    return () => {
      if (panel?.contains(document.activeElement) && previousFocus.current instanceof HTMLElement && previousFocus.current.isConnected) {
        previousFocus.current.focus();
      }
    };
  }, [contextMenu, menuRef]);

  if (!contextMenu || actions.length === 0) return null;
  const active = actions[selectedIndex];
  return (
    <div className="fixed inset-0" style={{ zIndex: 'var(--sc-layer-modalScrim)' }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} onContextMenu={(event) => { event.preventDefault(); onClose(); }}>
      <div
        ref={menuRef}
        data-sc-overlay-panel="context"
        role="menu"
        aria-label={t('common.actions')}
        aria-activedescendant={active && active.enabled !== false ? `sc-context-${encodeURIComponent(active.id)}` : undefined}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
          onKeyDown(event);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
        style={{ ...bounds, zIndex: 'var(--sc-layer-modal)', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 'var(--sc-radius-control)', background: 'var(--sc-color-surface-raised)', color: 'var(--sc-color-text-primary)', border: '1px solid var(--sc-color-surface-stroke)', boxShadow: 'var(--sc-shadow-menu)', outlineOffset: 2 }}
      >
        <LauncherActionMenuItems actions={actions} selectedIndex={selectedIndex} setSelectedIndex={setSelectedIndex} onActionClick={onActionClick} idPrefix="sc-context" />
      </div>
    </div>
  );
};

export default LauncherContextMenuOverlay;
