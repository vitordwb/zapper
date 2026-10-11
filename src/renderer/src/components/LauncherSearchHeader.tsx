import React, { useId } from 'react';
import { CaretDown, Sparkle, X } from '@phosphor-icons/react';
import type { CommandInfo, QuickLinkDynamicField } from '../../types/electron';
import InlineArgumentField, { InlineArgumentLeadingIcon, InlineArgumentOverflowBadge } from './InlineArgumentField';

type LauncherSearchHeaderProps = {
  inlineArgumentInputRefs: React.MutableRefObject<(HTMLInputElement | HTMLSelectElement | null)[]>;
  inlineQuickLinkInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  inputRef: React.RefObject<HTMLInputElement>;
  placeholder: string;
  value: string;
  autocompleteSuffix?: string;
  onInputChange: (value: string) => void;
  onBlur: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
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
  showMore?: boolean;
  onShowMore?: () => void;
  intentLabel?: string;
  intentDescription?: string;
  inputLabel?: string;
  listboxId?: string;
  activeOptionId?: string;
  resultsExpanded?: boolean;
  busy?: boolean;
  tabAsksAi?: boolean;
  onOpenAiSettings?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LauncherSearchHeader: React.FC<LauncherSearchHeaderProps> = ({
  inlineArgumentInputRefs,
  inlineQuickLinkInputRefs,
  inputRef,
  placeholder,
  value,
  autocompleteSuffix,
  onInputChange,
  onBlur,
  onKeyDown,
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
  showMore = false,
  onShowMore,
  intentLabel,
  intentDescription,
  inputLabel,
  listboxId,
  activeOptionId,
  resultsExpanded = false,
  busy = false,
  tabAsksAi = false,
  onOpenAiSettings,
  t,
}) => {
  const descriptionId = useId();
  const extensionArguments = selectedInlineExtensionArgumentDefinitions || [];
  const hasInlineArguments = extensionArguments.length > 0 || selectedInlineQuickLinkDynamicFields.length > 0;
  const showAskAi = Boolean(searchQuery && aiAvailable && !shouldHideAskAi);
  const argumentKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    index: number,
    total: number,
    refs: React.MutableRefObject<(HTMLInputElement | HTMLSelectElement | null)[]>
  ) => {
    if (event.key !== 'Tab') {
      onKeyDown(event);
      return;
    }
    event.preventDefault();
    const nextIndex = index + (event.shiftKey ? -1 : 1);
    if (nextIndex >= 0 && nextIndex < total) refs.current[nextIndex]?.focus();
    else inputRef.current?.focus();
  };

  return (
    <div className="sc-primary-search-header min-w-0 px-[var(--sc-spacing-search-inline)]" aria-busy={busy}>
      <div className="sc-primary-search-query flex min-h-[var(--sc-layout-search-height)] min-w-0 items-center gap-[var(--sc-space-12)]">
        <div className="relative min-w-0 flex-1">
          {autocompleteSuffix && value && !hasInlineArguments ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre font-[var(--sc-typography-search)]">
              <span className="invisible">{value}</span>
              <span className="text-[var(--sc-color-text-tertiary)]">{autocompleteSuffix}</span>
            </div>
          ) : null}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-label={inputLabel || t('launcher.searchLabel')}
            aria-controls={listboxId}
            aria-expanded={resultsExpanded}
            aria-activedescendant={resultsExpanded ? activeOptionId : undefined}
            aria-describedby={descriptionId}
            aria-busy={busy}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onInputChange(event.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            className="sc-primary-search-input block w-full min-w-0 border-0 bg-transparent p-0 text-[var(--sc-color-text-primary)] outline-none placeholder:text-[var(--sc-color-text-tertiary)]"
            style={{ font: 'var(--sc-typography-search)' }}
            autoFocus
          />
        </div>
        {intentLabel ? (
          <span className="sc-primary-search-intent min-w-0 max-w-[35%] shrink truncate text-[var(--sc-color-text-secondary)]" style={{ font: 'var(--sc-typography-control)' }} title={intentDescription || intentLabel} aria-hidden="true">
            {intentLabel}
          </span>
        ) : null}
        <div className="sc-primary-search-actions flex shrink-0 items-center gap-[var(--sc-space-4)]">
          {showMore && onShowMore ? (
            <button type="button" onClick={onShowMore} aria-label={t('launcher.compact.showMore')} title={t('launcher.compact.showMore')} className="sc-primary-search-action inline-flex min-h-9 min-w-9 items-center justify-center border-0 bg-transparent text-[var(--sc-color-text-secondary)] hover:bg-[var(--sc-color-hover-background)]">
              <CaretDown size={18} aria-hidden="true" />
            </button>
          ) : null}
          {showAskAi ? (
            <button type="button" onClick={onAskAi} disabled={busy} aria-label={t('launcher.intent.askAi')} title={t('launcher.intent.askAi')} className="sc-primary-search-action inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 border-0 bg-transparent px-2 text-[var(--sc-color-text-secondary)] hover:bg-[var(--sc-color-hover-background)] disabled:opacity-[var(--sc-opacity-disabled)]" style={{ font: 'var(--sc-typography-control)' }}>
              <Sparkle size={18} aria-hidden="true" />
              <span className="sc-primary-search-ask-label">{t('launcher.intent.askAi')}</span>
              {tabAsksAi ? <kbd className="sc-primary-search-tab-hint" aria-hidden="true">Tab</kbd> : null}
            </button>
          ) : null}
          {searchQuery && !aiAvailable && onOpenAiSettings ? (
            <div className="flex min-w-0 items-center gap-1 text-[var(--sc-color-text-secondary)]" style={{ font: 'var(--sc-typography-control)' }}>
              <span role="status" className="max-w-28 truncate" title={t('launcher.inlineAi.unavailable')}>{t('launcher.inlineAi.unavailable')}</span>
              <button type="button" onClick={onOpenAiSettings} aria-label={t('launcher.inlineAi.openSettings')} title={t('launcher.inlineAi.openSettings')} className="sc-primary-search-action inline-flex min-h-9 items-center justify-center gap-1.5 border-0 bg-transparent px-2 hover:bg-[var(--sc-color-hover-background)]">
                <Sparkle size={18} aria-hidden="true" />
                <span className="sc-primary-search-ask-label">{t('launcher.inlineAi.openSettings')}</span>
              </button>
            </div>
          ) : null}
          {searchQuery ? (
            <button type="button" onClick={onClearSearch} aria-label={t('common.clear')} title={t('common.clear')} className="sc-primary-search-action inline-flex min-h-9 min-w-9 items-center justify-center border-0 bg-transparent text-[var(--sc-color-text-secondary)] hover:bg-[var(--sc-color-hover-background)]">
              <X size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
      <span id={descriptionId} className="sr-only">{intentDescription || intentLabel || (busy ? t('launcher.intent.updating') : '')}</span>
      {hasInlineArguments ? (
        <div className="sc-primary-search-arguments flex min-w-0 flex-wrap items-center gap-[var(--sc-space-8)] pb-[var(--sc-space-16)]">
          {selectedInlineArgumentLeadingIcon ? <InlineArgumentLeadingIcon>{selectedInlineArgumentLeadingIcon}</InlineArgumentLeadingIcon> : null}
          {extensionArguments.length > 0 ? (
            <>
              {extensionArguments.map((definition, index) => (
                <InlineArgumentField
                  key={`inline-arg-${definition.name}`}
                  inputRef={(element) => { inlineArgumentInputRefs.current[index] = element; }}
                  value={selectedInlineExtensionArgumentValues[definition.name] || ''}
                  placeholder={definition.placeholder || definition.title || definition.name}
                  type={definition.type === 'dropdown' ? 'select' : definition.type === 'password' ? 'password' : 'text'}
                  options={(definition.data || []).map((option) => ({ value: String(option?.value || ''), label: String(option?.title || option?.value || '') }))}
                  onChange={(nextValue) => onInlineExtensionArgumentChange(definition.name, nextValue)}
                  onKeyDown={(event) => argumentKeyDown(event, index, extensionArguments.length, inlineArgumentInputRefs)}
                />
              ))}
              {hasSelectedExtensionOverflowArguments ? <InlineArgumentOverflowBadge count={selectedExtensionOverflowCount} /> : null}
            </>
          ) : (
            <>
              {selectedInlineQuickLinkDynamicFields.map((field, index) => (
                <InlineArgumentField
                  key={`inline-quicklink-${selectedQuickLinkId || 'none'}-${field.key}`}
                  inputRef={(element) => { inlineQuickLinkInputRefs.current[index] = element as HTMLInputElement | null; }}
                  value={selectedInlineQuickLinkDynamicValues[field.key] || ''}
                  placeholder={field.defaultValue || field.name}
                  label={field.name}
                  onChange={(nextValue) => onInlineQuickLinkDynamicValueChange(field.key, nextValue)}
                  onKeyDown={(event) => argumentKeyDown(event, index, selectedInlineQuickLinkDynamicFields.length, inlineQuickLinkInputRefs)}
                />
              ))}
              {hasSelectedQuickLinkOverflowDynamicFields ? <InlineArgumentOverflowBadge count={selectedQuickLinkOverflowCount} /> : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default LauncherSearchHeader;
