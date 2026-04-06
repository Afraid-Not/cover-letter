"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
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
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background noise-bg relative overflow-hidden">
      <div className="w-full md:w-[480px] flex items-center justify-center p-8 relative shrink-0">
        <div className="pointer-events-none absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/[0.06] rounded-full blur-[120px]" />

        <Card className="relative w-full max-w-sm border-border/50 animate-fade-in-up">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-3">
              <Image src="/logo.png" alt="AURA" width={48} height={35} />
            </div>
            <h1 className="text-2xl font-semibold tracking-widest font-[family-name:var(--font-playfair)]">
              AURA
            </h1>
            <p className="text-xs text-muted-foreground mt-1">로그인하세요</p>
          </CardHeader>
          <CardContent className="space-y-4">
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "처리 중..." : "로그인"}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              계정이 없나요?{" "}
              <Link href="/signup" className="underline text-foreground">
                회원가입
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:block flex-1 relative">
        <img
          src="/login-bg.png"
          alt="Interview panel"
          className="absolute inset-0 w-full h-full object-cover brightness-125"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent w-1/3" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background/70 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 animate-fade-in">
          <p className="text-2xl font-semibold text-foreground leading-snug">
            9명의 AI 평가관이
            <br />
            당신의 자소서를 심사합니다
          </p>
        </div>
      </div>
    </div>
  );
}
