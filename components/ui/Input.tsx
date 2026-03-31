import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm text-white/60 font-mono">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded-xs border border-border bg-surface px-3 py-2 font-mono text-sm text-white/90 placeholder:text-white/30 focus:border-accent focus:outline-none ${error ? "border-dispute" : ""} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-dispute font-mono">{error}</span>}
    </div>
  );
}
