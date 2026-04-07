"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/", label: "자소서 관리", icon: "edit" },
  { href: "/resumes", label: "이력서 관리", icon: "file" },
];

const ICONS: Record<string, ReactNode> = {
  edit: (
    <svg
      className="w-7 h-7"
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
      className="w-7 h-7"
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
  const { signOut, session } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);
  const resumeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!session) return;
    api
      .listResumes()
      .then((data: unknown[]) => {
        setHasResume(Array.isArray(data) && data.length > 0);
      })
      .catch(() => {
        setHasResume(true);
      });
  }, [session]);

  const showTooltip = hasResume === false && !tooltipDismissed;

  // Track resume link position for fixed tooltip
  const [resumeLinkRect, setResumeLinkRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!showTooltip) return;
    const update = () => {
      if (resumeLinkRef.current)
        setResumeLinkRect(resumeLinkRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [showTooltip, expanded]);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`
        fixed top-0 left-0 h-screen z-40 flex flex-col
        bg-violet-50 border-r border-violet-200
        transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden
        ${expanded ? "w-[240px] shadow-2xl shadow-violet-200/60" : "w-[68px]"}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-violet-100/40 to-transparent pointer-events-none" />

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
          className={`text-xl font-semibold tracking-widest whitespace-nowrap transition-opacity duration-200 font-[family-name:var(--font-playfair)] text-violet-800 ${expanded ? "opacity-100" : "opacity-0"}`}
        >
          AURA
        </h1>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-2 mt-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isResumes = item.href === "/resumes";
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname.startsWith("/projects")
              : pathname === item.href;
          return (
            <div key={item.href} className="relative">
              <Link
                ref={isResumes ? resumeLinkRef : undefined}
                href={item.href}
                title={!expanded ? item.label : undefined}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl text-base transition-all duration-200
                  ${
                    isActive
                      ? "bg-violet-200/70 text-violet-800"
                      : "text-slate-500 hover:bg-violet-100 hover:text-violet-800"
                  }
                `}
              >
                <span
                  className={`shrink-0 ${isActive ? "text-violet-700" : "text-slate-400"}`}
                >
                  {ICONS[item.icon]}
                </span>
                <span
                  className={`whitespace-nowrap transition-opacity duration-200 font-bold text-[15px] ${expanded ? "opacity-100" : "opacity-0"}`}
                >
                  {item.label}
                </span>
                {isActive && expanded && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse-soft" />
                )}
              </Link>
            </div>
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
            className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            이용약관
          </Link>
          <span className="text-[10px] text-slate-300">|</span>
          <Link
            href="/privacy"
            className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            개인정보처리방침
          </Link>
        </div>

        <button
          onClick={signOut}
          title={!expanded ? "로그아웃" : undefined}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-violet-800 hover:bg-violet-100 transition-all"
        >
          <svg
            className="w-6 h-6 shrink-0"
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
            className={`whitespace-nowrap transition-opacity duration-200 text-[15px] ${expanded ? "opacity-100" : "opacity-0"}`}
          >
            로그아웃
          </span>
        </button>
      </div>
    </aside>

      {/* Resume registration tooltip — fixed outside sidebar to avoid overflow-hidden clipping */}
      {showTooltip && resumeLinkRect && (
        <div
          className="fixed z-50 pointer-events-auto"
          style={{
            top: resumeLinkRect.top + resumeLinkRect.height / 2,
            left: resumeLinkRect.right + 12,
            transform: "translateY(-50%)",
          }}
        >
          {/* Left arrow */}
          <div
            className="absolute"
            style={{
              left: -7,
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "7px solid transparent",
              borderBottom: "7px solid transparent",
              borderRight: "8px solid rgb(139 92 246)",
            }}
          />
          {/* Balloon */}
          <div className="bg-violet-500 text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-violet-300/50 whitespace-nowrap flex items-center gap-2">
            <span>먼저 이력서를 등록해주세요!</span>
            <button
              onClick={() => setTooltipDismissed(true)}
              className="ml-1 text-white/70 hover:text-white transition-colors leading-none text-base"
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        </div>
      )}
  );
};
