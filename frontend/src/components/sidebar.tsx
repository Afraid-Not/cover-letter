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
    // 자소서 관리: 깃털 펜 + 스파클 — 창의적 글쓰기
    <svg
      className="w-6 h-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.7}
    >
      {/* Feather quill body */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 4C15 4 8 9 7 16l1 1c7-1 12-8 12-13Z"
      />
      {/* Quill shaft */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16 4 20" />
      {/* Nib split */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 9 15" />
      {/* Sparkle top-right */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 2v2M21 6h-2M19 2l-1.5 1.5"
      />
    </svg>
  ),
  file: (
    // 이력서 관리: ID 카드 — 프로필/신원 정보
    <svg
      className="w-6 h-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.7}
    >
      {/* Card outline */}
      <rect
        x="2"
        y="5"
        width="20"
        height="14"
        rx="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Avatar circle */}
      <circle cx="8" cy="11" r="2.2" strokeLinecap="round" />
      {/* Name line */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 9.5h5" />
      {/* Sub-info lines */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 12.5h4M13 15h3"
      />
    </svg>
  ),
};

export const Sidebar = () => {
  const pathname = usePathname();
  const { signOut, session } = useAuth();
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
  }, [showTooltip]);

  return (
    <>
      <aside
        className="fixed top-0 left-0 h-screen z-40 flex flex-col w-[240px]
        bg-sidebar border-r border-sidebar-border shadow-sm"
      >
        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="합격"
            width={40}
            height={29}
            className="shrink-0"
          />
          <h1 className="text-xl font-semibold tracking-widest whitespace-nowrap font-heading text-primary">
            합격
          </h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 mt-4 space-y-1">
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
                  className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl text-base transition-all duration-200
                  ${
                    isActive
                      ? "bg-accent text-primary"
                      : "text-sidebar-foreground hover:bg-accent hover:text-sidebar-foreground"
                  }
                `}
                >
                  <span
                    className={`shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {ICONS[item.icon]}
                  </span>
                  <span
                    className={`whitespace-nowrap text-[14px] tracking-wide ${
                      isActive
                        ? "font-semibold text-primary"
                        : "font-medium text-sidebar-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 pb-4 space-y-1">
          {/* Legal links */}
          <div className="flex gap-2 px-3 py-1">
            <Link
              href="/terms"
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              이용약관
            </Link>
            <span className="text-[10px] text-border">|</span>
            <Link
              href="/privacy"
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              개인정보처리방침
            </Link>
          </div>

          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-sidebar-foreground hover:bg-accent transition-all duration-200"
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
            <span className="whitespace-nowrap text-[15px]">로그아웃</span>
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
              borderRight: "8px solid #c96442",
            }}
          />
          {/* Balloon */}
          <div className="bg-primary text-primary-foreground text-[13px] font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-black/10 whitespace-nowrap flex items-center gap-2">
            <span>먼저 이력서를 등록해주세요!</span>
            <button
              onClick={() => setTooltipDismissed(true)}
              className="ml-1 text-primary-foreground/70 hover:text-primary-foreground transition-colors leading-none text-base"
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
};
