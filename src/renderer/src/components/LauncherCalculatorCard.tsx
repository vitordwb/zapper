import React from 'react';
import { Copy } from '@phosphor-icons/react';
import type { CalcResult } from '../smart-calculator';

type LauncherCalculatorCardProps = {
  result: CalcResult;
  optionId: string;
  selected: boolean;
  selectionInactive?: boolean;
  itemRef: (el: HTMLDivElement | null) => void;
  onCopy: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LauncherCalculatorCard: React.FC<LauncherCalculatorCardProps> = ({
  result,
  optionId,
  selected,
  selectionInactive = false,
  itemRef,
  onCopy,
  t,
}) => (
  <div
    id={optionId}
    ref={itemRef}
    role="option"
    aria-selected={selected}
    aria-label={`${t(`launcher.calculator.kinds.${result.kind}`)}, ${result.inputLabel}: ${result.input}, ${result.resultLabel}: ${result.result}, ${t('launcher.calculator.copy')}`}
    data-sc-selection={selected ? (selectionInactive ? 'inactive' : 'active') : undefined}
    className={`mb-[var(--sc-space-8)] cursor-pointer px-[var(--sc-spacing-result-inline)] py-[var(--sc-space-12)] text-[var(--sc-color-text-primary)] [-webkit-app-region:no-drag] ${selected ? selectionInactive ? 'bg-[var(--sc-color-selection-inactive)]' : 'bg-[var(--sc-color-selection-background)]' : 'hover:bg-[var(--sc-color-hover-background)]'}`}
    style={{ borderRadius: 'var(--sc-radius-result)' }}
    onClick={onCopy}
  >
    <div className="mb-[var(--sc-space-12)] flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[length:.8125rem] leading-[1.125rem]">
      <span className="font-medium text-[var(--sc-color-text-secondary)]">{t(`launcher.calculator.kinds.${result.kind}`)}</span>
      <span className="inline-flex items-center gap-1.5 text-[var(--sc-color-text-tertiary)]">
        <Copy size={16} aria-hidden="true" />
        {t('launcher.calculator.copy')}
      </span>
    </div>
    <div className="grid gap-x-[var(--sc-space-16)] gap-y-[var(--sc-space-12)]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))' }}>
      <div className="min-w-0">
        <div className="truncate text-[length:.8125rem] leading-[1.125rem] text-[var(--sc-color-text-tertiary)]">{result.inputLabel}</div>
        <div className="mt-[var(--sc-space-2)] break-words text-[length:1rem] font-medium leading-5 text-[var(--sc-color-text-secondary)]">{result.input}</div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[length:.8125rem] leading-[1.125rem] text-[var(--sc-color-text-tertiary)]">{result.resultLabel}</div>
        <div className="mt-[var(--sc-space-2)] break-words text-[length:1rem] font-medium leading-5">{result.result}</div>
      </div>
    </div>
  </div>
);

export default LauncherCalculatorCard;
