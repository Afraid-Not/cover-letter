"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    setDevMode(localStorage.getItem("dev_mode") === "true");
  }, []);

  useEffect(() => {
    if (!loading && !user && !devMode && pathname !== "/login") {
      router.push("/login");
    }
  }, [user, loading, devMode, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!user && !devMode && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
};
