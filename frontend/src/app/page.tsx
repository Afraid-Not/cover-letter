"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EvaluationCard } from "@/components/evaluation-card";
import { EvaluationStream } from "@/components/evaluation-stream";
import { api } from "@/lib/api";
import type { EvaluatorEvent } from "@/lib/api";

type Step = "input" | "generating" | "evaluating" | "done";

interface Resume {
  id: number;
  name: string;
  updated_at: string;
}

export default function GeneratePage() {
  const [step, setStep] = useState<Step>("input");
  const [mode, setMode] = useState<"question" | "general">("general");
  const [question, setQuestion] = useState("");
  const [charLimit, setCharLimit] = useState("");
  const [jobPosting, setJobPosting] = useState("");
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [jobFileLoading, setJobFileLoading] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);

  const [answer, setAnswer] = useState("");
  const [jobAnalysis, setJobAnalysis] = useState<Record<
    string,
    unknown
  > | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [evalResult, setEvalResult] = useState<any>(null);
  const [charCount, setCharCount] = useState(0);
  const [evalEvents, setEvalEvents] = useState<EvaluatorEvent[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listResumes()
      .then(setResumes)
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setError("");
    setStep("generating");

    try {
      const effectiveQuestion =
        mode === "general"
          ? "이 채용공고에 맞는 자기소개서를 작성해주세요. 지원동기, 직무 관련 경험과 역량, 입사 후 포부를 포함해주세요."
          : question;

      const result = await api.generate({
        question: effectiveQuestion,
        job_posting: jobPosting,
        resume_id: selectedResumeId ?? undefined,
        resume_text: selectedResumeId ? undefined : resumeText,
        char_limit: charLimit ? parseInt(charLimit) : undefined,
      });

      setAnswer(result.answer);
      setJobAnalysis(result.job_analysis);
      setCharCount(result.char_count);
      setStep("evaluating");
      setEvalEvents([]);

      const evalRes = await api.evaluateStream(
        {
          question: effectiveQuestion,
          answer: result.answer,
          job_analysis: result.job_analysis,
        },
        (ev) => setEvalEvents((prev) => [...prev, ev]),
      );

      setEvalResult(evalRes);
      setStep("done");

      // DB에 저장
      api
        .saveGeneration({
          job_posting: jobPosting,
          job_analysis: result.job_analysis,
          question: effectiveQuestion,
          mode,
          resume_id: selectedResumeId ?? undefined,
          answer: result.answer,
          evaluation: evalRes,
          char_limit: charLimit ? parseInt(charLimit) : undefined,
        })
        .catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "API error");
      setStep("input");
    }
  };

  const handleRegenerate = async () => {
    if (!evalResult || !jobAnalysis) return;
    setStep("generating");

    try {
      const effectiveQuestion =
        mode === "general"
          ? "이 채용공고에 맞는 자기소개서를 작성해주세요. 지원동기, 직무 관련 경험과 역량, 입사 후 포부를 포함해주세요."
          : question;

      const result = await api.generate({
        question: effectiveQuestion,
        job_posting: jobPosting,
        resume_id: selectedResumeId ?? undefined,
        resume_text: selectedResumeId ? undefined : resumeText,
        char_limit: charLimit ? parseInt(charLimit) : undefined,
        feedback: evalResult.aggregated_feedback,
      });

      setAnswer(result.answer);
      setCharCount(result.char_count);
      setStep("evaluating");
      setEvalEvents([]);

      const evalRes = await api.evaluateStream(
        {
          question: effectiveQuestion,
          answer: result.answer,
          job_analysis: jobAnalysis!,
        },
        (ev) => setEvalEvents((prev) => [...prev, ev]),
      );

      setEvalResult(evalRes);
      setStep("done");

      api
        .saveGeneration({
          job_posting: jobPosting,
          job_analysis: jobAnalysis!,
          question: effectiveQuestion,
          mode,
          resume_id: selectedResumeId ?? undefined,
          answer: result.answer,
          evaluation: evalRes,
          char_limit: charLimit ? parseInt(charLimit) : undefined,
        })
        .catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "API error");
      setStep("done");
    }
  };

  const isLoading = step === "generating" || step === "evaluating";
  const canSubmit =
    jobPosting &&
    (selectedResumeId || resumeText) &&
    (mode === "general" || question);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">자소서 생성</h2>
        <p className="text-muted-foreground text-sm mt-1">
          채용공고 + 이력서 + 질문을 입력하면 합격 자소서 기반으로 답변을
          생성합니다
        </p>
      </div>

      {/* 입력 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant="outline">1</Badge>
              채용공고
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="채용공고 전문을 붙여넣으세요..."
              value={jobPosting}
              onChange={(e) => setJobPosting(e.target.value)}
              rows={6}
              disabled={isLoading}
            />
            <div className="flex items-center gap-2">
              <label
                htmlFor="job-pdf"
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-input text-xs cursor-pointer transition-colors hover:bg-accent ${jobFileLoading ? "opacity-50 pointer-events-none" : ""}`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                  />
                </svg>
                {jobFileLoading ? "추출 중..." : "스크린샷 / PDF 업로드"}
                <input
                  id="job-pdf"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.gif,.pdf"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setJobFile(file);
                    setJobFileLoading(true);
                    try {
                      const res = await api.parseImage(file);
                      setJobPosting(res.text);
                    } catch {
                      // handle error
                    } finally {
                      setJobFileLoading(false);
                    }
                  }}
                  disabled={isLoading}
                />
              </label>
              {jobFile && (
                <span className="text-xs text-muted-foreground">
                  {jobFile.name}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant="outline">2</Badge>
              이력서
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resumes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">저장된 이력서</p>
                <div className="flex flex-wrap gap-2">
                  {resumes.map((r) => (
                    <Button
                      key={r.id}
                      variant={
                        selectedResumeId === r.id ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        setSelectedResumeId(
                          selectedResumeId === r.id ? null : r.id,
                        );
                        if (selectedResumeId !== r.id) setResumeText("");
                      }}
                      disabled={isLoading}
                    >
                      {r.name}
                    </Button>
                  ))}
                </div>
                <Separator />
              </div>
            )}
            <Textarea
              placeholder={
                selectedResumeId
                  ? "저장된 이력서 선택됨"
                  : "이력서를 붙여넣으세요..."
              }
              value={resumeText}
              onChange={(e) => {
                setResumeText(e.target.value);
                setSelectedResumeId(null);
              }}
              rows={resumes.length > 0 ? 4 : 8}
              disabled={isLoading || !!selectedResumeId}
            />
          </CardContent>
        </Card>
      </div>

      {/* 작성 모드 + 질문 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant="outline">3</Badge>
              작성 모드
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant={mode === "general" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("general")}
              >
                일반 자소서
              </Button>
              <Button
                variant={mode === "question" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("question")}
              >
                질문 답변
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {mode === "general" ? (
            <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              채용공고와 이력서를 기반으로 지원동기, 직무 역량, 경험, 입사 후
              포부를 포함한 자기소개서를 자동 생성합니다.
            </p>
          ) : (
            <Textarea
              placeholder="예: 팀워크를 발휘해 공동 목표 달성에 기여한 경험을 서술하세요."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              disabled={isLoading}
            />
          )}
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="글자수 제한 (선택)"
              value={charLimit}
              onChange={(e) => setCharLimit(e.target.value)}
              className="w-40 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              disabled={isLoading}
            />
            <Button
              onClick={handleGenerate}
              disabled={!canSubmit || isLoading}
              className="ml-auto"
            >
              {step === "generating"
                ? "생성 중..."
                : step === "evaluating"
                  ? "평가 중 (9명)..."
                  : "생성하기"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* 결과 영역 */}
      {answer && (
        <>
          <Separator />

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">생성된 자소서</CardTitle>
                {charLimit && (
                  <Badge
                    variant={
                      charCount > parseInt(charLimit)
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {charCount}/{charLimit}자
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 rounded-lg p-4">
                {answer}
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(answer)}
                >
                  복사
                </Button>
                {step === "done" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                  >
                    피드백 반영 재생성
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {step === "evaluating" && evalEvents.length > 0 && (
            <EvaluationStream events={evalEvents} />
          )}

          {evalResult && <EvaluationCard result={evalResult} />}
        </>
      )}
    </div>
  );
}
