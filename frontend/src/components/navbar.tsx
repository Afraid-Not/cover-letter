"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import type { UsageSummary } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/", label: "자소서 관리" },
  { href: "/resumes", label: "이력서 관리" },
];

export const Navbar = () => {
  const pathname = usePathname();
  const { signOut, session } = useAuth();
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
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
    api
      .getUsage()
      .then(setUsage)
      .catch(() => {});
  }, [session]);

  const showTooltip = hasResume === false && !tooltipDismissed;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 px-6 pt-4 pb-0 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center pb-4 relative">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="AURA"
              width={64}
              height={22}
              style={{ width: 64, height: "auto" }}
              priority
            />
          </Link>

          {/* Nav links — absolutely centered */}
          <nav className="hidden md:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
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
                  className={`text-base font-bold transition-colors duration-200 ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right — plan + mypage + upgrade */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Current plan badge */}
            {usage && (
              <>
                <span className="text-[11px] font-medium text-muted-foreground px-2.5 py-1 rounded-full bg-muted border border-border">
                  {usage.plan === "pro"
                    ? "Pro 플랜"
                    : usage.plan === "enterprise"
                      ? "Enterprise 플랜"
                      : "Free 플랜"}
                </span>
                <span className="text-[11px] text-border">|</span>
              </>
            )}
            <Link
              href="/mypage"
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              MyPage
            </Link>
            <span className="text-[11px] text-border">|</span>
            <Link
              href="/pricing"
              className="text-[11px] font-medium text-primary border border-primary/40 hover:bg-primary/10 transition-colors px-2.5 py-1 rounded-full"
            >
              플랜 업그레이드
            </Link>
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
