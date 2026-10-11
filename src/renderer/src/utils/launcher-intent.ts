import type { CommandInfo } from '../../types/electron';
import { isBrowserUrlInput } from './browser-input-resolver';
import { isPathLikeLauncherFileQuery } from './launcher-file-results';
import type { RootSearchCandidate } from './root-search-ranking';
import { isRootResultPromotionCandidate } from './root-search-sections';

export const LAUNCHER_CALCULATOR_STABLE_KEY = 'calculator';

export type LauncherIntent =
  | { kind: 'pending'; query: string; reason: 'model' | 'files' | 'selection-removed' }
  | { kind: 'none'; query: string }
  | { kind: 'calculator'; query: string }
  | { kind: 'command'; query: string; commandId: string; stableKey: string }
  | { kind: 'ai'; query: string };

export type LauncherIntentInput = {
  rawQuery: string;
  modelQuery: string;
  displayCommands: readonly CommandInfo[];
  rootRankedCandidates: readonly RootSearchCandidate[];
  calculatorAvailable: boolean;
  explicitSelection: { query: string; stableKey: string } | null;
  selectionRemoved: boolean;
  fileStatus: { query: string; status: 'idle' | 'pending' | 'ready' | 'error' };
  aiAvailable: boolean;
  bangActive: boolean;
  urlInput?: boolean;
  pathInput?: boolean;
  inlineArgumentsActive: boolean;
};

export function getLauncherCommandStableKey(command: CommandInfo): string {
  return String(command.rootSearchStableKey || command.id);
}

/** Resolves the action for the current query, not for a previous deferred/search snapshot. */
export function resolveLauncherIntent(input: LauncherIntentInput): LauncherIntent {
  const { rawQuery, modelQuery, displayCommands, rootRankedCandidates } = input;
  const query = rawQuery.trim();
  if (rawQuery !== modelQuery) return { kind: 'pending', query, reason: 'model' };
  if (input.selectionRemoved) return { kind: 'pending', query, reason: 'selection-removed' };

  const commandIntent = (command: CommandInfo): LauncherIntent => ({
    kind: 'command', query, commandId: command.id, stableKey: getLauncherCommandStableKey(command),
  });
  const selected = input.explicitSelection;
  if (selected && selected.query === rawQuery) {
    if (selected.stableKey === LAUNCHER_CALCULATOR_STABLE_KEY && input.calculatorAvailable) {
      return { kind: 'calculator', query };
    }
    const command = displayCommands.find((item) => getLauncherCommandStableKey(item) === selected.stableKey);
    if (command) return commandIntent(command);
    return { kind: 'pending', query, reason: 'selection-removed' };
  }

  if (input.calculatorAvailable) return { kind: 'calculator', query };
  const first = displayCommands[0];
  const localInput = input.bangActive || (input.urlInput ?? isBrowserUrlInput(query)) ||
    (input.pathInput ?? isPathLikeLauncherFileQuery(query)) || input.inlineArgumentsActive;
  if (localInput) return first ? commandIntent(first) : { kind: 'none', query };
  if (!query) return first ? commandIntent(first) : { kind: 'none', query };

  // Only a candidate belonging to a currently displayed row can protect its action.
  // Synthetic direct-search rows are never ranked candidates and cannot protect AI.
  const protectedKeys = new Set(rootRankedCandidates
    .filter((candidate) => candidate.source !== 'direct-search' &&
      (candidate.isProtectedIntentMatch || isRootResultPromotionCandidate(candidate, query)))
    .map((candidate) => candidate.stableKey));
  if (first && displayCommands.some((command) => protectedKeys.has(getLauncherCommandStableKey(command)))) {
    return commandIntent(first);
  }
  if (input.aiAvailable && input.fileStatus.query === rawQuery && input.fileStatus.status === 'pending') {
    return { kind: 'pending', query, reason: 'files' };
  }
  if (input.aiAvailable) return { kind: 'ai', query };
  return first ? commandIntent(first) : { kind: 'none', query };
}
