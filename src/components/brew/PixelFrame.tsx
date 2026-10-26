import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PixelFrame({
  title,
  className,
  children,
}: {
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("pixel-border bg-card p-3", className)}>
      {title ? (
        <h2 className="mb-2 font-pixel text-[10px] uppercase tracking-wider text-accent">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
