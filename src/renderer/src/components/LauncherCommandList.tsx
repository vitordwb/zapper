import React from 'react';
import type { CommandInfo } from '../../types/electron';
import type { CalcResult } from '../smart-calculator';
import LauncherCalculatorCard from './LauncherCalculatorCard';
import LauncherCommandRow from './LauncherCommandRow';

export const LAUNCHER_CALCULATOR_OPTION_ID = 'sc-launcher-option-calculator';
export const getLauncherCommandOptionId = (commandId: string): string =>
  `sc-launcher-option-${encodeURIComponent(commandId)}`;

export type LauncherCommandSection = {
  title: string;
  items: CommandInfo[];
};

type LauncherCommandListProps = {
  listRef: React.RefObject<HTMLDivElement>;
  itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  isLoading: boolean;
  isHidden: boolean;
  displayCommands: CommandInfo[];
  sections: LauncherCommandSection[];
  calcResult: CalcResult | null;
  calcOffset: number;
  selectedIndex: number;
  selectionInactive?: boolean;
  listboxId?: string;
  commandAliases: Record<string, string>;
  commandHotkeys: Record<string, string>;
  onCalculatorCopy: () => void;
  onCommandClick: (command: CommandInfo, selectedIndex: number, event?: React.MouseEvent<HTMLDivElement>) => void | Promise<void>;
  onCommandContextMenu: (
    event: React.MouseEvent<HTMLDivElement>,
    command: CommandInfo,
    selectedIndex: number
  ) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LauncherCommandList: React.FC<LauncherCommandListProps> = ({
  listRef,
  itemRefs,
  isLoading,
  isHidden,
  displayCommands,
  sections,
  calcResult,
  calcOffset,
  selectedIndex,
  selectionInactive = false,
  listboxId = 'sc-launcher-results',
  commandAliases,
  commandHotkeys,
  onCalculatorCopy,
  onCommandClick,
  onCommandContextMenu,
  t,
}) => (
  <div
    id={listboxId}
    ref={listRef}
    role="listbox"
    aria-label={t('launcher.resultsLabel')}
    aria-busy={isLoading}
    className="list-area custom-scrollbar min-h-0 flex-1 overflow-y-auto p-[var(--sc-spacing-results-inset)] [-webkit-app-region:no-drag]"
    style={isHidden ? { display: 'none' } : undefined}
  >
    {isLoading ? (
      <div role="status" className="py-4 text-center text-[length:.8125rem] text-[var(--sc-color-text-secondary)]">
        {t('launcher.status.discoveringApps')}
      </div>
    ) : displayCommands.length === 0 && !calcResult ? (
      <div role="status" className="py-4 text-center text-[length:.8125rem] text-[var(--sc-color-text-secondary)]">
        {t('launcher.status.noMatchingResults')}
      </div>
    ) : (
      <>
        {calcResult && (
          <LauncherCalculatorCard
            result={calcResult}
            optionId={LAUNCHER_CALCULATOR_OPTION_ID}
            selected={selectedIndex === 0}
            selectionInactive={selectionInactive}
            itemRef={(el) => { itemRefs.current[0] = el; }}
            onCopy={onCalculatorCopy}
            t={t}
          />
        )}
        {sections.reduce(
          (acc, section, sectionIndex) => {
            const startIndex = acc.index;
            const headingId = `sc-launcher-section-${sectionIndex}`;
            acc.nodes.push(
              <div key={`section-${sectionIndex}`} role="group" aria-labelledby={section.title ? headingId : undefined}>
                {section.title ? (
                  <div
                    id={headingId}
                    className="flex min-h-[var(--sc-layout-section-height)] items-center px-[var(--sc-spacing-result-inline)] pt-[var(--sc-space-8)] text-[length:.75rem] font-medium leading-4 text-[var(--sc-color-text-secondary)]"
                  >
                    {section.title}
                  </div>
                ) : null}
                {section.items.map((command, i) => {
                  const flatIndex = startIndex + i;
                  const absoluteIndex = flatIndex + calcOffset;
                  return (
                    <LauncherCommandRow
                      key={command.id}
                      command={command}
                      optionId={getLauncherCommandOptionId(command.id)}
                      flatIndex={flatIndex}
                      selected={absoluteIndex === selectedIndex}
                      selectionInactive={selectionInactive}
                      itemRef={(el) => { itemRefs.current[absoluteIndex] = el; }}
                      commandAlias={String(commandAliases[command.id] || '').trim()}
                      commandHotkey={String(commandHotkeys[command.id] || '').trim()}
                      onClick={(event) => { void onCommandClick(command, absoluteIndex, event); }}
                      onContextMenu={(event) => onCommandContextMenu(event, command, absoluteIndex)}
                      t={t}
                    />
                  );
                })}
              </div>
            );
            acc.index += section.items.length;
            return acc;
          },
          { nodes: [] as React.ReactNode[], index: 0 }
        ).nodes}
      </>
    )}
  </div>
);

export default LauncherCommandList;
