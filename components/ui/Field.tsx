interface FieldProps {
  label: string;
  value: string;
  capitalize?: boolean;
  small?: boolean;
}

export function Field({ label, value, capitalize: cap, small }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-xs text-white/40">{label}</span>
      <span
        className={`font-mono ${small ? "text-xs" : "text-sm"} text-white/90 ${cap ? "capitalize" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
