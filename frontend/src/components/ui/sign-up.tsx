import React, { useState, useRef, useEffect } from "react";
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

// ── Particle canvas ───────────────────────────────────────────────────────────

const ParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;
    canvas.width = w;
    canvas.height = h;

    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.6 + 0.6,
      hue: 265 + Math.random() * 45,
      opacity: Math.random() * 0.4 + 0.15,
    }));

    let animId: number;

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 65%, 72%, ${p.opacity})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `hsla(278, 60%, 68%, ${(1 - dist / 120) * 0.1})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(tick);
    };

    tick();

    const onResize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};

// ── Types ─────────────────────────────────────────────────────────────────────

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
  birthDate: string;
  jobTitle: string;
  jobSeekerStatus: string;
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
  "w-full bg-transparent text-sm py-2.5 px-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50";

const EDUCATION_LEVELS = [
  "고등학교 졸업",
  "대학교 재학",
  "대학교 졸업",
  "대학원 석사 재학",
  "대학원 석사 졸업",
  "대학원 박사 재학",
  "대학원 박사 졸업",
];

// ── Component ─────────────────────────────────────────────────────────────────

export const SignUpPage: React.FC<SignUpPageProps> = ({
  onSignUp,
  onSignIn,
  loading = false,
  error,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
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
    birthDate: "",
    jobTitle: "",
    jobSeekerStatus: "",
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
          `${process.env.NEXT_PUBLIC_API_URL}/api/check-email?email=${encodeURIComponent(email)}`,
        );
        const data = await res.json();
        setEmailStatus(data.available ? "available" : "taken");
      } catch {
        setEmailStatus("idle");
      }
    }, 600);
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailStatus === "taken") return;
    if (form.password !== passwordConfirm) {
      setMatchError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setMatchError("");
    setStep(2);
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignUp?.(form);
  };

  const progressWidth = step === 1 ? "33%" : step === 2 ? "66%" : "100%";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0b0713] via-[#110a1e] to-[#0a0610] flex items-center justify-center p-4 md:p-8">
      {/* Floating card */}
      <div className="w-full max-w-6xl flex rounded-2xl overflow-hidden border border-border shadow-2xl h-[620px]">
        {/* Left: form */}
        <section className="w-1/2 flex flex-col p-8 md:p-10 bg-card">
          {/* Logo — 상단 고정 */}
          <div className="signin-element signin-delay-100 flex justify-center mb-6">
            <Image
              src="/logo.svg"
              alt="합격"
              width={220}
              height={76}
              style={{ width: "220px", height: "auto" }}
              priority
            />
          </div>

          {/* Progress — 로고 아래 고정 */}
          <div className="signin-element signin-delay-200 mb-6 max-w-sm mx-auto w-full">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span className={step === 1 ? "text-primary font-medium" : ""}>
                1단계 · 기본 정보
              </span>
              <span className={step === 2 ? "text-primary font-medium" : ""}>
                2단계 · 개인 정보
              </span>
              <span className={step === 3 ? "text-primary font-medium" : ""}>
                3단계 · 커리어
              </span>
            </div>
            <div className="h-1 w-full bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: progressWidth }}
              />
            </div>
          </div>

          {/* Form — 나머지 공간에서 수직 중앙 정렬 */}
          <div className="flex-1 flex items-center justify-center pb-14">
            <div className="w-full max-w-sm">
              {/* Step 1: 이메일, 비밀번호 */}
              {step === 1 && (
                <form className="space-y-3" onSubmit={handleStep1}>
                  <div>
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
                    <p className="flex items-center gap-1 mt-1 pl-1 text-xs h-4">
                      {emailStatus === "checking" && (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                          <span className="text-muted-foreground">
                            확인 중...
                          </span>
                        </>
                      )}
                      {emailStatus === "available" && (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500">
                            사용 가능한 이메일입니다
                          </span>
                        </>
                      )}
                      {emailStatus === "taken" && (
                        <>
                          <XCircle className="w-3 h-3 text-rose-500" />
                          <span className="text-rose-500">
                            이미 사용 중인 이메일입니다
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div>
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

                  <div>
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
                    {matchError && (
                      <p className="text-xs text-rose-500 mt-1 pl-1">
                        {matchError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    다음 단계
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <p className="text-center text-sm text-muted-foreground">
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

              {/* Step 2: 이름/나이, 전화번호, 약관 */}
              {step === 2 && (
                <form className="space-y-3" onSubmit={handleStep2}>
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
                      생년월일
                    </label>
                    <GlassInputWrapper>
                      <input
                        type="date"
                        value={form.birthDate}
                        onChange={(e) => set("birthDate", e.target.value)}
                        className={inputClass}
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </GlassInputWrapper>
                  </div>

                  <div>
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

                  <div className="space-y-2 pt-1">
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
                        onChange={(e) =>
                          set("agreedToPrivacy", e.target.checked)
                        }
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

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-none rounded-2xl border border-border py-3 px-5 hover:bg-secondary transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-2xl bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                      다음 단계
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: 커리어 */}
              {step === 3 && (
                <form className="space-y-3 -mt-2" onSubmit={handleSubmit}>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      희망 직무
                    </label>
                    <GlassInputWrapper>
                      <input
                        type="text"
                        placeholder="예: 백엔드 개발자, 데이터 분석가"
                        value={form.jobTitle}
                        onChange={(e) => set("jobTitle", e.target.value)}
                        className={inputClass}
                      />
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
                      취준 상태
                    </label>
                    <GlassInputWrapper>
                      <select
                        value={form.jobSeekerStatus}
                        onChange={(e) => set("jobSeekerStatus", e.target.value)}
                        className={`${inputClass} appearance-none cursor-pointer`}
                      >
                        <option value="" disabled>
                          선택하세요
                        </option>
                        <option value="신입">신입</option>
                        <option value="경력 1년">경력 1년</option>
                        <option value="경력 2년">경력 2년</option>
                        <option value="경력 3년 이상">경력 3년 이상</option>
                      </select>
                    </GlassInputWrapper>
                  </div>

                  {error && <p className="text-xs text-rose-500">{error}</p>}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-none rounded-2xl border border-border py-3 px-5 hover:bg-secondary transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 rounded-2xl bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
                    >
                      {loading ? "처리 중..." : "가입하기"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Right: visual panel */}
        <section className="hidden md:flex w-1/2 relative overflow-hidden bg-[#0d0a14]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d0a14] via-[#120c1e] to-[#1a0f2e]" />
          <ParticleCanvas />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(139,92,246,0.13),transparent)]" />
        </section>
      </div>
    </div>
  );
};
