"use client";

import { cn } from "@/lib/utils";

export interface BentoItem {
  title: string;
  subtitle?: string;
  meta?: string;
  status?: string;
  statusColor?: string;
  accentColor?: string;
  accentGradient?: string;
  iconGlow?: string;
  resumeName?: string;
  tags?: string[];
  badge?: string;
  badgeColor?: string;
  colSpan?: number;
  hasPersistentHover?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}

interface BentoGridProps {
  items: BentoItem[];
  className?: string;
}

function BentoGrid({ items, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3",
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            "group relative p-6 min-h-[160px] rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col justify-between",
            "border border-border bg-card",
            "hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1",
            "will-change-transform",
            item.colSpan === 2 ? "md:col-span-2" : "col-span-1",
            item.hasPersistentHover &&
              "-translate-y-1 shadow-xl shadow-black/10",
          )}
          onClick={item.onClick}
        >
          {/* gradient glow overlay */}
          {item.accentGradient && (
            <div
              className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br",
                item.accentGradient,
                item.hasPersistentHover && "opacity-100",
              )}
            />
          )}

          {/* icon glow */}
          {item.iconGlow && (
            <div
              className={cn(
                "absolute top-5 right-5 w-16 h-16 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                item.iconGlow,
                item.hasPersistentHover && "opacity-100",
              )}
            />
          )}

          {/* left accent bar */}
          {item.accentColor && (
            <div
              className={cn(
                "absolute left-0 top-5 bottom-5 w-[3px] rounded-full",
                item.accentColor,
              )}
            />
          )}

          <div
            className={cn(
              "relative flex flex-col justify-between flex-1 gap-6",
              item.accentColor && "pl-4",
            )}
          >
            {/* top row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {item.icon && (
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-muted group-hover:bg-accent transition-colors duration-300 shrink-0">
                    {item.icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground tracking-tight text-lg truncate">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      직무
                      <span className="mx-1.5 text-muted-foreground/40">|</span>
                      {item.subtitle}
                    </p>
                  )}
                  {item.resumeName && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      이력서
                      <span className="mx-1.5 text-muted-foreground/40">|</span>
                      {item.resumeName}
                    </p>
                  )}
                </div>
              </div>

              {item.status && (
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-1 rounded-lg backdrop-blur-sm text-center",
                      "transition-colors duration-300",
                      item.statusColor ||
                        "bg-muted text-muted-foreground group-hover:bg-accent",
                      item.badge && "w-full",
                    )}
                  >
                    {item.status}
                  </span>
                  {item.badge && (
                    <span
                      className={cn(
                        "px-2 py-1 rounded-lg text-xs font-mono font-semibold text-center w-full",
                        item.badgeColor || "bg-white/10 text-muted-foreground",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* bottom row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.meta && (
                  <span className="text-xs text-muted-foreground">
                    {item.meta}
                  </span>
                )}
                {item.tags?.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground transition-all duration-200 hover:bg-accent"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {item.onDelete && (
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onDelete?.(e);
                  }}
                  className="text-xs font-semibold px-2 py-0.5 rounded border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer shrink-0"
                >
                  삭제
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export { BentoGrid };
