import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "danger-outline" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-card hover:bg-primary-hover active:bg-primary-hover",
  secondary:
    "bg-surface text-ink border border-border shadow-card hover:bg-raised hover:border-border-strong",
  danger: "bg-danger text-white shadow-card hover:brightness-110",
  "danger-outline":
    "bg-transparent text-danger border border-danger/40 hover:bg-danger-soft hover:border-danger",
  ghost: "bg-transparent text-ink-muted hover:bg-raised hover:text-ink",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
