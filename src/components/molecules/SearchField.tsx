import { useId, type ReactNode, type Ref } from 'react';
import { Icon } from '../atoms/Icon';
import './SearchField.css';

export interface SearchFieldProps {
  /** Visible label above the field. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Help text under the field (linked with aria-describedby). */
  hint?: ReactNode;
  /** Keyboard shortcut shown at the end of an empty field on wide screens, e.g. "Ctrl K". */
  shortcut?: string;
  /** Accessible name of the clear button. */
  clearLabel?: string;
  maxLength?: number;
  size?: 'md' | 'lg';
  ref?: Ref<HTMLInputElement>;
  className?: string;
}

/**
 * Search input with a visible label, a search icon, an optional shortcut hint and a clear
 * button. The caller decides what the text matches (Rodemap folds Vietnamese diacritics).
 */
export function SearchField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  shortcut,
  clearLabel = 'Xóa từ khóa',
  maxLength,
  size = 'md',
  ref,
  className,
}: SearchFieldProps) {
  const id = useId();
  const inputId = `${id}-input`;
  const hintId = `${id}-hint`;
  const classes = ['search-field', `search-field--${size}`, className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      <label className="search-field__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="search-field__control">
        <Icon name="search" className="search-field__icon" />
        <input
          ref={ref}
          id={inputId}
          className="search-field__input"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-describedby={hint === undefined ? undefined : hintId}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
        {value === '' ? (
          shortcut === undefined ? null : (
            <kbd className="search-field__kbd" aria-hidden="true">
              {shortcut}
            </kbd>
          )
        ) : (
          <button
            type="button"
            className="search-field__clear"
            aria-label={clearLabel}
            title={clearLabel}
            onClick={() => {
              onChange('');
              document.getElementById(inputId)?.focus();
            }}
          >
            <Icon name="x" />
          </button>
        )}
      </div>
      {hint === undefined ? null : (
        <p id={hintId} className="search-field__hint">
          {hint}
        </p>
      )}
    </div>
  );
}
