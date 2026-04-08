"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Zap, Star, Building2, LoaderCircle } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

type PlanKey = "free" | "pro" | "enterprise";

const PLANS: {
  key: PlanKey;
  name: string;
  sublabel: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  buttonLabel: string;
  popular: boolean;
  Icon: React.ElementType;
  borderClass: string;
  iconBg: string;
  iconColor: string;
  activeBorder: string;
}[] = [
  {
    key: "free",
    name: "Free",
    sublabel: "무료 체험",
    price: "₩0",
    period: "/ 월",
    desc: "AURA를 부담 없이 경험하세요",
    features: [
      "이력서 1개 등록",
      "월 5회 자소서 생성",
      "기본 채용공고 분석",
      "재생성 불가",
    ],
    buttonLabel: "Free 사용",
    popular: false,
    Icon: Zap,
    borderClass: "border-border",
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    activeBorder: "border-slate-400",
  },
  {
    key: "pro",
    name: "Pro",
    sublabel: "Most Popular",
    price: "₩9,900",
    period: "/ 월",
    desc: "진지한 취준생을 위한 플랜",
    features: [
      "이력서 10개 등록",
      "무제한 자소서 생성",
      "9명 LLM-as-a-Judge 평가",
      "회사 자동 조사 (미션/비전)",
      "월 5회 피드백 재생성",
      "생성 히스토리 무제한",
    ],
    buttonLabel: "Pro 시작하기",
    popular: true,
    Icon: Star,
    borderClass: "border-primary/50",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    activeBorder: "border-primary",
  },
  {
    key: "enterprise",
    name: "Enterprise",
    sublabel: "팀 플랜",
    price: "₩29,900",
    period: "/ 월",
    desc: "취업 컨설팅 팀을 위한 플랜",
    features: [
      "이력서 무제한 등록",
      "무제한 자소서 생성",
      "무제한 재생성",
      "팀 멤버 지원",
      "우선 고객 지원",
      "API 액세스",
    ],
    buttonLabel: "Enterprise 시작하기",
    popular: false,
    Icon: Building2,
    borderClass: "border-border",
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    activeBorder: "border-amber-400",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "1";

  const [currentPlan, setCurrentPlan] = useState<PlanKey | null>(null);
  const [changing, setChanging] = useState<PlanKey | null>(null);

  useEffect(() => {
    if (isOnboarding) return; // 신규 가입 플로우 — 현재 플랜 불필요
    api
      .getUsage()
      .then((u) => setCurrentPlan(u.plan))
      .catch(() => setCurrentPlan(null));
  }, [isOnboarding]);

  const handleSelect = async (key: PlanKey) => {
    if (!isOnboarding && key === currentPlan) return;
    setChanging(key);
    try {
      await api.changePlan(key);
      setCurrentPlan(key);
      const name = PLANS.find((p) => p.key === key)?.name;
      toast.success(`${name} 플랜으로 시작합니다!`);
      setTimeout(() => router.push(isOnboarding ? "/welcome" : "/mypage"), 800);
    } catch {
      toast.error("플랜 변경에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setChanging(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center noise-bg relative overflow-hidden px-6 py-16">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/[0.06] rounded-full blur-[120px]" />

      <motion.div
        className="relative z-10 w-full max-w-5xl flex flex-col items-center gap-12"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={item} className="text-center space-y-3">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            AURA Pricing
          </p>
          <h1 className="font-heading text-4xl md:text-5xl text-foreground">
            플랜을 선택하세요
          </h1>
        </motion.div>

        {/* Plan cards */}
        <motion.div
          variants={item}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
        >
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const isChanging = changing === plan.key;

            return (
              <div key={plan.key} className="relative flex flex-col">
                {plan.popular && !(isCurrent && !isOnboarding) && (
                  <div className="absolute -top-3.5 left-0 right-0 flex justify-center z-10">
                    <span className="bg-primary text-primary-foreground text-[11px] font-semibold tracking-wider px-3 py-1 rounded-full uppercase">
                      Most Popular
                    </span>
                  </div>
                )}
                {!isOnboarding && isCurrent && (
                  <div className="absolute -top-3.5 left-0 right-0 flex justify-center z-10">
                    <span className="bg-emerald-500 text-white text-[11px] font-semibold tracking-wider px-3 py-1 rounded-full">
                      현재 플랜
                    </span>
                  </div>
                )}
                <Card
                  className={`flex flex-col flex-1 transition-all ${
                    isCurrent
                      ? `${plan.activeBorder} shadow-lg ring-1 ring-inset ring-white/5`
                      : plan.borderClass
                  } ${plan.popular && !isCurrent ? "shadow-lg shadow-primary/10" : ""}`}
                >
                  <CardHeader className="border-b border-border p-6 gap-0">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`w-9 h-9 rounded-lg ${plan.iconBg} flex items-center justify-center shrink-0`}
                      >
                        <plan.Icon
                          className={`w-4 h-4 ${plan.iconColor}`}
                          strokeWidth={2}
                        />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                          {plan.sublabel}
                        </p>
                        <h2 className="text-base font-semibold text-foreground leading-tight">
                          {plan.name}
                        </h2>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-bold text-foreground">
                        {plan.price}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {plan.period}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.desc}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1 p-6 gap-6">
                    <ul className="space-y-2.5 flex-1">
                      {plan.features.map((feature, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-foreground/80"
                        >
                          <Check
                            className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0"
                            strokeWidth={3}
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={
                        isCurrent
                          ? "outline"
                          : plan.key === "pro"
                            ? "default"
                            : "outline"
                      }
                      className="w-full"
                      disabled={
                        (!isOnboarding && isCurrent) ||
                        isChanging ||
                        changing !== null
                      }
                      onClick={() => handleSelect(plan.key)}
                    >
                      {isChanging ? (
                        <span className="flex items-center gap-2">
                          <LoaderCircle className="w-4 h-4 animate-spin" />
                          변경 중...
                        </span>
                      ) : isCurrent ? (
                        "현재 플랜"
                      ) : (
                        plan.buttonLabel
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </motion.div>

        {/* Back button */}
        <motion.button
          variants={item}
          onClick={() => router.back()}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← 돌아가기
        </motion.button>
      </motion.div>
    </div>
  );
}
