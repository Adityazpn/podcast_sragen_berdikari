import Image from "next/image";
import { cn } from "@/lib/utils";

export const APP_NAME = "Sukowati Berdikari";

export function Logo({ size = 32, className, priority }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src="/logo.png"
      alt="Logo Sukowati Berdikari"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 rounded-full", className)}
    />
  );
}
