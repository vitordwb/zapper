import React from 'react';
import type { LauncherSurfaceSnapshot } from '../../../shared/launcher-surface';
import { LAUNCHER_LAYOUT } from '../../../shared/launcher-surface';
import type { BrowserProfileSetting, CommandInfo, QuickLinkDynamicField } from '../../types/electron';
import type { CalcResult } from '../smart-calculator';
import type { LauncherAction, MemoryFeedback } from '../utils/command-helpers';
import type { QuickLinkDynamicPromptState } from '../components/QuickLinkDynamicPromptOverlay';
import type { LauncherContextMenuState } from '../components/LauncherContextMenuOverlay';
import type { LauncherCommandSection } from '../components/LauncherCommandList';
import LauncherSurface from '../components/LauncherSurface';
import LauncherSearchHeader from '../components/LauncherSearchHeader';
import LauncherCommandList from '../components/LauncherCommandList';
import LauncherFooter from '../components/LauncherFooter';
import QuickLinkDynamicPromptOverlay from '../components/QuickLinkDynamicPromptOverlay';
import LauncherActionsOverlay from '../components/LauncherActionsOverlay';
import LauncherContextMenuOverlay from '../components/LauncherContextMenuOverlay';

type LauncherMainViewProps = {
  surface: LauncherSurfaceSnapshot;
  searchSurfaceRef: React.RefObject<HTMLElement>;
  resultsVisible: boolean;
  resultsSurfaceRef: React.RefObject<HTMLElement>;
  overlaySurfaceRef: React.RefObject<HTMLDivElement>;
  intentLabel?: string;
  intentDescription?: string;
  activeOptionId?: string;
  busy?: boolean;
  fileSearchFailed?: boolean;
  tabAsksAi?: boolean;
  onOpenAiSettings?: () => void;


  inlineArgumentInputRefs: React.MutableRefObject<(HTMLInputElement | HTMLSelectElement | null)[]>;
  inlineQuickLinkInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;

  inputRef: React.RefObject<HTMLInputElement>;
  searchPlaceholder: string;
  launcherInputValue: string;
  autocompleteSuffix?: string;
  onInputChange: (value: string) => void;
  onSearchBlur: () => void;
  onSearchKeyDown: (event: React.KeyboardEvent) => void;

  selectedInlineArgumentLeadingIcon: React.ReactNode;

  selectedInlineExtensionArgumentDefinitions: CommandInfo['commandArgumentDefinitions'];
  selectedInlineExtensionArgumentValues: Record<string, string>;
  hasSelectedExtensionOverflowArguments: boolean;
  selectedExtensionOverflowCount: number;
  onInlineExtensionArgumentChange: (argumentName: string, value: string) => void;

  selectedQuickLinkId: string | null;
  selectedInlineQuickLinkDynamicFields: QuickLinkDynamicField[];
  selectedInlineQuickLinkDynamicValues: Record<string, string>;
  hasSelectedQuickLinkOverflowDynamicFields: boolean;
  selectedQuickLinkOverflowCount: number;
  onInlineQuickLinkDynamicValueChange: (fieldKey: string, value: string) => void;

  searchQuery: string;
  aiAvailable: boolean;
  shouldHideAskAi: boolean;
  onAskAi: () => void;
  onClearSearch: () => void;

  isCompactCollapsed: boolean;
  onShowCompactLauncher: () => void;

  listRef: React.RefObject<HTMLDivElement>;
  itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  isLoading: boolean;
  displayCommands: CommandInfo[];
  sections: LauncherCommandSection[];
  calcResult: CalcResult | null;
  calcOffset: number;
  selectedIndex: number;
  commandAliases: Record<string, string>;
  commandHotkeys: Record<string, string>;
  onCalculatorCopy: () => void;
  onCommandClick: (command: CommandInfo, selectedIndex: number, event?: React.MouseEvent<HTMLDivElement>) => void | Promise<void>;
  onCommandContextMenu: (
    event: React.MouseEvent<HTMLDivElement>,
    command: CommandInfo,
    selectedIndex: number
  ) => void;

  launcherFooterStatus: MemoryFeedback;
  selectedCommand: CommandInfo | null;
  selectedAction: LauncherAction | undefined;
  browserProfiles: BrowserProfileSetting[];
  onOpenActions: () => void;

  quickLinkDynamicPrompt: QuickLinkDynamicPromptState | null;
  quickLinkDynamicInputRef: React.RefObject<HTMLInputElement>;
  quickLinkDynamicPromptTitle: string;
  setQuickLinkDynamicPrompt: React.Dispatch<React.SetStateAction<QuickLinkDynamicPromptState | null>>;
  cancelQuickLinkDynamicPrompt: () => void;
  submitQuickLinkDynamicPrompt: () => void | Promise<void>;

  showActions: boolean;
  actionsOverlayActions: LauncherAction[];
  selectedActionIndex: number;
  setSelectedActionIndex: React.Dispatch<React.SetStateAction<number>>;
  actionsOverlayRef: React.RefObject<HTMLDivElement>;
  handleActionsOverlayKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  closeActionsOverlay: () => void;
  onActionOverlayClick: (action: LauncherAction) => void | Promise<void>;

  contextMenu: LauncherContextMenuState | null;
  contextActions: LauncherAction[];
  selectedContextActionIndex: number;
  setSelectedContextActionIndex: React.Dispatch<React.SetStateAction<number>>;
  contextMenuRef: React.RefObject<HTMLDivElement>;
  handleContextMenuKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  closeContextMenu: () => void;
  onContextMenuActionClick: (action: LauncherAction) => void | Promise<void>;


  t: (key: string, params?: Record<string, string | number>) => string;
};

const LauncherMainView: React.FC<LauncherMainViewProps> = ({
  surface,
  resultsVisible,
  searchSurfaceRef,
  resultsSurfaceRef,
  overlaySurfaceRef,
  intentLabel,
  intentDescription,
  activeOptionId,
  busy,
  fileSearchFailed,
  tabAsksAi,
  onOpenAiSettings,
  inlineArgumentInputRefs,
  inlineQuickLinkInputRefs,
  inputRef,
  searchPlaceholder,
  launcherInputValue,
  autocompleteSuffix,
  onInputChange,
  onSearchBlur,
  onSearchKeyDown,
  selectedInlineArgumentLeadingIcon,
  selectedInlineExtensionArgumentDefinitions,
  selectedInlineExtensionArgumentValues,
  hasSelectedExtensionOverflowArguments,
  selectedExtensionOverflowCount,
  onInlineExtensionArgumentChange,
  selectedQuickLinkId,
  selectedInlineQuickLinkDynamicFields,
  selectedInlineQuickLinkDynamicValues,
  hasSelectedQuickLinkOverflowDynamicFields,
  selectedQuickLinkOverflowCount,
  onInlineQuickLinkDynamicValueChange,
  searchQuery,
  aiAvailable,
  shouldHideAskAi,
  onAskAi,
  onClearSearch,
  isCompactCollapsed,
  onShowCompactLauncher,
  listRef,
  itemRefs,
  isLoading,
  displayCommands,
  sections,
  calcResult,
  calcOffset,
  selectedIndex,
  commandAliases,
  commandHotkeys,
  onCalculatorCopy,
  onCommandClick,
  onCommandContextMenu,
  launcherFooterStatus,
  selectedCommand,
  selectedAction,
  browserProfiles,
  onOpenActions,
  quickLinkDynamicPrompt,
  quickLinkDynamicInputRef,
  quickLinkDynamicPromptTitle,
  setQuickLinkDynamicPrompt,
  cancelQuickLinkDynamicPrompt,
  submitQuickLinkDynamicPrompt,
  showActions,
  actionsOverlayActions,
  selectedActionIndex,
  setSelectedActionIndex,
  actionsOverlayRef,
  handleActionsOverlayKeyDown,
  closeActionsOverlay,
  onActionOverlayClick,
  contextMenu,
  contextActions,
  selectedContextActionIndex,
  setSelectedContextActionIndex,
  contextMenuRef,
  handleContextMenuKeyDown,
  closeContextMenu,
  onContextMenuActionClick,
  t,
}) => (
  <main
    data-sc-experience="primary"
    data-sc-view="search"
    data-sc-appearance={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
    data-sc-material={surface.material}
    data-sc-reduced-motion={String(surface.preferences.reduceMotion)}
    data-sc-increased-contrast={String(surface.preferences.increaseContrast)}
    className="sc-primary-launcher"
    style={{
      ['--sc-layout-launcher-width' as string]: LAUNCHER_LAYOUT.searchWidth + 'px',
      ['--sc-layout-search-resultsGap' as string]: LAUNCHER_LAYOUT.resultsGap + 'px',
      ['--sc-layout-panel-shadowInset' as string]: LAUNCHER_LAYOUT.shadowInset + 'px',
      ['--sc-layout-search-height' as string]: LAUNCHER_LAYOUT.searchMinHeight + 'px',
      ['--sc-layout-results-maxHeight' as string]: LAUNCHER_LAYOUT.resultsMaxHeight + 'px',
      ['--sc-radius-search' as string]: LAUNCHER_LAYOUT.searchRadius + 'px',
      ['--sc-radius-results' as string]: LAUNCHER_LAYOUT.resultsRadius + 'px',
    } as React.CSSProperties}
  >
    <h1 className="sr-only">{t('launcher.searchLabel')}</h1>
    <LauncherSurface region="search" regionRef={searchSurfaceRef}>
      <LauncherSearchHeader
        inlineArgumentInputRefs={inlineArgumentInputRefs}
        inlineQuickLinkInputRefs={inlineQuickLinkInputRefs}
        inputRef={inputRef}
        placeholder={searchPlaceholder}
        value={launcherInputValue}
        autocompleteSuffix={autocompleteSuffix}
        onInputChange={onInputChange}
        onBlur={onSearchBlur}
        onKeyDown={onSearchKeyDown}
        selectedInlineArgumentLeadingIcon={selectedInlineArgumentLeadingIcon}
        selectedInlineExtensionArgumentDefinitions={selectedInlineExtensionArgumentDefinitions}
        selectedInlineExtensionArgumentValues={selectedInlineExtensionArgumentValues}
        hasSelectedExtensionOverflowArguments={hasSelectedExtensionOverflowArguments}
        selectedExtensionOverflowCount={selectedExtensionOverflowCount}
        onInlineExtensionArgumentChange={onInlineExtensionArgumentChange}
        selectedQuickLinkId={selectedQuickLinkId}
        selectedInlineQuickLinkDynamicFields={selectedInlineQuickLinkDynamicFields}
        selectedInlineQuickLinkDynamicValues={selectedInlineQuickLinkDynamicValues}
        hasSelectedQuickLinkOverflowDynamicFields={hasSelectedQuickLinkOverflowDynamicFields}
        selectedQuickLinkOverflowCount={selectedQuickLinkOverflowCount}
        onInlineQuickLinkDynamicValueChange={onInlineQuickLinkDynamicValueChange}
        searchQuery={searchQuery}
        aiAvailable={aiAvailable}
        shouldHideAskAi={shouldHideAskAi}
        onAskAi={onAskAi}
        tabAsksAi={tabAsksAi}
        onOpenAiSettings={onOpenAiSettings}
        onClearSearch={onClearSearch}
        inputLabel={t('launcher.searchLabel')}
        listboxId="sc-primary-results"
        resultsExpanded={resultsVisible}
        showMore={!searchQuery.trim() && isCompactCollapsed}
        onShowMore={onShowCompactLauncher}
        activeOptionId={activeOptionId}
        intentLabel={intentLabel}
        intentDescription={intentDescription}
        busy={busy}
        t={t}
      />

    </LauncherSurface>
    {resultsVisible && (
      <LauncherSurface region="results" regionRef={resultsSurfaceRef}>

      <LauncherCommandList
        listRef={listRef}
        itemRefs={itemRefs}
        isLoading={isLoading}
        isHidden={false}
        displayCommands={displayCommands}
        sections={sections}
        calcResult={calcResult}
        calcOffset={calcOffset}
        selectedIndex={selectedIndex}
        commandAliases={commandAliases}
        commandHotkeys={commandHotkeys}
        onCalculatorCopy={onCalculatorCopy}
        onCommandClick={onCommandClick}
        onCommandContextMenu={onCommandContextMenu}
        listboxId="sc-primary-results"
        t={t}
      />
      {fileSearchFailed && <div role="status" className="px-5 py-1.5 text-[var(--sc-color-text-secondary)]" style={{ font: 'var(--sc-typography-control)' }}>{t('launcher.status.fileSearchFailed')}</div>}

      {!isLoading && (
        <LauncherFooter
          status={launcherFooterStatus}
          selectedCommand={selectedCommand}
          selectedAction={selectedAction}
          browserProfiles={browserProfiles}
          resultCount={displayCommands.length}
          onOpenActions={onOpenActions}
          t={t}
        />
      )}
      </LauncherSurface>
    )}
    <div ref={overlaySurfaceRef} className="sc-primary-overlays">
    <QuickLinkDynamicPromptOverlay
      prompt={quickLinkDynamicPrompt}
      inputRef={quickLinkDynamicInputRef}
      commandTitle={quickLinkDynamicPromptTitle}
      setPrompt={setQuickLinkDynamicPrompt}
      onCancel={cancelQuickLinkDynamicPrompt}
      onSubmit={submitQuickLinkDynamicPrompt}
    />
    {showActions && (
      <LauncherActionsOverlay
        actions={actionsOverlayActions}
        selectedIndex={selectedActionIndex}
        setSelectedIndex={setSelectedActionIndex}
        overlayRef={actionsOverlayRef}
        onKeyDown={handleActionsOverlayKeyDown}
        onClose={closeActionsOverlay}
        onActionClick={onActionOverlayClick}
      />
    )}
    <LauncherContextMenuOverlay
      contextMenu={contextMenu}
      actions={contextActions}
      selectedIndex={selectedContextActionIndex}
      setSelectedIndex={setSelectedContextActionIndex}
      menuRef={contextMenuRef}
      onKeyDown={handleContextMenuKeyDown}
      onClose={closeContextMenu}
      onActionClick={onContextMenuActionClick}
    />
    </div>
  </main>
);

export default LauncherMainView;
