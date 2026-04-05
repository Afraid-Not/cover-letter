"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

const NAV_ITEMS = [
  { href: "/", label: "자소서 생성", icon: "edit", desc: "AI 자소서 작성" },
  {
    href: "/history",
    label: "생성 이력",
    icon: "history",
    desc: "이전 결과 보기",
  },
  {
    href: "/resumes",
    label: "이력서 관리",
    icon: "file",
    desc: "이력서 등록/관리",
  },
];

const ICONS: Record<string, ReactNode> = {
  edit: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
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
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  ),
  history: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  ),
};

export const Sidebar = () => {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="w-72 border-r border-border/50 bg-sidebar flex flex-col min-h-screen relative">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="relative p-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <span className="text-primary text-sm font-bold">CL</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Cover Letter
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
              Generator
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-3 space-y-0.5">
        <p className="px-3 pb-2 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
          메뉴
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <span
                className={`transition-colors ${isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"}`}
              >
                {ICONS[item.icon]}
              </span>
              <div>
                <span
                  className={`block leading-tight ${isActive ? "font-medium" : ""}`}
                >
                  {item.label}
                </span>
                <span className="block text-[10px] text-muted-foreground/50 leading-tight mt-0.5">
                  {item.desc}
                </span>
              </div>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Stats */}
      <div className="relative px-3 pb-3">
        <div className="rounded-lg border border-border/50 bg-accent/30 p-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
            <span>데이터 현황</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-1.5 rounded bg-background/50">
              <p className="text-lg font-semibold text-primary leading-none">
                136
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                합격 자소서
              </p>
            </div>
            <div className="text-center p-1.5 rounded bg-background/50">
              <p className="text-lg font-semibold text-foreground leading-none">
                9
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                AI 평가관
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="relative px-3 pb-4">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground/60 hover:text-foreground hover:bg-accent/30 transition-all"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
            />
          </svg>
          로그아웃
        </button>
      </div>
    </aside>
  );
};
