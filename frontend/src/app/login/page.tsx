"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("확인 이메일을 보냈습니다. 이메일을 확인해주세요.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/` },
    });
  };

  return (
    <div className="min-h-screen flex bg-background noise-bg relative overflow-hidden">
      {/* 좌측: 로그인 폼 */}
      <div className="w-full md:w-[480px] flex items-center justify-center p-8 relative shrink-0">
        <div className="pointer-events-none absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/[0.06] rounded-full blur-[120px]" />

        <Card className="relative w-full max-w-sm border-border/50 animate-fade-in-up">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-3">
              <span className="text-primary text-lg font-bold">CL</span>
            </div>
            <CardTitle className="text-lg tracking-tight">
              Cover Letter Generator
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {isSignUp ? "계정을 만드세요" : "로그인하세요"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 소셜 로그인 */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGithubLogin}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
                </svg>
                GitHub로 로그인
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">또는</span>
              </div>
            </div>

            {/* 이메일 로그인 */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                required
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                required
                minLength={6}
              />

              {error && <p className="text-xs text-destructive">{error}</p>}
              {message && <p className="text-xs text-green-400">{message}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "처리 중..." : isSignUp ? "회원가입" : "로그인"}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              {isSignUp ? "이미 계정이 있나요?" : "계정이 없나요?"}{" "}
              <button
                className="underline text-foreground"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                  setMessage("");
                }}
              >
                {isSignUp ? "로그인" : "회원가입"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 우측: 이미지 */}
      <div className="hidden md:block flex-1 relative">
        <img
          src="/login-bg.png"
          alt="Interview panel"
          className="absolute inset-0 w-full h-full object-cover brightness-125"
        />
        {/* 좌측만 살짝 블렌딩 */}
        <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent w-1/3" />
        {/* 하단 텍스트 가독성용 */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background/70 to-transparent" />

        {/* 텍스트 오버레이 */}
        <div className="absolute bottom-12 left-12 right-12 animate-fade-in">
          <p className="text-2xl font-semibold text-foreground leading-snug">
            9명의 AI 평가관이
            <br />
            당신의 자소서를 심사합니다
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            합격 자소서 136건 기반 RAG + LLM-as-a-Judge
          </p>
        </div>
      </div>
    </div>
  );
}
