"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EvaluationCard } from "@/components/evaluation-card";
import { api } from "@/lib/api";

interface GenerationItem {
  id: number;
  question: string;
  mode: string;
  char_limit: number | null;
  created_at: string;
  company: string;
  position: string;
}

interface GenerationDetail {
  id: number;
  job_posting: string;
  job_analysis: Record<string, unknown>;
  question: string;
  mode: string;
  answer: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluation: any;
  char_limit: number | null;
  created_at: string;
}

export default function HistoryPage() {
  const [items, setItems] = useState<GenerationItem[]>([]);
  const [selected, setSelected] = useState<GenerationDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .listGenerations()
      .then(setItems)
      .catch(() => {});
  }, []);

  const handleSelect = async (id: number) => {
    if (selected?.id === id) {
      setSelected(null);
      return;
    }
    setLoading(true);
    try {
      const detail = await api.getGeneration(id);
      setSelected(detail);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">생성 이력</h2>
        <p className="text-muted-foreground text-sm mt-1">
          이전에 생성한 자소서와 평가 결과를 다시 볼 수 있습니다
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            아직 생성 이력이 없습니다
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card
              key={item.id}
              className={`cursor-pointer transition-colors hover:bg-accent/30 ${selected?.id === item.id ? "ring-1 ring-primary" : ""}`}
              onClick={() => handleSelect(item.id)}
            >
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="shrink-0">
                      {item.company || "?"}
                    </Badge>
                    <Badge variant="outline" className="shrink-0">
                      {item.position || "?"}
                    </Badge>
                    <Badge variant="outline" className="shrink-0">
                      {item.mode === "general" ? "일반" : "질문"}
                    </Badge>
                  </div>
                  <p className="text-sm truncate text-muted-foreground">
                    {item.question}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-4">
                  {item.created_at?.slice(0, 10)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      )}

      {selected && (
        <>
          <Separator />

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">자소서</CardTitle>
                <div className="flex items-center gap-2">
                  {selected.char_limit && (
                    <Badge variant="secondary">
                      {selected.answer.length}/{selected.char_limit}자
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigator.clipboard.writeText(selected.answer)
                    }
                  >
                    복사
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 rounded-lg p-4">
                {selected.answer}
              </div>
            </CardContent>
          </Card>

          {selected.evaluation && (
            <EvaluationCard result={selected.evaluation} />
          )}
        </>
      )}
    </div>
  );
}
