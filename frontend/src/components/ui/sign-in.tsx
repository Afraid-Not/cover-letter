import React, { useState, useRef, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";

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

// ── Icons ─────────────────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const KakaoIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-5 h-5"
    aria-hidden="true"
    fill="#3C1E1E"
  >
    <path d="M12 3C6.477 3 2 6.477 2 10.917c0 2.874 1.693 5.394 4.24 6.917l-.978 3.63a.27.27 0 0 0 .411.3L9.87 19.23A11.8 11.8 0 0 0 12 19.5c5.523 0 10-3.477 10-7.583S17.523 3 12 3z" />
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
  onGoogleLogin?: () => void;
  onKakaoLogin?: () => void;
  loading?: boolean;
  error?: string;
}

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-primary/70 focus-within:bg-primary/5">
    {children}
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

export const SignInPage: React.FC<SignInPageProps> = ({
  title = (
    <span className="font-light text-foreground tracking-tighter">Welcome</span>
  ),
  description = "자소서 완성, 여기서 다시 시작하세요",
  onSignIn,
  onResetPassword,
  onCreateAccount,
  onGoogleLogin,
  onKakaoLogin,
  loading = false,
  error,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0b0713] via-[#110a1e] to-[#0a0610] flex items-center justify-center p-4 md:p-8">
      {/* Floating card */}
      <div className="w-full max-w-6xl flex rounded-2xl overflow-hidden border border-border shadow-2xl h-[620px]">
        {/* Left: form */}
        <section className="w-1/2 flex flex-col p-8 md:p-10 bg-card">
          {/* Logo — pinned at top, same position as signup */}
          <div className="signin-element signin-delay-100 flex flex-col items-center text-center mb-6">
            {title}
            <p className="signin-element signin-delay-200 text-foreground font-semibold text-sm mt-2">
              {description}
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-sm">
              <form className="space-y-4" onSubmit={onSignIn}>
                <div className="signin-element signin-delay-300">
                  <label className="text-sm font-medium text-muted-foreground">
                    이메일
                  </label>
                  <GlassInputWrapper>
                    <input
                      name="email"
                      type="email"
                      placeholder="이메일 주소를 입력하세요"
                      className="w-full bg-transparent text-sm py-3 px-4 rounded-2xl focus:outline-none"
                      required
                    />
                  </GlassInputWrapper>
                </div>

                <div className="signin-element signin-delay-400">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">
                      비밀번호
                    </label>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        onResetPassword?.();
                      }}
                      className="text-xs hover:underline text-primary transition-colors"
                    >
                      비밀번호 재설정
                    </a>
                  </div>
                  <GlassInputWrapper>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="비밀번호를 입력하세요"
                        className="w-full bg-transparent text-sm py-3 px-4 pr-12 rounded-2xl focus:outline-none"
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

                {error && (
                  <p className="signin-element text-xs text-rose-500">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="signin-element signin-delay-600 w-full rounded-2xl bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 !mt-6"
                >
                  {loading ? "처리 중..." : "로그인"}
                </button>
              </form>

              <div className="signin-element signin-delay-700 flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">또는</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="signin-element signin-delay-800 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onGoogleLogin?.()}
                  className="rounded-2xl border border-border bg-foreground/5 py-2.5 hover:bg-foreground/10 transition-colors flex items-center justify-center"
                >
                  <GoogleIcon />
                </button>
                <button
                  type="button"
                  onClick={() => onKakaoLogin?.()}
                  className="rounded-2xl py-2.5 transition-colors flex items-center justify-center bg-[#FEE500] hover:bg-[#FDD800]"
                >
                  <KakaoIcon />
                </button>
              </div>

              <p className="signin-element signin-delay-900 text-center text-sm text-muted-foreground mt-5">
                계정이 없나요?{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onCreateAccount?.();
                  }}
                  className="text-primary hover:underline transition-colors"
                >
                  회원가입
                </a>
              </p>
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
