"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

const NAV_ITEMS = [
  { href: "/", label: "자소서 관리", icon: "edit" },
  { href: "/resumes", label: "이력서 관리", icon: "file" },
];

const ICONS: Record<string, ReactNode> = {
  edit: (
    <svg
      className="w-[18px] h-[18px]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
      />
    </svg>
  ),
  file: (
    <svg
      className="w-[18px] h-[18px]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  ),
};

export const Sidebar = () => {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`
        fixed top-0 left-0 h-screen z-40 flex flex-col
        bg-sidebar/95 backdrop-blur-sm border-r border-border/30
        transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden
        ${expanded ? "w-[220px] shadow-2xl shadow-black/25" : "w-16"}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="relative px-4 py-5 flex items-center gap-3">
        <Image
          src="/logo.png"
          alt="AURA"
          width={40}
          height={29}
          className="shrink-0"
        />
        <h1
          className={`text-xl font-semibold tracking-widest whitespace-nowrap transition-opacity duration-200 font-[family-name:var(--font-playfair)] ${expanded ? "opacity-100" : "opacity-0"}`}
        >
          AURA
        </h1>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-2 mt-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname.startsWith("/projects")
              : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={!expanded ? item.label : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200
                ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }
              `}
            >
              <span
                className={`shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/60"}`}
              >
                {ICONS[item.icon]}
              </span>
              <span
                className={`whitespace-nowrap transition-opacity duration-200 font-medium ${expanded ? "opacity-100" : "opacity-0"}`}
              >
                {item.label}
              </span>
              {isActive && expanded && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="relative px-2 pb-4 space-y-1">
        {/* Legal links */}
        <div
          className={`flex gap-2 px-3 py-1 transition-opacity duration-200 ${expanded ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <Link
            href="/terms"
            className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            이용약관
          </Link>
          <span className="text-[10px] text-muted-foreground/20">|</span>
          <Link
            href="/privacy"
            className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            개인정보처리방침
          </Link>
        </div>

        <button
          onClick={signOut}
          title={!expanded ? "로그아웃" : undefined}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-muted-foreground/50 hover:text-foreground hover:bg-accent/30 transition-all"
        >
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
            />
          </svg>
          <span
            className={`whitespace-nowrap transition-opacity duration-200 ${expanded ? "opacity-100" : "opacity-0"}`}
          >
            로그아웃
          </span>
        </button>
      </div>
    </aside>
  );
};
