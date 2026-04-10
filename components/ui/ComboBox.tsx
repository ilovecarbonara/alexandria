"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface ComboBoxOption {
  value: string;
  label: string;
}

interface ComboBoxProps {
  label?: string;
  options: ComboBoxOption[];
  className?: string;
  id?: string;
  value?: string;
  placeholder?: string;
  onChange?: (e: { target: { value: string } }) => void;
}

export function ComboBox({
  label,
  options,
  className = "",
  id,
  value: controlledValue,
  placeholder = "Select…",
  onChange,
}: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const value = controlledValue ?? "";

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? "";

  const filtered =
    query === ""
      ? options
      : options.filter((o) =>
          o.label.toLowerCase().includes(query.toLowerCase()),
        );

  const handleSelect = useCallback(
    (optValue: string) => {
      onChange?.({ target: { value: optValue } });
      setQuery("");
      setOpen(false);
    },
    [onChange],
  );

  // Sync display text when value changes externally (e.g. clear filters)
  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [value, open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
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

      <div className="relative">
        <div
          className={`flex w-full items-center rounded-xs border bg-surface transition-colors ${
            open
              ? "border-accent"
              : "border-border hover:border-white/20"
          } ${className}`}
        >
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={open ? query : selectedLabel}
            placeholder={placeholder}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (filtered.length === 1) {
                  handleSelect(filtered[0].value);
                }
              }
            }}
            onFocus={() => {
              setOpen(true);
              setQuery("");
            }}
            className="w-full bg-transparent px-3 py-2 font-mono text-sm text-white/90 placeholder:text-white/30 focus:outline-none"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (open) {
                setOpen(false);
                setQuery("");
              } else {
                setOpen(true);
                inputRef.current?.focus();
              }
            }}
            className="shrink-0 px-2 text-white/40"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              className={`transition-transform ${open ? "rotate-180" : ""}`}
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
        </div>

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
            {filtered.map((opt) => (
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
            {filtered.length === 0 && (
              <li className="px-3 py-1.5 font-mono text-sm text-white/30">
                No matches
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
