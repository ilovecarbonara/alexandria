"use client";

import { useRef, useState, useEffect, useCallback, useId } from "react";

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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reactId = useId();
  const listboxId = `${id ?? reactId}-listbox`;
  const optionId = (idx: number) => `${listboxId}-opt-${idx}`;

  const value = controlledValue ?? "";

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? "";

  const filtered =
    query === ""
      ? options
      : options.filter((o) =>
          o.label.toLowerCase().includes(query.toLowerCase()),
        );

  // Items in the listbox: index 0 is the placeholder/clear option, then filtered items.
  const itemCount = filtered.length + 1;

  const handleSelect = useCallback(
    (optValue: string) => {
      onChange?.({ target: { value: optValue } });
      setQuery("");
      setOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange],
  );

  // Sync display text when value changes externally (e.g. clear filters)
  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlightedIndex(-1);
    }
  }, [value, open]);

  // Reset highlight when query changes (filtered list shifts).
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query]);

  // Scroll highlighted option into view.
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `#${CSS.escape(optionId(highlightedIndex))}`,
    );
    el?.scrollIntoView({ block: "nearest" });
    // optionId is a stable closure of listboxId; eslint noise expected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedIndex]);

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
        setHighlightedIndex(-1);
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
        setHighlightedIndex(-1);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const activeDescendant =
    open && highlightedIndex >= 0 ? optionId(highlightedIndex) : undefined;

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
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={activeDescendant}
            value={open ? query : selectedLabel}
            placeholder={placeholder}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                if (!open) {
                  setOpen(true);
                  return;
                }
                setHighlightedIndex((i) => (i + 1) % itemCount);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (!open) {
                  setOpen(true);
                  return;
                }
                setHighlightedIndex((i) =>
                  i <= 0 ? itemCount - 1 : i - 1,
                );
              } else if (e.key === "Home") {
                if (open) {
                  e.preventDefault();
                  setHighlightedIndex(0);
                }
              } else if (e.key === "End") {
                if (open) {
                  e.preventDefault();
                  setHighlightedIndex(itemCount - 1);
                }
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (open && highlightedIndex >= 0) {
                  if (highlightedIndex === 0) {
                    handleSelect("");
                  } else {
                    handleSelect(filtered[highlightedIndex - 1].value);
                  }
                } else if (filtered.length === 1) {
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
            aria-label={open ? "Close options" : "Open options"}
            onClick={() => {
              if (open) {
                setOpen(false);
                setQuery("");
                setHighlightedIndex(-1);
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
              aria-hidden="true"
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
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xs border border-border bg-surface py-1 shadow-lg shadow-black/40"
          >
            <li
              id={optionId(0)}
              role="option"
              aria-selected={value === ""}
            >
              <button
                type="button"
                tabIndex={-1}
                onMouseEnter={() => setHighlightedIndex(0)}
                onClick={() => handleSelect("")}
                className={`block w-full px-3 py-1.5 text-left font-mono text-sm transition-colors ${
                  highlightedIndex === 0
                    ? "bg-white/10 text-white/90"
                    : value === ""
                      ? "bg-accent/15 text-accent"
                      : "text-white/50 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                {placeholder}
              </button>
            </li>
            {filtered.map((opt, idx) => {
              const itemIdx = idx + 1;
              const isHighlighted = highlightedIndex === itemIdx;
              const isSelected = value === opt.value;
              return (
                <li
                  key={opt.value}
                  id={optionId(itemIdx)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseEnter={() => setHighlightedIndex(itemIdx)}
                    onClick={() => handleSelect(opt.value)}
                    className={`block w-full px-3 py-1.5 text-left font-mono text-sm transition-colors ${
                      isHighlighted
                        ? "bg-white/10 text-white/90"
                        : isSelected
                          ? "bg-accent/15 text-accent"
                          : "text-white/90 hover:bg-white/5"
                    }`}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
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
