"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  /** Optional unread/notification badge shown as a small pill next to the label. */
  badge?: number;
}

interface SidebarProps {
  title: string;
  items: NavItem[];
  children?: ReactNode;
}

export function Sidebar({ title, items, children }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border px-4 py-5">
        <h2 className="font-heading text-lg text-white">{title}</h2>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between gap-2 rounded-xs px-3 py-2 font-mono text-sm transition-colors ${
                active
                  ? "bg-accent/15 text-accent"
                  : "text-white/60 hover:text-white/90 hover:bg-white/5"
              }`}
            >
              <span className="truncate">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  aria-label={`${item.badge} unread`}
                  className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-dispute px-1.5 py-0.5 font-mono text-[10px] leading-none text-white"
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      {children && (
        <div className="border-t border-border p-2">
          {children}
        </div>
      )}
    </aside>
  );
}
