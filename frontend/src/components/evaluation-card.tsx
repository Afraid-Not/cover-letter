"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface CriterionInfo {
  avg_score: number;
  comments: string[];
}

interface GroupData {
  criteria: Record<string, CriterionInfo>;
  avg_pass_probability: number;
  feedbacks: string[];
}

interface EvaluationResult {
  groups: Record<string, GroupData>;
  overall_pass_probability: number;
  all_feedback: string[];
  aggregated_feedback: string;
}

const GROUP_LABELS: Record<string, { emoji: string; color: string }> = {
  "HR 인사담당자": { emoji: "HR", color: "bg-blue-500/20 text-blue-400" },
  "현업 팀장": { emoji: "DEV", color: "bg-green-500/20 text-green-400" },
  "채용 리더": { emoji: "CXO", color: "bg-purple-500/20 text-purple-400" },
};

const scoreColor = (score: number) => {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-yellow-400";
  return "text-red-400";
};

export const EvaluationCard = ({ result }: { result: EvaluationResult }) => {
  const prob = result.overall_pass_probability;

  return (
    <div className="space-y-4">
      {/* 종합 점수 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">
              서류 통과 확률
            </span>
            <span className={`text-3xl font-bold ${scoreColor(prob / 10)}`}>
              {prob}%
            </span>
          </div>
          <Progress value={prob} className="h-2" />
        </CardContent>
      </Card>

      {/* 그룹별 점수 */}
      <div className="grid grid-cols-1 gap-4">
        {Object.entries(result.groups).map(([group, data]) => {
          const meta = GROUP_LABELS[group] || { emoji: "?", color: "bg-muted" };
          return (
            <Card key={group}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={meta.color}>
                    {meta.emoji}
                  </Badge>
                  <CardTitle className="text-sm">{group}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">
                  평균 {data.avg_pass_probability}%
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(data.criteria).map(([criterion, info]) => (
                  <div key={criterion}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{criterion}</span>
                      <span
                        className={`font-mono font-bold ${scoreColor(info.avg_score)}`}
                      >
                        {info.avg_score}
                      </span>
                    </div>
                    <Progress value={info.avg_score * 10} className="h-1.5" />
                    {info.comments[0] && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {info.comments[0]}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export const EvaluationFeedback = ({
  result,
}: {
  result: EvaluationResult;
}) => {
  if (result.all_feedback.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">주요 피드백</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {[...new Set(result.all_feedback)].slice(0, 5).map((fb, i) => (
            <li key={i} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-foreground/50 shrink-0">-</span>
              {fb}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
