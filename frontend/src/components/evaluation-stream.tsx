"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { EvaluatorEvent } from "@/lib/api";

const GROUP_COLORS: Record<string, string> = {
  "HR 인사담당자": "bg-blue-500/20 text-blue-400",
  "현업 팀장": "bg-green-500/20 text-green-400",
  "채용 리더": "bg-purple-500/20 text-purple-400",
};

const scoreColor = (score: number) => {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-yellow-400";
  return "text-red-400";
};

export const EvaluationStream = ({ events }: { events: EvaluatorEvent[] }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-muted-foreground">평가 진행 중</span>
        <Badge variant="secondary">{events.length} / 9</Badge>
        <Progress value={(events.length / 9) * 100} className="flex-1 h-1.5" />
      </div>

      {events.map((ev, i) => {
        const color = GROUP_COLORS[ev.group] || "bg-muted";

        if (ev.error || !ev.result) {
          return (
            <Card key={i} className="opacity-50">
              <CardContent className="pt-3 pb-3 flex items-center gap-3">
                <Badge variant="secondary" className={color}>
                  {ev.group}
                </Badge>
                <span className="text-xs text-destructive">평가 실패</span>
              </CardContent>
            </Card>
          );
        }

        const { scores, pass_probability, feedback } = ev.result;

        return (
          <Card key={i}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className={color}>
                  {ev.group}
                </Badge>
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {ev.background}...
                </span>
                <span
                  className={`text-sm font-bold font-mono ${scoreColor(pass_probability / 10)}`}
                >
                  {pass_probability}%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-2">
                {Object.entries(scores).map(([criterion, info]) => (
                  <div key={criterion} className="text-xs">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-muted-foreground truncate">
                        {criterion}
                      </span>
                      <span
                        className={`font-mono font-bold ${scoreColor(info.score)}`}
                      >
                        {info.score}
                      </span>
                    </div>
                    <Progress value={info.score * 10} className="h-1" />
                    <p className="text-muted-foreground mt-0.5 truncate">
                      {info.comment}
                    </p>
                  </div>
                ))}
              </div>

              {feedback && (
                <p className="text-xs text-muted-foreground border-t border-border pt-2">
                  {feedback}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
