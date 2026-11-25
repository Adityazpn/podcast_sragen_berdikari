"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { APP_NAME, Logo } from "./logo";
import { CURRENT_PHASE, NAV_ITEMS } from "./nav";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Navigasi utama">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const available = item.phase <= CURRENT_PHASE;
        if (!available) {
          return (
            <span
              key={item.href}
              aria-disabled="true"
              title={`Tersedia di Phase ${item.phase}`}
              className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-secondary/60"
            >
              <Icon className="size-4" />
              <span className="flex-1">{item.label}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">Segera</span>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-accent-soft text-accent" : "text-secondary hover:bg-muted hover:text-primary",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-2 text-base font-semibold">
      <Logo size={36} priority />
      {APP_NAME}
    </Link>
  );
}
