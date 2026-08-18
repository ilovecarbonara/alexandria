"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  /** Optional unread/queue count shown as a small pill next to the label. */
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
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border px-5 py-5">
        <h2 className="font-heading text-xl text-ink">{title}</h2>
        <p className="mt-0.5 text-xs tracking-wide text-ink-subtle">
          USPF Thesis Archive
        </p>
      </div>

      {/* Scrolls only when the viewport is too short for the nav itself; the
          header and the sign-out footer stay put either way. */}
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {items.map((item) => {
          // The area root would otherwise stay active on every sub-page.
          const active =
            pathname === item.href ||
            (item.href !== "/" &&
              pathname.startsWith(item.href + "/") &&
              items.every((other) => other.href === item.href || pathname !== other.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-primary-soft font-medium text-primary"
                  : "text-ink-muted hover:bg-raised hover:text-ink"
              }`}
            >
              <span className="truncate">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  aria-label={`${item.badge} pending`}
                  className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-medium leading-none text-white"
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {children && <div className="border-t border-border p-3">{children}</div>}
    </aside>
  );
}
