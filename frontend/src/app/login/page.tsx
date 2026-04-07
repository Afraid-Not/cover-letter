"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignInPage } from "@/components/ui/sign-in";
import { supabase } from "@/lib/supabase";

const testimonials = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/44.jpg",
    name: "김지수",
    handle: "@jisoo_k",
    text: "9명의 AI 평가관 덕분에 자소서 완성도가 확 올라갔어요. 대기업 최종 합격!",
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "박민준",
    handle: "@minjun_dev",
    text: "RAG 기반 합격 자소서 분석이 정말 정확해요. 실제 합격자들의 패턴을 파악할 수 있었습니다.",
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/68.jpg",
    name: "이서연",
    handle: "@seoyeon_career",
    text: "피드백 재생성 기능으로 계속 다듬다 보니 훨씬 나은 자소서가 완성됐어요.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      router.push("/welcome");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignInPage
      title={
        <span className="font-heading text-primary tracking-widest">AURA</span>
      }
      description="9명의 AI 평가관이 당신의 자소서를 심사합니다"
      heroImageSrc="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=2160&q=80"
      testimonials={testimonials}
      onSignIn={handleSignIn}
      onCreateAccount={() => router.push("/signup")}
      loading={loading}
      error={error}
    />
  );
}
