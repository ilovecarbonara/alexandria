"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  options: SelectOption[];
  className?: string;
  id?: string;
  name?: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onChange?: (e: { target: { value: string } }) => void;
}

export function Select({
  label,
  error,
  options,
  className = "",
  id,
  name,
  value: controlledValue,
  required,
  disabled,
  placeholder = "Select…",
  onChange,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const value = controlledValue ?? internalValue;
  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? placeholder;

  const handleSelect = useCallback(
    (optValue: string) => {
      if (controlledValue === undefined) setInternalValue(optValue);
      onChange?.({ target: { value: optValue } });
      setOpen(false);
    },
    [controlledValue, onChange],
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-sm text-white/60 font-mono">
          {label}
        </label>
      )}

      {/* Hidden native select for form submission */}
      {name && (
        <select
          name={name}
          value={value}
          required={required}
          tabIndex={-1}
          aria-hidden
          onChange={() => {}}
          className="sr-only"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      <div className="relative">
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={`flex w-full items-center justify-between rounded-xs border bg-surface px-3 py-2 text-left font-mono text-sm transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            open
              ? "border-accent"
              : error
                ? "border-dispute"
                : "border-border hover:border-white/20"
          } ${value ? "text-white/90" : "text-white/30"} ${className}`}
        >
          <span className="truncate">{selectedLabel}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            className={`ml-2 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open && (
          <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xs border border-border bg-surface py-1 shadow-lg shadow-black/40">
            <li>
              <button
                type="button"
                onClick={() => handleSelect("")}
                className={`block w-full px-3 py-1.5 text-left font-mono text-sm transition-colors ${
                  value === ""
                    ? "bg-accent/15 text-accent"
                    : "text-white/50 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                {placeholder}
              </button>
            </li>
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`block w-full px-3 py-1.5 text-left font-mono text-sm transition-colors ${
                    value === opt.value
                      ? "bg-accent/15 text-accent"
                      : "text-white/90 hover:bg-white/5"
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <span className="text-xs text-dispute font-mono">{error}</span>}
    </div>
  );
}
