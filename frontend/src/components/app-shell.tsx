"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { FooterBar } from "@/components/footer-bar";
import { AuthGuard } from "@/components/auth-guard";
export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const isPublicPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/pricing" ||
    pathname === "/terms" ||
    pathname === "/privacy";

  const isFullscreenPage = pathname === "/welcome";

  if (isPublicPage) {
    return <main className="flex-1 overflow-y-auto noise-bg">{children}</main>;
  }

  if (isFullscreenPage) {
    return (
      <AuthGuard>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Navbar />
      <main className="flex-1 overflow-y-auto noise-bg relative pt-[74px] pb-[44px]">
        {/* Top ambient glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/[0.04] rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-8 py-6">
          <div className="animate-fade-in-up">{children}</div>
        </div>
      </main>
      <FooterBar />
    </AuthGuard>
  );
};
