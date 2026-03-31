import { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  error,
  options,
  className = "",
  id,
  ...props
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm text-white/60 font-mono">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`rounded-xs border border-border bg-surface px-3 py-2 font-mono text-sm text-white/90 focus:border-accent focus:outline-none ${error ? "border-dispute" : ""} ${className}`}
        {...props}
      >
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-dispute font-mono">{error}</span>}
    </div>
  );
}
