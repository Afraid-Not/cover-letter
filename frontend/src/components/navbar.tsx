"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/", label: "자소서 작성" },
  { href: "/resumes", label: "이력서 등록" },
];

export const Navbar = () => {
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

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 px-6 pt-4 pb-0 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center pb-4">
          <Link href="/" className="flex items-center">
            <span className="text-base font-semibold tracking-widest font-heading text-primary">
              AURA
            </span>
          </Link>

          {/* Nav links — centered */}
          <nav className="hidden md:flex items-center space-x-8">
            {NAV_ITEMS.map((item) => {
              const isResumes = item.href === "/resumes";
              const isActive =
                item.href === "/"
                  ? pathname === "/" || pathname.startsWith("/projects")
                  : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  ref={isResumes ? resumeLinkRef : undefined}
                  href={item.href}
                  className={`text-sm transition-colors duration-200 ${
                    isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right — legal links & logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/terms"
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                이용약관
              </Link>
              <span className="text-[11px] text-border">|</span>
              <Link
                href="/privacy"
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                개인정보처리방침
              </Link>
              <span className="text-[11px] text-border">|</span>
              <button
                onClick={signOut}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
        <div className="nav-divider" />
      </header>

      {/* Resume registration tooltip */}
      {showTooltip && resumeLinkRef.current && (
        <TooltipPortal
          anchorRef={resumeLinkRef}
          onClose={() => setTooltipDismissed(true)}
        />
      )}
    </>
  );
};

const TooltipPortal = ({
  anchorRef,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLAnchorElement | null>;
  onClose: () => void;
}) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const update = () => {
      if (anchorRef.current) setRect(anchorRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [anchorRef]);

  if (!rect) return null;

  return (
    <div
      className="fixed z-50 pointer-events-auto"
      style={{
        top: rect.bottom + 10,
        left: rect.left + rect.width / 2,
        transform: "translateX(-50%)",
      }}
    >
      {/* Top arrow */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: -7,
          width: 0,
          height: 0,
          borderLeft: "7px solid transparent",
          borderRight: "7px solid transparent",
          borderBottom: "8px solid #c96442",
        }}
      />
      <div className="bg-primary text-primary-foreground text-[13px] font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-black/10 whitespace-nowrap flex items-center gap-2">
        <span>먼저 이력서를 등록해주세요!</span>
        <button
          onClick={onClose}
          className="ml-1 text-primary-foreground/70 hover:text-primary-foreground transition-colors leading-none text-base"
          aria-label="닫기"
        >
          ×
        </button>
      </div>
    </div>
  );
};
