import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

interface SignUpPageProps {
  heroImageSrc?: string;
  onSignUp?: (data: SignUpFormData) => void;
  onSignIn?: () => void;
  loading?: boolean;
  error?: string;
}

export interface SignUpFormData {
  email: string;
  password: string;
  name: string;
  phone: string;
  jobTitle: string;
  jobSeekerStatus: "신입" | "경력" | "";
  yearsOfExperience: string;
  educationLevel: string;
  educationMajor: string;
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
}

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

export const SignUpPage: React.FC<SignUpPageProps> = ({
  heroImageSrc,
  onSignUp,
  onSignIn,
  loading = false,
  error,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [matchError, setMatchError] = useState("");
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<SignUpFormData>({
    email: "",
    password: "",
    name: "",
    phone: "",
    jobTitle: "",
    jobSeekerStatus: "",
    yearsOfExperience: "",
    educationLevel: "",
    educationMajor: "",
    agreedToTerms: false,
    agreedToPrivacy: false,
  });

  const set = (key: keyof SignUpFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const checkEmail = (email: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus("idle");
      return;
    }
    setEmailStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/check-email?email=${encodeURIComponent(email)}`,
        );
        const data = await res.json();
        setEmailStatus(data.available ? "available" : "taken");
      } catch {
        setEmailStatus("idle");
      }
    }, 600);
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailStatus === "taken") return;
    if (form.password !== passwordConfirm) {
      setMatchError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setMatchError("");
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignUp?.(form);
  };

  const progressWidth = step === 1 ? "50%" : "100%";

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row w-[100dvw]">
      {/* Left: form */}
      <section className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="signin-element signin-delay-100">
              <Image
                src="/logo.png"
                alt="AURA"
                width={96}
                height={33}
                priority
              />
              <p className="text-muted-foreground mt-2">
                합격 자소서 기반 AI 코치와 함께 시작하세요
              </p>
            </div>

            {/* Progress */}
            <div className="signin-element signin-delay-200">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span className={step === 1 ? "text-primary font-medium" : ""}>
                  1단계 · 계정 정보
                </span>
                <span className={step === 2 ? "text-primary font-medium" : ""}>
                  2단계 · 커리어 정보
                </span>
              </div>
              <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: progressWidth }}
                />
              </div>
            </div>

            {/* Step 1 */}
            {step === 1 && (
              <form className="space-y-4" onSubmit={handleNextStep}>
                <div className="signin-element signin-delay-300">
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

                <div className="signin-element signin-delay-350">
                  <label className="text-sm font-medium text-muted-foreground">
                    이메일
                  </label>
                  <GlassInputWrapper>
                    <input
                      type="email"
                      placeholder="example@email.com"
                      value={form.email}
                      onChange={(e) => {
                        set("email", e.target.value);
                        checkEmail(e.target.value);
                      }}
                      className={inputClass}
                      required
                    />
                  </GlassInputWrapper>
                  {emailStatus === "checking" && (
                    <p className="flex items-center gap-1 mt-1 pl-1 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      확인 중...
                    </p>
                  )}
                  {emailStatus === "available" && (
                    <p className="flex items-center gap-1 mt-1 pl-1 text-xs text-emerald-500">
                      <CheckCircle2 className="w-3 h-3" />
                      사용 가능한 이메일입니다
                    </p>
                  )}
                  {emailStatus === "taken" && (
                    <p className="flex items-center gap-1 mt-1 pl-1 text-xs text-rose-500">
                      <XCircle className="w-3 h-3" />
                      이미 사용 중인 이메일입니다
                    </p>
                  )}
                </div>

                <div className="signin-element signin-delay-400">
                  <label className="text-sm font-medium text-muted-foreground">
                    전화번호
                  </label>
                  <GlassInputWrapper>
                    <input
                      type="tel"
                      placeholder="010-0000-0000"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      className={inputClass}
                    />
                  </GlassInputWrapper>
                </div>

                <div className="signin-element signin-delay-450">
                  <label className="text-sm font-medium text-muted-foreground">
                    비밀번호
                  </label>
                  <GlassInputWrapper>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="6자 이상"
                        value={form.password}
                        onChange={(e) => set("password", e.target.value)}
                        className={`${inputClass} pr-12`}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                        ) : (
                          <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                        )}
                      </button>
                    </div>
                  </GlassInputWrapper>
                </div>

                <div className="signin-element signin-delay-500">
                  <label className="text-sm font-medium text-muted-foreground">
                    비밀번호 확인
                  </label>
                  <GlassInputWrapper>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        placeholder="비밀번호 재입력"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        className={`${inputClass} pr-12`}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute inset-y-0 right-3 flex items-center"
                      >
                        {showConfirm ? (
                          <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                        ) : (
                          <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                        )}
                      </button>
                    </div>
                  </GlassInputWrapper>
                </div>

                {matchError && (
                  <p className="text-xs text-rose-500">{matchError}</p>
                )}

                <button
                  type="submit"
                  className="signin-element signin-delay-600 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  다음 단계
                  <ChevronRight className="w-4 h-4" />
                </button>

                <p className="signin-element signin-delay-700 text-center text-sm text-muted-foreground">
                  이미 계정이 있나요?{" "}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onSignIn?.();
                    }}
                    className="text-primary hover:underline transition-colors"
                  >
                    로그인
                  </a>
                </p>
              </form>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="signin-element signin-delay-200">
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

                <div className="signin-element signin-delay-250">
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
                  <div className="signin-element">
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
                        onChange={(e) =>
                          set("yearsOfExperience", e.target.value)
                        }
                        className={inputClass}
                      />
                    </GlassInputWrapper>
                  </div>
                )}

                <div className="signin-element signin-delay-300">
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

                <div className="signin-element signin-delay-350">
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

                {/* 약관 동의 */}
                <div className="signin-element signin-delay-400 space-y-3 pt-1">
                  <label className="flex items-start gap-3 cursor-pointer group">
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
                  <label className="flex items-start gap-3 cursor-pointer group">
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

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="signin-element signin-delay-500 flex-none rounded-2xl border border-border py-4 px-5 hover:bg-secondary transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="signin-element signin-delay-500 flex-1 rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {loading ? "처리 중..." : "가입하기"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Right: hero */}
      {heroImageSrc && (
        <section className="hidden md:block flex-1 relative p-4">
          <div
            className="signin-slide-right signin-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
          />
          <div className="absolute inset-4 rounded-3xl bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
          <div className="signin-element signin-delay-500 absolute bottom-12 left-12 right-12">
            <p className="font-heading text-3xl text-white leading-snug drop-shadow-lg">
              AI가 당신의 이야기를 완성합니다
            </p>
          </div>
        </section>
      )}
    </div>
  );
};
