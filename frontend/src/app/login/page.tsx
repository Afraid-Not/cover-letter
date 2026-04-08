"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SignInPage } from "@/components/ui/sign-in";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleKakaoLogin = () => {
    setError("카카오 로그인은 현재 준비 중입니다.");
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        if (error.message === "Invalid login credentials") {
          throw new Error("이메일 또는 비밀번호를 확인해주세요.");
        }
        throw error;
      }
      const resumes = await api.listResumes().catch(() => []);
      const hasResume = Array.isArray(resumes) && resumes.length > 0;
      router.push(hasResume ? "/" : "/welcome");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignInPage
      title={
        <Image src="/logo.png" alt="AURA" width={96} height={33} priority />
      }
      description="9명의 AI 평가관이 당신의 자소서를 심사합니다"
      heroImageSrc="/login-page.png"
      onSignIn={handleSignIn}
      onCreateAccount={() => router.push("/signup")}
      onGoogleLogin={handleGoogleLogin}
      onKakaoLogin={handleKakaoLogin}
      loading={loading}
      error={error}
    />
  );
}
