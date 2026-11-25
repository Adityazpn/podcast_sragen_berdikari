"use client";

import { useState } from "react";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { LogOut, Menu, Settings, User, X } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { Badge } from "@/components/ui/badge";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { initials } from "@/lib/utils";
import { Brand, SidebarNav } from "./sidebar";

export function Topbar({
  name,
  email,
  avatarUrl,
  role,
  workspaceName,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  workspaceName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur lg:px-8">
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger className="rounded-md p-2 hover:bg-muted lg:hidden" aria-label="Buka menu">
          <Menu className="size-5" />
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-primary/40 lg:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-surface p-4 shadow-xl lg:hidden">
            <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Navigasi utama</DialogPrimitive.Description>
            <div className="mb-6 flex items-center justify-between">
              <Brand />
              <DialogPrimitive.Close className="rounded-md p-2 hover:bg-muted" aria-label="Tutup menu">
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="min-w-0 flex-1 truncate text-sm text-secondary">{workspaceName}</div>

      <Dropdown>
        <DropdownTrigger className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-muted" aria-label="Menu akun">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="size-8 rounded-full object-cover" />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              {initials(name)}
            </span>
          )}
          <span className="hidden text-sm font-medium sm:inline">{name}</span>
        </DropdownTrigger>
        <DropdownContent className="w-60">
          <DropdownLabel>
            <span className="block truncate font-medium text-primary">{name}</span>
            <span className="block truncate">{email}</span>
            <Badge tone={role === "admin" ? "accent" : "neutral"} className="mt-1.5 capitalize">
              {role}
            </Badge>
          </DropdownLabel>
          <DropdownSeparator />
          <DropdownItem asChild>
            <Link href="/settings">
              <User /> Profil
            </Link>
          </DropdownItem>
          <DropdownItem asChild>
            <Link href="/settings?tab=account">
              <Settings /> Pengaturan akun
            </Link>
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem danger onSelect={() => void logout()}>
            <LogOut /> Keluar
          </DropdownItem>
        </DropdownContent>
      </Dropdown>
    </header>
  );
}
