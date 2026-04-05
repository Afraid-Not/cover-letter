"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.push("/login");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!user && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
};
