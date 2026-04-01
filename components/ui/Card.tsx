import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-xs border border-border bg-surface p-6 ${className}`}
    >
      {children}
    </div>
  );
}
