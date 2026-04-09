"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supportApi, type SupportTicket, type SupportReply } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";

const CATEGORY_LABEL: Record<string, string> = {
  complaint: "이용 불편사항",
  suggestion: "제안 사항",
  general: "일반 요청 사항",
};

const STATUS_LABEL: Record<string, string> = {
  open: "접수",
  in_progress: "처리중",
  closed: "완료",
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-amber-900/50 text-white",
  in_progress: "bg-sky-900/50 text-white",
  closed: "bg-zinc-700 text-white",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function SupportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supportApi
      .getOne(Number(id))
      .then(setTicket)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {error ?? "문의를 찾을 수 없습니다"}
          </p>
          <Link
            href="/support"
            className="text-xs text-violet-400 hover:underline"
          >
            문의 목록으로
          </Link>
        </div>
      </div>
    );
  }

  const replies: SupportReply[] = ticket.replies ?? [];

  return (
    <div className="min-h-screen bg-background px-4 py-12 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 뒤로가기 */}
        <button
          onClick={() => router.back()}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          ← 목록으로
        </button>

        {/* 티켓 헤더 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {CATEGORY_LABEL[ticket.category] ?? ticket.category}
            </span>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded ${STATUS_COLOR[ticket.status]}`}
            >
              {STATUS_LABEL[ticket.status]}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {fmt(ticket.created_at)}
            </span>
          </div>
          <h1 className="text-xl font-bold text-foreground">{ticket.title}</h1>
        </div>

        {/* 대화 스레드 */}
        <div className="space-y-3">
          {/* 원본 문의 */}
          <MessageBubble
            senderType="user"
            content={ticket.content}
            createdAt={ticket.created_at}
          />

          {/* 답변 목록 */}
          {replies.map((r) => (
            <MessageBubble
              key={r.id}
              senderType={r.sender_type}
              content={r.content}
              createdAt={r.created_at}
            />
          ))}

          {replies.length === 0 && ticket.status !== "closed" && (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                아직 답변이 등록되지 않았습니다. 빠른 시일 내 안내드리겠습니다.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

const MessageBubble = ({
  senderType,
  content,
  createdAt,
}: {
  senderType: "admin" | "user";
  content: string;
  createdAt: string;
}) => {
  const isAdmin = senderType === "admin";
  return (
    <div className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[85%] space-y-1 ${isAdmin ? "" : ""}`}>
        <p
          className={`text-[11px] font-medium ${isAdmin ? "text-violet-400" : "text-muted-foreground text-right"}`}
        >
          {isAdmin ? "합격 고객센터" : "나"}
        </p>
        <div
          className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
            isAdmin
              ? "bg-background border border-border text-foreground rounded-tl-sm"
              : "bg-background border border-border text-foreground rounded-tr-sm"
          }`}
        >
          {content}
        </div>
        <p
          className={`text-[11px] text-muted-foreground ${isAdmin ? "text-left" : "text-right"}`}
        >
          {fmt(createdAt)}
        </p>
      </div>
    </div>
  );
};
