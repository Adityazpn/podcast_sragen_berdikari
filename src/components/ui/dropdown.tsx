"use client";

import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const Dropdown = DropdownPrimitive.Root;
export const DropdownTrigger = DropdownPrimitive.Trigger;

export function DropdownContent({ className, children, align = "end" }: { className?: string; children: React.ReactNode; align?: "start" | "end" | "center" }) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={6}
        className={cn("z-50 min-w-44 rounded-lg border border-border bg-surface p-1 shadow-lg", className)}
      >
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  );
}

export function DropdownItem({
  className,
  danger,
  ...props
}: DropdownPrimitive.DropdownMenuItemProps & { danger?: boolean }) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none data-[highlighted]:bg-muted [&_svg]:size-4",
        danger && "text-danger",
        className,
      )}
      {...props}
    />
  );
}

export const DropdownSeparator = () => <DropdownPrimitive.Separator className="my-1 h-px bg-border" />;
export const DropdownLabel = ({ children }: { children: React.ReactNode }) => (
  <DropdownPrimitive.Label className="px-2.5 py-1.5 text-xs text-secondary">{children}</DropdownPrimitive.Label>
);
