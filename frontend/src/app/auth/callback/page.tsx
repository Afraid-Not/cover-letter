"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const CallbackHandler = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace("/login?error=auth_failed");
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login?error=auth_failed");
        return;
      }

      // 프로필 존재 여부로 신규/기존 유저 구분
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profile) {
        router.replace("/");
      } else {
        // 소셜 신규 가입 → 커리어 정보 입력
        router.replace("/onboarding");
      }
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default function AuthCallbackPage() {
  return (
    <div className="h-[100dvh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">로그인 처리 중...</p>
      </div>
      <Suspense>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
