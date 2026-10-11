import React from 'react';

export interface InlineArgumentOption {
  label: string;
  value: string;
}

interface InlineArgumentFieldProps {
  value: string;
  placeholder: string;
  label?: string;
  type?: 'text' | 'password' | 'select';
  options?: InlineArgumentOption[];
  onChange: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => void;
  inputRef?: (el: HTMLInputElement | HTMLSelectElement | null) => void;
}

const FIELD_CLASS = 'sc-primary-inline-argument-field box-border min-h-8 min-w-0 flex-[1_1_128px] border border-[var(--sc-color-surface-stroke)] bg-[var(--sc-color-surface-inset)] px-3 text-[var(--sc-color-text-primary)] placeholder:text-[var(--sc-color-text-tertiary)]';

const InlineArgumentField: React.FC<InlineArgumentFieldProps> = ({
  value,
  placeholder,
  label,
  type = 'text',
  options = [],
  onChange,
  onKeyDown,
  inputRef,
}) => {
  if (type === 'select') {
    return (
      <select
        ref={inputRef}
        aria-label={label || placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        className={FIELD_CLASS}
        style={{ font: 'var(--sc-typography-control)' }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef as ((el: HTMLInputElement | null) => void) | undefined}
      type={type}
      aria-label={label || placeholder}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown as ((event: React.KeyboardEvent<HTMLInputElement>) => void) | undefined}
      className={FIELD_CLASS}
      style={{ font: 'var(--sc-typography-control)' }}
    />
  );
};

export const InlineArgumentOverflowBadge: React.FC<{ count: number }> = ({ count }) => (
  <span className="sc-primary-inline-argument-overflow inline-flex min-h-8 items-center border border-[var(--sc-color-surface-stroke)] bg-[var(--sc-color-surface-inset)] px-2 text-[var(--sc-color-text-secondary)]" style={{ font: 'var(--sc-typography-control)' }} aria-label={`+${count}`}>
    +{count}
  </span>
);

export const InlineArgumentLeadingIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="sc-primary-inline-argument-icon inline-flex shrink-0 items-center justify-center" aria-hidden="true">
    {children}
  </span>
);

export default InlineArgumentField;
