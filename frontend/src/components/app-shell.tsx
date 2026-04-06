"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const isLoginPage = pathname === "/login";
  const isPublicPage = pathname === "/terms" || pathname === "/privacy";

  if (isPublicPage) {
    return <main className="flex-1 overflow-y-auto noise-bg">{children}</main>;
  }

  if (isLoginPage) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <Sidebar />
      <main className="flex-1 overflow-y-auto noise-bg relative ml-16">
        {/* Top ambient glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/[0.04] rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-8 py-6">
          {user && (
            <div className="flex justify-end mb-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/30 border border-border/50">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[11px] text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </div>
          )}
          <div className="animate-fade-in-up">{children}</div>
        </div>
      </main>
    </AuthGuard>
  );
};
