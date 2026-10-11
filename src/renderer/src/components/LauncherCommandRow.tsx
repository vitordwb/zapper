import React from 'react';
import type { CommandInfo } from '../../types/electron';
import {
  getCategoryLabel,
  getCommandAccessoryLabel,
  getCommandDisplayTitle,
  getCommandTypeBadgeLabel,
  getShortcutDisplayParts,
  renderCommandIcon,
} from '../utils/command-helpers';

type LauncherCommandRowProps = {
  command: CommandInfo;
  optionId: string;
  flatIndex: number;
  selected: boolean;
  selectionInactive?: boolean;
  itemRef: (el: HTMLDivElement | null) => void;
  commandAlias: string;
  commandHotkey: string;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LauncherCommandRow: React.FC<LauncherCommandRowProps> = ({
  command,
  optionId,
  flatIndex,
  selected,
  selectionInactive = false,
  itemRef,
  commandAlias,
  commandHotkey,
  onClick,
  onContextMenu,
  t,
}) => {
  const title = getCommandDisplayTitle(command, t);
  const accessoryLabel = getCommandAccessoryLabel(command);
  const typeBadgeLabel = getCommandTypeBadgeLabel(command, t);
  const categoryLabel = getCategoryLabel(command.category, t);
  const metadata = accessoryLabel || categoryLabel;
  const hotkeyParts = commandHotkey ? getShortcutDisplayParts(commandHotkey) : [];
  const accessibleName = [title, metadata, typeBadgeLabel, commandAlias, commandHotkey]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      id={optionId}
      ref={itemRef}
      role="option"
      aria-selected={selected}
      aria-label={accessibleName}
      data-sc-selection={selected ? (selectionInactive ? 'inactive' : 'active') : undefined}
      className={`flex min-h-[var(--sc-layout-result-height)] cursor-pointer items-center gap-[var(--sc-spacing-result-iconGap)] px-[var(--sc-spacing-result-inline)] py-[var(--sc-space-10)] text-[var(--sc-color-text-primary)] [-webkit-app-region:no-drag] ${selected ? selectionInactive ? 'bg-[var(--sc-color-selection-inactive)]' : 'bg-[var(--sc-color-selection-background)]' : 'hover:bg-[var(--sc-color-hover-background)]'}`}
      style={{ borderRadius: 'var(--sc-radius-result)' }}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center [&>img]:h-9 [&>img]:w-9 [&>div]:h-9 [&>div]:w-9 [&>div>img]:h-5 [&>div>img]:w-5">
        {renderCommandIcon(command)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[var(--sc-spacing-result-textGap)]">
        <span className="truncate text-[length:1rem] font-medium leading-5">{title}</span>
        <span className="truncate text-[length:.8125rem] leading-[1.125rem] text-[var(--sc-color-text-secondary)]">{metadata}</span>
      </span>
      <span aria-hidden="true" className="flex min-w-0 max-w-[42%] shrink items-center justify-end gap-1.5 text-[length:.6875rem] leading-[.875rem] text-[var(--sc-color-text-tertiary)]">
        {commandAlias ? <span className="max-w-20 truncate bg-[var(--sc-color-surface-inset)] px-1.5 py-1 font-mono" style={{ borderRadius: 'var(--sc-radius-keycap)' }}>{commandAlias}</span> : null}
        {hotkeyParts.length ? <span className="flex shrink-0 gap-0.5">{hotkeyParts.map((part, index) => (
          <kbd key={index} className="min-w-5 bg-[var(--sc-color-surface-inset)] px-1 py-1 text-center" style={{ borderRadius: 'var(--sc-radius-keycap)' }}>{part}</kbd>
        ))}</span> : null}
        {typeBadgeLabel ? <span className="max-w-20 truncate">{typeBadgeLabel}</span> : null}
        {flatIndex < 9 ? <span className="shrink-0 bg-[var(--sc-color-surface-inset)] px-1.5 py-1" style={{ borderRadius: 'var(--sc-radius-keycap)' }}>⌘{flatIndex + 1}</span> : null}
      </span>
    </div>
  );
};

export default LauncherCommandRow;
