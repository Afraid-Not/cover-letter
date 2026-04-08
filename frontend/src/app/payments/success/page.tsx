"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const authKey = searchParams.get("authKey");
    const customerKey = searchParams.get("customerKey");
    const planKey = searchParams.get("planKey");
    const isOnboarding = searchParams.get("onboarding") === "1";

    if (!authKey || !customerKey || !planKey) {
      router.replace("/pricing");
      return;
    }

    api
      .billingAuth({
        auth_key: authKey,
        customer_key: customerKey,
        plan: planKey,
      })
      .then(() => {
        const name = planKey === "pro" ? "Pro" : "Enterprise";
        toast.success(`${name} 플랜이 활성화되었습니다!`);
        router.replace(isOnboarding ? "/welcome" : "/mypage");
      })
      .catch((err: Error) => {
        toast.error(err.message || "결제 처리에 실패했습니다.");
        router.replace("/pricing");
      });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
      <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm">결제를 처리하는 중입니다...</p>
    </div>
  );
}

export default function PaymentsSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
