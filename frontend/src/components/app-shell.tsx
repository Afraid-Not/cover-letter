"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          {user && (
            <div className="flex justify-end mb-4">
              <span className="text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
          )}
          {children}
        </div>
      </main>
    </AuthGuard>
  );
};
