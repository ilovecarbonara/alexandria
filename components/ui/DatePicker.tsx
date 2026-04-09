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
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync view to value when it changes externally
  useEffect(() => {
    if (value) {
      const { year, month } = parseDate(value);
      setViewYear(year);
      setViewMonth(month);
    }
  }, [value]);

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
        <label htmlFor={id} className="font-mono text-sm text-white/60">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          id={id}
          onClick={() => setOpen((o) => !o)}
          className={`flex w-full items-center justify-between rounded-xs border bg-surface px-3 py-2 text-left font-mono text-sm transition-colors focus:outline-none ${
            open ? "border-accent" : "border-border hover:border-white/20"
          } ${value ? "text-white/90" : "text-white/30"}`}>
          <span className="truncate">
            {value ? formatDisplay(value) : placeholder}
          </span>
          {/* Calendar icon */}
          <svg
            className="ml-2 shrink-0 text-white/40"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-64 rounded-xs border border-border bg-surface p-3 shadow-lg shadow-black/40">
            {/* Month/Year nav */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-xs p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
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
              <span className="font-mono text-xs text-white/80">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded-xs p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
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
                  className="py-1 text-center font-mono text-[10px] text-white/30"
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
                    className={`rounded-xs py-1 text-center font-mono text-xs transition-colors ${
                      isSelected
                        ? "bg-accent text-white"
                        : isToday
                          ? "text-accent hover:bg-accent/10"
                          : "text-white/70 hover:bg-white/5"
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
                className="font-mono text-[10px] text-accent hover:underline"
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
                  className="font-mono text-[10px] text-white/40 hover:text-white/70"
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
