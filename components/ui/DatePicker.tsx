"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface DatePickerProps {
  label?: string;
  value?: string; // "YYYY-MM-DD"
  placeholder?: string;
  onChange?: (value: string) => void;
  className?: string;
  id?: string;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

function formatDisplay(s: string) {
  const { year, month, day } = parseDate(s);
  return `${MONTHS[month].slice(0, 3)} ${day}, ${year}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function DatePicker({
  label,
  value = "",
  placeholder = "Select date…",
  onChange,
  className = "",
  id,
}: DatePickerProps) {
  const today = new Date();
  const initial = value
    ? parseDate(value)
    : { year: today.getFullYear(), month: today.getMonth(), day: 0 };

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [prevValue, setPrevValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync view to value when it changes externally.
  // Per React docs, adjusting state during render based on a changed prop
  // is preferred over a useEffect for derived state.
  if (value !== prevValue) {
    setPrevValue(value);
    if (value) {
      const { year, month } = parseDate(value);
      setViewYear(year);
      setViewMonth(month);
    }
  }

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

  const handleSelect = useCallback(
    (day: number) => {
      onChange?.(toDateStr(viewYear, viewMonth, day));
      setOpen(false);
    },
    [viewYear, viewMonth, onChange],
  );

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const selectedStr = value || "";

  return (
    <div className={`flex flex-col gap-1 ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-sm text-ink-muted">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          id={id}
          onClick={() => setOpen((o) => !o)}
          className={`flex w-full items-center justify-between rounded-md border bg-surface px-3 py-2 text-left text-sm transition-colors focus:outline-none ${
            open ? "border-primary" : "border-border hover:border-border"
          } ${value ? "text-ink" : "text-ink-subtle"}`}>
          <span className="truncate">
            {value ? formatDisplay(value) : placeholder}
          </span>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-64 rounded-md border border-border bg-surface p-3 shadow-pop">
            {/* Month/Year nav */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-md p-1 text-ink-subtle transition-colors hover:bg-raised hover:text-ink"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="text-xs text-ink">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded-md p-1 text-ink-subtle transition-colors hover:bg-raised hover:text-ink"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0">
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-[10px] text-ink-subtle"
                >
                  {d}
                </div>
              ))}

              {/* Empty cells before first day */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = toDateStr(viewYear, viewMonth, day);
                const isSelected = dateStr === selectedStr;
                const isToday =
                  day === today.getDate() &&
                  viewMonth === today.getMonth() &&
                  viewYear === today.getFullYear();

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelect(day)}
                    className={`rounded-md py-1 text-center text-xs transition-colors ${
                      isSelected
                        ? "bg-primary text-ink"
                        : isToday
                          ? "text-primary hover:bg-primary-soft"
                          : "text-ink-muted hover:bg-raised"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Clear / Today */}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <button
                type="button"
                onClick={() => {
                  const t = new Date();
                  handleSelect(t.getDate());
                  setViewYear(t.getFullYear());
                  setViewMonth(t.getMonth());
                }}
                className="text-[10px] text-primary hover:underline"
              >
                Today
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange?.("");
                    setOpen(false);
                  }}
                  className="text-[10px] text-ink-subtle hover:text-ink-muted"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
