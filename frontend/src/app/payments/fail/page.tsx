"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function FailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const message =
    searchParams.get("message") || "결제가 취소되었거나 실패했습니다.";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
      <XCircle className="w-12 h-12 text-destructive" />
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold text-foreground">결제 실패</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <Button onClick={() => router.replace("/pricing")}>다시 시도하기</Button>
    </div>
  );
}

export default function PaymentsFailPage() {
  return (
    <Suspense>
      <FailContent />
    </Suspense>
  );
}
