"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export const FooterBar = () => {
  const { signOut, role } = useAuth();

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 px-6 py-2.5 bg-background/80 backdrop-blur-md border-t border-border">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
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
          {role === "admin" && (
            <>
              <span className="text-[11px] text-border">|</span>
              <Link
                href="/admin"
                className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors font-medium"
              >
                관리자
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/support"
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            고객센터
          </Link>
          <button
            onClick={signOut}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </footer>
  );
};
