import { useCallback, useRef } from 'react';
import type React from 'react';
import type { CommandInfo, QuickLinkDynamicField } from '../../types/electron';
import type { BrowserSearchResult } from './useBrowserSearch';
import type { CalcResult } from '../smart-calculator';
import type { LauncherContextMenuState } from '../components/LauncherContextMenuOverlay';
import type { QuickLinkDynamicPromptState } from '../components/QuickLinkDynamicPromptOverlay';
import { isBrowserSearchCommand } from '../utils/browser-search-commands';
import { WEB_SEARCH_ROOT_BANG_PREFIX } from '../utils/web-search-bangs';
import { isEditableElement } from '../utils/launcher-misc';
import { LAST_LAUNCHER_QUERY_KEY } from '../utils/constants';
import { getLauncherCommandStableKey, type LauncherIntent } from '../utils/launcher-intent';

function readLauncherQueryHistory(): string[] {
  try {
    const raw = localStorage.getItem(LAST_LAUNCHER_QUERY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
  } catch {
    return [];
  }
}

function applyLauncherHistoryEntry(
  entry: string,
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>,
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>,
  inputRef: React.RefObject<HTMLInputElement>,
): void {
  setSearchQuery(entry);
  setSelectedIndex(0);
  requestAnimationFrame(() => {
    const el = inputRef.current;
    if (!el) return;
    const end = entry.length;
    try { el.setSelectionRange(end, end); } catch {}
  });
}

export type UseLauncherKeyboardControlsOptions = {
  inputRef: React.RefObject<HTMLInputElement>;
  isLauncherModeActiveRef: React.MutableRefObject<boolean>;
  inlineArgumentInputRefs: React.MutableRefObject<(HTMLInputElement | HTMLSelectElement | null)[]>;
  inlineQuickLinkInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;

  displayCommands: CommandInfo[];
  selectedCommand: CommandInfo | null;
  selectedIndex: number;
  selectedFileResultPath: string | null;
  calcOffset: number;
  calcResult: CalcResult | null;

  searchQuery: string;
  launcherIntent: LauncherIntent;
  onSelectResult: (index: number) => void;
  onReturnToAiDefault: () => void;
  canReturnToAiDefault?: boolean;
  onQueryEdited: () => void;
  browserSearchAutoComplete: { completion: string } | null;
  launcherInputValue: string;
  aiAvailable: boolean;
  shouldHideAskAi: boolean;
  isShowingInlineArgumentInputs: boolean;
  selectedInlineExtensionArgumentDefinitions: NonNullable<CommandInfo['commandArgumentDefinitions']>;
  selectedInlineQuickLinkDynamicFields: QuickLinkDynamicField[];
  selectedQuickLinkId: string | null;

  showActions: boolean;
  contextMenu: LauncherContextMenuState | null;
  quickLinkDynamicPrompt: QuickLinkDynamicPromptState | null;
  bookmarkNicknamePrompt: { result: BrowserSearchResult; value: string } | null;
  showAppUninstall: string | null;

  isCompactCollapsed: boolean;

  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  setIsCompactCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setShowActions: React.Dispatch<React.SetStateAction<boolean>>;
  setContextMenu: React.Dispatch<React.SetStateAction<LauncherContextMenuState | null>>;
  setActionsCommand: React.Dispatch<React.SetStateAction<CommandInfo | null>>;
  setSelectedActionIndex: React.Dispatch<React.SetStateAction<number>>;

  startAiChat: (query: string) => void;
  restoreLauncherFocus: () => void;

  handleCommandExecute: (command: CommandInfo) => void | Promise<void>;
  submitBrowserSearch: (
    input: string,
    options?: {
      focusExistingTab?: boolean;
      event?: { altKey?: boolean; numberKey?: string | number | null };
      kind?: CommandInfo['browserResultKind'];
      url?: string;
      sourceProfileId?: string;
      openInSourceProfile?: boolean;
      windowId?: string | number;
      tabId?: string | number;
    }
  ) => void | Promise<boolean>;

  pinToggleForCommand: (command: CommandInfo) => void | Promise<void>;
  disableCommand: (command: CommandInfo) => void | Promise<void>;
  uninstallExtensionCommand: (command: CommandInfo) => void | Promise<void>;
  movePinnedCommand: (command: CommandInfo, direction: 'up' | 'down') => void | Promise<void>;

  showFileResultDetailsByPath: (targetPath: string) => void;
  revealFileResultByPath: (targetPath: string) => void | Promise<void>;
  copyFileResultPath: (targetPath: string) => void | Promise<void>;
  pinToggleForFile: (targetPath: string) => void | Promise<void>;
  copyCommandDeeplink: (command: CommandInfo) => void | Promise<void>;
  openAppUninstall: (appPath: string) => void;

  updateInlineExtensionArgumentValue: (
    command: CommandInfo,
    argumentName: string,
    value: string
  ) => void;
  updateInlineQuickLinkDynamicValue: (
    quickLinkId: string,
    fieldKey: string,
    value: string
  ) => void;
};

export function useLauncherKeyboardControls(
  options: UseLauncherKeyboardControlsOptions
): {
  handleKeyDown: (event: React.KeyboardEvent) => void;
  handleLauncherSearchBlur: () => void;
  handleLauncherInputChange: (value: string) => void;
  copyCalculatorResult: () => void;
  showCompactLauncher: () => void;
  handleInlineExtensionArgumentChange: (argumentName: string, value: string) => void;
  handleInlineQuickLinkDynamicValueChange: (fieldKey: string, value: string) => void;
} {
  const {
    inputRef,
    isLauncherModeActiveRef,
    inlineArgumentInputRefs,
    inlineQuickLinkInputRefs,
    displayCommands,
    selectedCommand,
    selectedIndex,
    selectedFileResultPath,
    calcOffset,
    calcResult,
    searchQuery,
    launcherIntent,
    onSelectResult,
    onReturnToAiDefault,
    onQueryEdited,
    canReturnToAiDefault,
    browserSearchAutoComplete,
    launcherInputValue,
    aiAvailable,
    isShowingInlineArgumentInputs,
    selectedInlineExtensionArgumentDefinitions,
    selectedInlineQuickLinkDynamicFields,
    selectedQuickLinkId,
    showActions,
    contextMenu,
    quickLinkDynamicPrompt,
    bookmarkNicknamePrompt,
    showAppUninstall,
    isCompactCollapsed,
    setSearchQuery,
    setSelectedIndex,
    setIsCompactCollapsed,
    setShowActions,
    setContextMenu,
    setActionsCommand,
    setSelectedActionIndex,
    startAiChat,
    restoreLauncherFocus,
    handleCommandExecute,
    submitBrowserSearch,
    pinToggleForCommand,
    disableCommand,
    uninstallExtensionCommand,
    movePinnedCommand,
    showFileResultDetailsByPath,
    revealFileResultByPath,
    copyFileResultPath,
    pinToggleForFile,
    copyCommandDeeplink,
    openAppUninstall,
    updateInlineExtensionArgumentValue,
    updateInlineQuickLinkDynamicValue,
  } = options;



  // Tracks whether the user has already hit the top boundary at index 0
  // with an empty input — the next Up press fires history recall. We require
  // a "boundary touch" first so coming back to the top via arrow keys doesn't
  // immediately replace the input with the most recent command.
  const recallPrimedRef = useRef(false);

  const moveSelection = useCallback((direction: 'up' | 'down') => {
    const max = displayCommands.length + calcOffset - 1;
    if (max < 0) return;
    if (direction === 'down') {
      onSelectResult(Math.min(selectedIndex + 1, max));
    } else if (selectedIndex > 0) {
      onSelectResult(selectedIndex - 1);
    } else if (selectedIndex === 0 && canReturnToAiDefault) {
      onReturnToAiDefault();
    }
  }, [displayCommands.length, calcOffset, selectedIndex, canReturnToAiDefault, onSelectResult, onReturnToAiDefault]);

  const handleLauncherSearchBlur = useCallback(() => {
    if (!isLauncherModeActiveRef.current) return;
    requestAnimationFrame(() => {
      if (!isLauncherModeActiveRef.current) return;
      if (!document.hasFocus()) return;
      const activeElement = document.activeElement;
      if (activeElement === inputRef.current || isEditableElement(activeElement)) return;
      if (activeElement instanceof Element && activeElement.closest('[data-sc-experience="primary"]')) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      inputRef.current?.focus();
    });
  }, [inputRef, isLauncherModeActiveRef]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showAppUninstall) {
        return;
      }
      if (quickLinkDynamicPrompt) {
        return;
      }
      if (bookmarkNicknamePrompt) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const isSearchInputTarget = target === inputRef.current;
      const queryIsCurrent = launcherIntent.query === searchQuery.trim() &&
        (!inputRef.current || inputRef.current.value === searchQuery);
      const currentIntent = queryIsCurrent && launcherIntent.kind !== 'pending' ? launcherIntent : null;
      const activeCommand = currentIntent?.kind === 'command'
        ? displayCommands.find((command) => command.id === currentIntent.commandId &&
          getLauncherCommandStableKey(command) === currentIntent.stableKey) ?? null
        : null;
      if (e.key === 'Enter' && (e.repeat || e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229)) {
        e.preventDefault();
        return;
      }
      if (target?.closest('[role="dialog"], [role="menu"]')) return;
      if (showActions || contextMenu) {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (showActions) setShowActions(false);
          if (contextMenu) setContextMenu(null);
          restoreLauncherFocus();
        }
        return;
      }
      if (e.metaKey && (e.key === 'k' || e.key === 'K') && !e.repeat) {
        e.preventDefault();
        if (!activeCommand) return;
        setContextMenu(null);
        setActionsCommand(activeCommand);
        setSelectedActionIndex(0);
        setShowActions(true);
        return;
      }
      const activeFilePath = activeCommand ? selectedFileResultPath : null;
      if (e.key !== 'Escape' && !currentIntent) {
        if (e.key === 'Enter' || (e.metaKey && /^[1-9]$/.test(e.key))) e.preventDefault();
        return;
      }
      if (activeFilePath && e.metaKey && !e.shiftKey && !e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        showFileResultDetailsByPath(activeFilePath);
        return;
      }
      if (activeFilePath && e.metaKey && e.key === 'Enter') {
        e.preventDefault();
        void revealFileResultByPath(activeFilePath);
        return;
      }
      if (activeFilePath && e.metaKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        void copyFileResultPath(activeFilePath);
        return;
      }
      if (activeFilePath && e.metaKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        void pinToggleForFile(activeFilePath);
        return;
      }
      if (!activeFilePath && activeCommand && e.metaKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        void pinToggleForCommand(activeCommand);
        return;
      }
      if (!activeFilePath && activeCommand && e.metaKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        void disableCommand(activeCommand);
        return;
      }
      if (
        !activeFilePath &&
        e.metaKey &&
        e.shiftKey &&
        (e.key === 'L' || e.key === 'l') &&
        activeCommand?.deeplink
      ) {
        e.preventDefault();
        void copyCommandDeeplink(activeCommand);
        return;
      }
      if (!activeFilePath && e.metaKey && (e.key === 'Backspace' || e.key === 'Delete')) {
        if (activeCommand?.category === 'extension') {
          e.preventDefault();
          void uninstallExtensionCommand(activeCommand);
          return;
        }
      }
      // Ctrl+X: Uninstall Application (for app commands and .app file results)
      if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && (e.key === 'x' || e.key === 'X')) {
        const appPath = activeFilePath?.endsWith('.app')
          ? activeFilePath
          : (activeCommand?.category === 'app' && activeCommand?.path?.endsWith('.app'))
            ? activeCommand.path
            : null;
        if (appPath) {
          e.preventDefault();
          openAppUninstall(appPath);
          return;
        }
      }
      if (!activeFilePath && activeCommand && e.metaKey && e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        void movePinnedCommand(activeCommand, 'up');
        return;
      }
      if (!activeFilePath && activeCommand && e.metaKey && e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        void movePinnedCommand(activeCommand, 'down');
        return;
      }

      // Number shortcuts refer to displayed rows, including the calculator row.
      if (e.metaKey && !e.shiftKey && !e.ctrlKey && !e.altKey && e.key >= '1' && e.key <= '9') {
        const idx = Number(e.key) - 1;
        if (idx === 0 && calcOffset && calcResult) {
          e.preventDefault();
          navigator.clipboard.writeText(calcResult.result);
          window.electron.hideWindow();
          return;
        }
        const numberedCommand = displayCommands[idx - calcOffset];
        if (numberedCommand) {
          e.preventDefault();
          handleCommandExecute(numberedCommand);
          return;
        }
      }

      if (e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.key >= '1' && e.key <= '9') {
        const selected = activeCommand;
        if (selected && isBrowserSearchCommand(selected) && !selected.id.startsWith(WEB_SEARCH_ROOT_BANG_PREFIX)) {
          e.preventDefault();
          void submitBrowserSearch(String(selected.browserActionInput || launcherInputValue).trim(), {
            focusExistingTab: false,
            event: { altKey: true, numberKey: e.key },
            kind: selected.browserResultKind,
            url: selected.browserUrl,
            sourceProfileId: selected.browserSourceProfileId,
            openInSourceProfile: selected.browserNicknameMatch === true,
            windowId: selected.browserWindowId,
            tabId: selected.browserTabId,
          });
          return;
        }
      }

      switch (e.key) {
        case 'Tab':
          if (isSearchInputTarget && isShowingInlineArgumentInputs) {
            e.preventDefault();
            if (selectedInlineExtensionArgumentDefinitions.length > 0) {
              const targetIndex = e.shiftKey
                ? selectedInlineExtensionArgumentDefinitions.length - 1
                : 0;
              inlineArgumentInputRefs.current[targetIndex]?.focus();
              return;
            }
            if (selectedInlineQuickLinkDynamicFields.length > 0) {
              const targetIndex = e.shiftKey
                ? selectedInlineQuickLinkDynamicFields.length - 1
                : 0;
              inlineQuickLinkInputRefs.current[targetIndex]?.focus();
              return;
            }
          }
          if (isSearchInputTarget && browserSearchAutoComplete?.completion && !e.shiftKey) {
            e.preventDefault();
            const completion = browserSearchAutoComplete.completion;
            onQueryEdited();
            setSearchQuery(completion);
            requestAnimationFrame(() => {
              const el = inputRef.current;
              if (!el) return;
              const end = completion.length;
              try {
                el.setSelectionRange(end, end);
              } catch {}
            });
            return;
          }
          if (isSearchInputTarget && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey &&
              aiAvailable && searchQuery.trim() && currentIntent) {
            e.preventDefault();
            startAiChat(currentIntent.query);
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          recallPrimedRef.current = false;
          if (isCompactCollapsed && !searchQuery.trim()) {
            setIsCompactCollapsed(false);
            break;
          }
          // History forward-cycle: if input matches a history entry and
          // selection is at the top, Down goes to the more recent entry (or
          // empties the input when already at the most recent). Otherwise
          // fall through to normal selection movement.
          if (isSearchInputTarget && selectedIndex === 0 && searchQuery.length > 0) {
            const history = readLauncherQueryHistory();
            const currentIndex = history.indexOf(searchQuery);
            if (currentIndex === 0) {
              onQueryEdited();
              setSearchQuery('');
              setSelectedIndex(0);
              return;
            }
            if (currentIndex > 0) {
              onQueryEdited();
              applyLauncherHistoryEntry(history[currentIndex - 1], setSearchQuery, setSelectedIndex, inputRef);
              return;
            }
          }
          moveSelection('down');
          break;

        case 'ArrowUp':
          e.preventDefault();
          // Shell-history style recall: at the top of the list, Up cycles
          // backward through recently launched commands. To avoid hijacking
          // a stray Up arrow the user pressed while just navigating back to
          // the top, we require a "boundary touch" first — one Up at index 0
          // primes recall, the second Up actually fires it. Active history
          // navigation (input already shows a history entry) keeps cycling
          // without re-priming.
          if (selectedIndex === 0 && canReturnToAiDefault) {
            recallPrimedRef.current = false;
            onReturnToAiDefault();
            return;
          }
          if (isSearchInputTarget && selectedIndex === 0) {
            const history = readLauncherQueryHistory();
            if (history.length > 0) {
              if (searchQuery.length > 0) {
                const currentIndex = history.indexOf(searchQuery);
                if (currentIndex >= 0 && currentIndex + 1 < history.length) {
                  onQueryEdited();
                  applyLauncherHistoryEntry(history[currentIndex + 1], setSearchQuery, setSelectedIndex, inputRef);
                  return;
                }
              } else if (recallPrimedRef.current) {
                onQueryEdited();
                applyLauncherHistoryEntry(history[0], setSearchQuery, setSelectedIndex, inputRef);
                recallPrimedRef.current = false;
                return;
              } else {
                // Boundary touch — next Up will fire recall.
                recallPrimedRef.current = true;
                return;
              }
            }
          }
          recallPrimedRef.current = false;
          moveSelection('up');
          break;

        case 'Enter':
          e.preventDefault();
          if (!currentIntent) break;
          if (currentIntent.kind === 'ai') {
            if (!e.metaKey && !e.altKey && !e.ctrlKey && !e.shiftKey && aiAvailable) {
              startAiChat(currentIntent.query);
            }
          } else if (currentIntent.kind === 'calculator' && calcResult) {
            navigator.clipboard.writeText(calcResult.result);
            window.electron.hideWindow();
          } else if (currentIntent.kind === 'command' && activeCommand) {
            if (activeFilePath && e.metaKey) {
              void revealFileResultByPath(activeFilePath);
            } else if (isBrowserSearchCommand(activeCommand) && activeCommand.id !== 'browser-search-action-show-all' &&
                !activeCommand.id.startsWith(WEB_SEARCH_ROOT_BANG_PREFIX)) {
              const focusExistingTab = activeCommand.browserResultKind === 'open-tab' && e.metaKey && !e.altKey;
              void submitBrowserSearch(String(activeCommand.browserActionInput || launcherInputValue).trim(), {
                focusExistingTab,
                event: { altKey: e.altKey, numberKey: null },
                kind: activeCommand.browserResultKind,
                url: activeCommand.browserUrl,
                sourceProfileId: activeCommand.browserSourceProfileId,
                openInSourceProfile: activeCommand.browserNicknameMatch === true,
                windowId: activeCommand.browserWindowId,
                tabId: activeCommand.browserTabId,
              });
            } else {
              handleCommandExecute(activeCommand);
            }
          }
          break;

        case 'Escape':
          e.preventDefault();
          if (contextMenu) {
            setContextMenu(null);
            return;
          }
          if (showActions) {
            setShowActions(false);
            return;
          }
          if (searchQuery.length > 0) {
            onQueryEdited();
            setSearchQuery('');
            setSelectedIndex(0);
            setIsCompactCollapsed(true);
            return;
          }
          if (!isCompactCollapsed) {
            setIsCompactCollapsed(true);
            return;
          }
          void window.electron.dismissLauncherSurface();
          break;
      }
    },
    [
      moveSelection,
      displayCommands,
      selectedIndex,
      searchQuery,
      aiAvailable,
      isShowingInlineArgumentInputs,
      selectedInlineExtensionArgumentDefinitions,
      selectedInlineQuickLinkDynamicFields,
      launcherIntent,
      startAiChat,
      calcResult,
      calcOffset,
      pinToggleForCommand,
      disableCommand,
      uninstallExtensionCommand,
      movePinnedCommand,
      copyCommandDeeplink,
      selectedFileResultPath,
      showFileResultDetailsByPath,
      revealFileResultByPath,
      copyFileResultPath,
      pinToggleForFile,
      openAppUninstall,
      onSelectResult,
      onReturnToAiDefault,
      onQueryEdited,
      canReturnToAiDefault,
      contextMenu,
      showActions,
      quickLinkDynamicPrompt,
      bookmarkNicknamePrompt,
      showAppUninstall,
      isCompactCollapsed,
      inputRef,
      inlineArgumentInputRefs,
      inlineQuickLinkInputRefs,
      setActionsCommand,
      setContextMenu,
      setIsCompactCollapsed,
      setSearchQuery,
      setSelectedActionIndex,
      setSelectedIndex,
      setShowActions,
      restoreLauncherFocus,
      submitBrowserSearch,
      handleCommandExecute,
      launcherInputValue,
    ]
  );

  const handleLauncherInputChange = useCallback((value: string) => {
    onQueryEdited();
    setSearchQuery(value);
    // Typing invalidates the "press Up twice from index 0" priming.
    recallPrimedRef.current = false;

    if (value.length > 0 && isCompactCollapsed) {
      setIsCompactCollapsed(false);
    } else if (value.length === 0 && !isCompactCollapsed) {
      setIsCompactCollapsed(true);
    }
  }, [
    isCompactCollapsed,
    setIsCompactCollapsed,
    onQueryEdited,
    setSearchQuery,
  ]);

  const copyCalculatorResult = useCallback(() => {
    if (!calcResult) return;
    navigator.clipboard.writeText(calcResult.result);
    window.electron.hideWindow();
  }, [calcResult]);

  const showCompactLauncher = useCallback(() => {
    setIsCompactCollapsed(false);
  }, [setIsCompactCollapsed]);

  const handleInlineExtensionArgumentChange = useCallback((argumentName: string, value: string) => {
    if (!selectedCommand) return;
    updateInlineExtensionArgumentValue(selectedCommand, argumentName, value);
  }, [selectedCommand, updateInlineExtensionArgumentValue]);

  const handleInlineQuickLinkDynamicValueChange = useCallback((fieldKey: string, value: string) => {
    if (!selectedQuickLinkId) return;
    updateInlineQuickLinkDynamicValue(selectedQuickLinkId, fieldKey, value);
  }, [selectedQuickLinkId, updateInlineQuickLinkDynamicValue]);

  return {
    handleKeyDown,
    handleLauncherSearchBlur,
    handleLauncherInputChange,
    copyCalculatorResult,
    showCompactLauncher,
    handleInlineExtensionArgumentChange,
    handleInlineQuickLinkDynamicValueChange,
  };
}
