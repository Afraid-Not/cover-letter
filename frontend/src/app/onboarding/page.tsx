"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-primary/70 focus-within:bg-primary/5">
    {children}
  </div>
);

const inputClass =
  "w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50";

const EDUCATION_LEVELS = [
  "고등학교 졸업",
  "대학교 재학",
  "대학교 졸업",
  "대학원 석사 재학",
  "대학원 석사 졸업",
  "대학원 박사 재학",
  "대학원 박사 졸업",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    jobTitle: "",
    jobSeekerStatus: "" as "신입" | "경력" | "",
    yearsOfExperience: "",
    educationLevel: "",
    educationMajor: "",
    agreedToTerms: false,
    agreedToPrivacy: false,
  });

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    const prefill = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      const fullName: string =
        session.user.user_metadata?.full_name ??
        session.user.user_metadata?.name ??
        "";
      if (fullName) set("name", fullName);
    };
    prefill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.saveProfile({
        name: form.name.trim(),
        job_title: form.jobTitle || undefined,
        job_seeker_status: form.jobSeekerStatus || undefined,
        years_of_experience: form.yearsOfExperience
          ? parseInt(form.yearsOfExperience)
          : undefined,
        education_level: form.educationLevel || undefined,
        education_major: form.educationMajor || undefined,
        agreed_to_terms: form.agreedToTerms,
      });
      router.push("/pricing?onboarding=1");
    } catch {
      setError("프로필 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div>
            <Image src="/logo.svg" alt="합격" width={96} height={33} priority />
            <p className="text-muted-foreground mt-2">
              커리어 정보를 입력하면 더 정확한 자소서를 생성할 수 있습니다
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                이름
              </label>
              <GlassInputWrapper>
                <input
                  type="text"
                  placeholder="홍길동"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={inputClass}
                  required
                />
              </GlassInputWrapper>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                희망 직무
              </label>
              <GlassInputWrapper>
                <input
                  type="text"
                  placeholder="예: 백엔드 개발자, 데이터 분석가, 마케터..."
                  value={form.jobTitle}
                  onChange={(e) => set("jobTitle", e.target.value)}
                  className={inputClass}
                />
              </GlassInputWrapper>
              <p className="text-xs text-muted-foreground mt-1 pl-1">
                자유롭게 입력하세요. AI가 의미를 파악합니다.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                취준 상태
              </label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                {(["신입", "경력"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => set("jobSeekerStatus", status)}
                    className={`rounded-2xl border py-3 text-sm font-medium transition-colors ${
                      form.jobSeekerStatus === status
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-foreground/5 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {form.jobSeekerStatus === "경력" && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  경력 연수
                </label>
                <GlassInputWrapper>
                  <input
                    type="number"
                    placeholder="예: 3"
                    min={1}
                    max={50}
                    value={form.yearsOfExperience}
                    onChange={(e) => set("yearsOfExperience", e.target.value)}
                    className={inputClass}
                  />
                </GlassInputWrapper>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                최종 학력
              </label>
              <GlassInputWrapper>
                <select
                  value={form.educationLevel}
                  onChange={(e) => set("educationLevel", e.target.value)}
                  className={`${inputClass} appearance-none cursor-pointer`}
                >
                  <option value="" disabled>
                    선택하세요
                  </option>
                  {EDUCATION_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </GlassInputWrapper>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                전공 / 학과
              </label>
              <GlassInputWrapper>
                <input
                  type="text"
                  placeholder="예: 컴퓨터공학과"
                  value={form.educationMajor}
                  onChange={(e) => set("educationMajor", e.target.value)}
                  className={inputClass}
                />
              </GlassInputWrapper>
            </div>

            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.agreedToTerms}
                  onChange={(e) => set("agreedToTerms", e.target.checked)}
                  className="mt-0.5 accent-primary"
                  required
                />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    이용약관
                  </a>
                  에 동의합니다 (필수)
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.agreedToPrivacy}
                  onChange={(e) => set("agreedToPrivacy", e.target.checked)}
                  className="mt-0.5 accent-primary"
                  required
                />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    개인정보처리방침
                  </a>
                  에 동의합니다 (필수)
                </span>
              </label>
            </div>

            {error && <p className="text-xs text-rose-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  시작하기
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
