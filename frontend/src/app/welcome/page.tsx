"use client";

import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { useAuth } from "@/components/auth-provider";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

const CARDS = [
  {
    href: "/",
    label: "자소서 작성",
    sublabel: "Write Cover Letter",
    description: "채용공고를 분석하고\nAI 맞춤 자소서 생성",
    icon: (
      <svg
        className="w-10 h-10"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.3}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 4C15 4 8 9 7 16l1 1c7-1 12-8 12-13Z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16 4 20" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 9 15" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 2v2M21 6h-2M19 2l-1.5 1.5"
        />
      </svg>
    ),
    accent: "from-primary/20 via-primary/5 to-transparent",
    border: "hover:border-primary/50",
    glow: "bg-primary/10",
  },
  {
    href: "/resumes",
    label: "이력서 등록",
    sublabel: "Register Resume",
    description: "이력서를 등록하여\n자소서 개인화",
    icon: (
      <svg
        className="w-10 h-10"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.3}
      >
        <rect
          x="2"
          y="5"
          width="20"
          height="14"
          rx="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="8" cy="11" r="2.2" strokeLinecap="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 9.5h5" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 12.5h4M13 15h3"
        />
      </svg>
    ),
    accent: "from-sky-400/20 via-sky-400/5 to-transparent",
    border: "hover:border-sky-400/50",
    glow: "bg-sky-400/10",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center noise-bg relative overflow-hidden px-6">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/[0.06] rounded-full blur-[120px]" />

      {/* Giant bg text */}
      <motion.div
        className="pointer-events-none select-none absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <span
          className="text-[22vw] font-black tracking-tighter font-heading"
          style={{
            color: "transparent",
            WebkitTextStroke:
              "1px color-mix(in oklch, var(--foreground) 4%, transparent)",
          }}
        >
          AURA
        </span>
      </motion.div>

      <motion.div
        className="relative z-10 flex flex-col items-center gap-12 w-full max-w-3xl"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={item} className="text-center space-y-2">
          {user && (
            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-3">
              Welcome back,{" "}
              <span className="text-foreground font-medium">
                {user.email?.split("@")[0]}
              </span>
            </p>
          )}
          <h1 className="font-heading text-4xl md:text-5xl text-foreground">
            무엇을 시작할까요?
          </h1>
          <p className="text-muted-foreground text-sm">
            원하는 항목을 선택하세요
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={item}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
        >
          {CARDS.map((card) => (
            <motion.button
              key={card.href}
              onClick={() => router.push(card.href)}
              className={`
                group relative rounded-2xl border border-border bg-card
                p-8 text-left overflow-hidden cursor-pointer
                transition-all duration-300 ${card.border}
                hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {/* Card glow background */}
              <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${card.accent}`}
              />

              {/* Icon glow */}
              <div
                className={`absolute top-6 right-6 w-16 h-16 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${card.glow}`}
              />

              <div className="relative flex flex-col gap-5">
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors duration-300">
                  {card.icon}
                </div>

                {/* Text */}
                <div>
                  <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase mb-1">
                    {card.sublabel}
                  </p>
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    {card.label}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {card.description}
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors duration-300 mt-1">
                  <span>시작하기</span>
                  <svg
                    className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform duration-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
