"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";

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

const GROUP_LABELS: Record<
  string,
  { short: string; color: string; barColor: string }
> = {
  "HR 인사담당자": {
    short: "HR",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    barColor: "bg-blue-500",
  },
  "현업 팀장": {
    short: "DEV",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    barColor: "bg-emerald-500",
  },
  "채용 리더": {
    short: "CXO",
    color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    barColor: "bg-violet-500",
  },
};

const scoreColor = (score: number) => {
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-red-400";
};

const GroupCard = ({ group, data }: { group: string; data: GroupData }) => {
  const [open, setOpen] = useState(false);
  const meta = GROUP_LABELS[group] ?? {
    short: "?",
    color: "bg-muted text-muted-foreground border-border",
    barColor: "bg-primary",
  };
  const prob = data.avg_pass_probability;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs font-bold px-2 py-0.5 ${meta.color}`}
            >
              {meta.short}
            </Badge>
            <span className="text-sm font-semibold">{group}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-foreground">
              {Number(prob).toFixed(1)}%
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${meta.barColor}`}
            style={{ width: `${prob}%` }}
          />
        </div>
      </button>

      {open && (
        <CardContent className="px-5 pb-4 pt-0 space-y-3 border-t border-border">
          {Object.entries(data.criteria).map(([criterion, info]) => (
            <div key={criterion}>
              <div className="flex justify-between text-xs mb-1 mt-3">
                <span className="text-muted-foreground">{criterion}</span>
                <span
                  className={`font-mono font-bold ${scoreColor(info.avg_score)}`}
                >
                  {info.avg_score}
                </span>
              </div>
              <Progress value={info.avg_score * 10} className="h-1.5" />
              {info.comments[0] && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {info.comments[0]}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
};

const FeedbackCard = ({ feedbacks }: { feedbacks: string[] }) => {
  const [open, setOpen] = useState(false);
  const unique = [...new Set(feedbacks)].slice(0, 5);
  if (unique.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 hover:bg-accent/30 transition-colors flex items-center justify-between"
      >
        <span className="text-sm font-semibold">주요 피드백</span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <CardContent className="px-5 pb-4 pt-0 border-t border-border">
          <ul className="space-y-2 mt-3">
            {unique.map((fb, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-foreground/40 shrink-0">-</span>
                {fb}
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
};

export const EvaluationCard = ({ result }: { result: EvaluationResult }) => {
  const prob = result.overall_pass_probability;

  return (
    <div className="space-y-4">
      {/* 종합 통과 확률 */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xl font-bold text-foreground">서류 통과 확률</p>
            <span className="text-3xl font-bold text-primary">
              {Number(prob).toFixed(1)}%
            </span>
          </div>
          <div className="relative h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-700"
              style={{ width: `${prob}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 그룹별 점수 */}
      <div className="space-y-3">
        {Object.entries(result.groups).map(([group, data]) => (
          <GroupCard key={group} group={group} data={data} />
        ))}
        <FeedbackCard feedbacks={result.all_feedback} />
      </div>
    </div>
  );
};

export const EvaluationFeedback = (_: { result: EvaluationResult }) => null;
