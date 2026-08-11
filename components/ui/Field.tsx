interface FieldProps {
  label: string;
  value: string;
  capitalize?: boolean;
  small?: boolean;
}

export function Field({ label, value, capitalize: cap, small }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
        {label}
      </span>
      <span
        className={`${small ? "text-xs" : "text-sm"} text-ink ${cap ? "capitalize" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
