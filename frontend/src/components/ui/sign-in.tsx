import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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

const TestimonialCard = ({
  testimonial,
  delay,
}: {
  testimonial: Testimonial;
  delay: string;
}) => (
  <div
    className={`signin-testimonial ${delay} flex items-start gap-3 rounded-3xl bg-card/40 backdrop-blur-xl border border-white/10 p-5 w-64`}
  >
    <img
      src={testimonial.avatarSrc}
      className="h-10 w-10 object-cover rounded-2xl"
      alt="avatar"
    />
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-medium">{testimonial.name}</p>
      <p className="text-muted-foreground">{testimonial.handle}</p>
      <p className="mt-1 text-foreground/80">{testimonial.text}</p>
    </div>
  </div>
);

export const SignInPage: React.FC<SignInPageProps> = ({
  title = (
    <span className="font-light text-foreground tracking-tighter">Welcome</span>
  ),
  description = "계정에 로그인하고 여정을 이어가세요",
  heroImageSrc,
  testimonials = [],
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
    <div className="h-[100dvh] flex flex-col md:flex-row w-[100dvw]">
      {/* Left: sign-in form */}
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <h1 className="signin-element signin-delay-100 text-4xl md:text-5xl font-semibold leading-tight">
              {title}
            </h1>
            <p className="signin-element signin-delay-200 text-muted-foreground">
              {description}
            </p>

            <form className="space-y-5" onSubmit={onSignIn}>
              <div className="signin-element signin-delay-300">
                <label className="text-sm font-medium text-muted-foreground">
                  이메일
                </label>
                <GlassInputWrapper>
                  <input
                    name="email"
                    type="email"
                    placeholder="이메일 주소를 입력하세요"
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                    required
                  />
                </GlassInputWrapper>
              </div>

              <div className="signin-element signin-delay-400">
                <label className="text-sm font-medium text-muted-foreground">
                  비밀번호
                </label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="비밀번호를 입력하세요"
                      className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none"
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
                <p className="signin-element text-xs text-rose-500">{error}</p>
              )}

              <div className="signin-element signin-delay-500 flex items-center justify-end text-sm">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onResetPassword?.();
                  }}
                  className="hover:underline text-primary transition-colors"
                >
                  비밀번호 재설정
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="signin-element signin-delay-600 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {loading ? "처리 중..." : "로그인"}
              </button>
            </form>

            {/* Divider */}
            <div className="signin-element signin-delay-700 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">또는</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Social login buttons */}
            <div className="signin-element signin-delay-800 space-y-3">
              <button
                type="button"
                onClick={() => onGoogleLogin?.()}
                className="w-full rounded-2xl border border-border bg-foreground/5 py-3.5 text-sm font-medium hover:bg-foreground/10 transition-colors flex items-center justify-center gap-3"
              >
                <GoogleIcon />
                Google로 계속하기
              </button>
              <button
                type="button"
                onClick={() => onKakaoLogin?.()}
                className="w-full rounded-2xl py-3.5 text-sm font-medium transition-colors flex items-center justify-center gap-3 bg-[#FEE500] text-[#3C1E1E] hover:bg-[#FDD800]"
              >
                <KakaoIcon />
                카카오로 계속하기
              </button>
            </div>

            <p className="signin-element signin-delay-900 text-center text-sm text-muted-foreground">
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

      {/* Right: hero image + testimonials */}
      {heroImageSrc && (
        <section className="hidden md:block flex-1 relative p-4">
          <div
            className="signin-slide-right signin-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
          />
          {testimonials.length > 0 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center">
              <TestimonialCard
                testimonial={testimonials[0]}
                delay="signin-delay-1000"
              />
              {testimonials[1] && (
                <div className="hidden xl:flex">
                  <TestimonialCard
                    testimonial={testimonials[1]}
                    delay="signin-delay-1200"
                  />
                </div>
              )}
              {testimonials[2] && (
                <div className="hidden 2xl:flex">
                  <TestimonialCard
                    testimonial={testimonials[2]}
                    delay="signin-delay-1400"
                  />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
