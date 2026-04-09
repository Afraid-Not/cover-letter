"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supportApi, type SupportTicket } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  { value: "complaint", label: "이용 불편사항" },
  { value: "suggestion", label: "제안 사항" },
  { value: "general", label: "일반 요청 사항" },
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  complaint: "이용 불편",
  suggestion: "제안",
  general: "일반 요청",
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

export default function SupportPage() {
  const [tab, setTab] = useState<"new" | "history">("new");

  // 문의 작성 상태
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 내 문의 내역
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    if (tab === "history") {
      setLoadingTickets(true);
      supportApi
        .listMy()
        .then(setTickets)
        .catch(() => {})
        .finally(() => setLoadingTickets(false));
    }
  }, [tab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      setFormError("카테고리를 선택해주세요");
      return;
    }
    if (!title.trim()) {
      setFormError("제목을 입력해주세요");
      return;
    }
    if (!content.trim()) {
      setFormError("내용을 입력해주세요");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await supportApi.submit({
        category,
        title: title.trim(),
        content: content.trim(),
      });
      setSubmitted(true);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setCategory("");
    setTitle("");
    setContent("");
  };

  return (
    <div className="min-h-screen bg-background px-4 py-12 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">고객센터</h1>
          <p className="text-sm text-muted-foreground mt-1">
            불편사항, 개선 제안, 또는 일반 문의사항을 남겨주세요.
          </p>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-border">
          {(["new", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                if (t === "new") resetForm();
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-violet-500 text-violet-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "new" ? "새 문의" : "문의 내역"}
            </button>
          ))}
        </div>

        {/* 새 문의 탭 */}
        {tab === "new" &&
          (submitted ? (
            <Card className="bg-card border-border text-center">
              <CardContent className="pt-10 pb-10 space-y-4">
                <div className="text-4xl">✉️</div>
                <h2 className="text-xl font-semibold text-foreground">
                  문의가 접수되었습니다
                </h2>
                <p className="text-sm text-muted-foreground">
                  빠른 시일 내에 검토 후 안내드리겠습니다.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={resetForm}>
                    새 문의 작성
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTab("history");
                      resetForm();
                    }}
                  >
                    문의 내역 보기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  문의 작성
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      카테고리 <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    >
                      <option value="" disabled>
                        카테고리를 선택해주세요
                      </option>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      제목 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="문의 제목을 입력해주세요"
                      maxLength={100}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      내용 <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="문의 내용을 자세히 입력해주세요"
                      rows={6}
                      maxLength={2000}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                    />
                    <p className="text-right text-[11px] text-muted-foreground">
                      {content.length} / 2000
                    </p>
                  </div>

                  {formError && (
                    <p className="text-xs text-red-400 bg-red-900/20 border border-red-900/40 rounded px-3 py-2">
                      {formError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full text-white"
                    style={{ backgroundColor: "#ca6444" }}
                  >
                    {submitting ? "제출 중..." : "문의 제출"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}

        {/* 문의 내역 탭 */}
        {tab === "history" && (
          <div className="space-y-3">
            {loadingTickets && (
              <p className="text-sm text-muted-foreground text-center py-8">
                불러오는 중...
              </p>
            )}
            {!loadingTickets && tickets.length === 0 && (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  접수한 문의가 없습니다.
                </CardContent>
              </Card>
            )}
            {tickets.map((t) => (
              <Link key={t.id} href={`/support/${t.id}`}>
                <Card className="bg-card border-border hover:border-violet-500/50 transition-colors cursor-pointer">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-muted-foreground">
                            {CATEGORY_LABEL[t.category] ?? t.category}
                          </span>
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded ${STATUS_COLOR[t.status]}`}
                          >
                            {STATUS_LABEL[t.status]}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {t.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t.content}
                        </p>
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(t.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {tab === "new" && !submitted && (
          <p className="text-center text-xs text-muted-foreground">
            문의는 영업일 기준 1~3일 내 검토됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
