"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  EvaluationCard,
  EvaluationFeedback,
} from "@/components/evaluation-card";
import { EvaluationStream } from "@/components/evaluation-stream";
import { api, getProjectStatus } from "@/lib/api";
import type { Project, ProjectVersion, EvaluatorEvent } from "@/lib/api";

interface Resume {
  id: number;
  name: string;
  updated_at: string;
}

const STEPS = [
  { id: 1, title: "채용공고", description: "채용공고 확인 및 분석 결과" },
  { id: 2, title: "이력서", description: "이력서를 선택하거나 입력하세요" },
  { id: 3, title: "작성 설정", description: "모드와 옵션을 설정하세요" },
  { id: 4, title: "결과", description: "생성된 자소서와 평가 결과" },
] as const;

const CheckIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 12.75l6 6 9-13.5"
    />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const BackIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
    />
  </svg>
);

const TrashIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
    />
  </svg>
);

type GenStep = "idle" | "generating" | "evaluating" | "done";

const PolicyErrorModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div
      className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    />
    <div className="relative bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 space-y-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
          <svg
            className="w-5 h-5 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-semibold">보안 정책으로 분석 실패</h3>
          <p className="text-sm text-muted-foreground mt-1">
            AI가 이미지 분석을 거부했습니다. 아래 방법 중 하나를 시도해보세요.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-accent/10 p-4 space-y-2.5 text-sm">
        <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
          해결 방법
        </p>
        <div className="space-y-2">
          <div className="flex gap-2">
            <span className="text-primary font-bold shrink-0">1.</span>
            <p>
              채용공고를 <span className="font-medium">직접 타이핑</span>하거나
              일부만 붙여넣어 다시 시도해주세요.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-primary font-bold shrink-0">2.</span>
            <p>
              회사명·직무·필수조건·우대조건이 보이는{" "}
              <span className="font-medium">부분만 캡쳐</span>해서
              업로드해주세요.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-primary font-bold shrink-0">3.</span>
            <p>
              특수문자나 민감한 내용이 포함된 경우 해당 부분을{" "}
              <span className="font-medium">제거 후 재시도</span>해주세요.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  </div>
);

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1);
  const [genStep, setGenStep] = useState<GenStep>("idle");

  // Step 1
  const [editingJobPosting, setEditingJobPosting] = useState(false);
  const [jobPostingDraft, setJobPostingDraft] = useState("");
  const [editingAnalysis, setEditingAnalysis] = useState(false);
  const [analysisDraft, setAnalysisDraft] = useState<
    Project["job_analysis"] | null
  >(null);
  const [savingAnalysis, setSavingAnalysis] = useState(false);

  // Step 2
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [resumeText, setResumeText] = useState("");

  // Step 3
  const [mode, setMode] = useState<"question" | "general">("general");
  const [question, setQuestion] = useState("");
  const [charLimit, setCharLimit] = useState("");

  // Step 4
  const [answer, setAnswer] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [evalEvents, setEvalEvents] = useState<EvaluatorEvent[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [evalResult, setEvalResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [showPolicyError, setShowPolicyError] = useState(false);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(
    null,
  );

  // Load project + resumes
  useEffect(() => {
    const load = async () => {
      try {
        const [proj, resumeList] = await Promise.all([
          api.getProject(Number(id)),
          api.listResumes(),
        ]);
        setProject(proj);
        setResumes(resumeList);

        // Restore state from saved project
        if (proj.resume_id) setSelectedResumeId(proj.resume_id);
        if (proj.mode) setMode(proj.mode as "question" | "general");
        if (proj.question) setQuestion(proj.question);
        if (proj.char_limit) setCharLimit(String(proj.char_limit));

        // 버전 이력 복원 — 버전이 있으면 최신 버전 기준으로 표시
        if (proj.versions && proj.versions.length > 0) {
          setVersions(proj.versions);
          const latest = proj.versions[proj.versions.length - 1];
          setAnswer(latest.answer);
          setCharCount(latest.answer.length);
          setEvalResult(latest.evaluation);
          setSelectedVersionId(latest.id);
        } else if (proj.answer) {
          // 버전 없는 기존 프로젝트 호환
          setAnswer(proj.answer);
          setCharCount(proj.answer.length);
          if (proj.evaluation) setEvalResult(proj.evaluation);
        }

        // Determine initial step
        const status = getProjectStatus(proj);
        if (status === "evaluated" || status === "generated") {
          setActiveStep(4);
          setGenStep("done");
        } else if (proj.resume_id) {
          setActiveStep(3);
        } else {
          setActiveStep(1);
        }
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, router]);

  const isLoading = genStep === "generating" || genStep === "evaluating";

  const isStepComplete = (stepId: number) => {
    if (stepId === 1)
      return (
        !!project?.job_posting &&
        !!project?.job_analysis?.company &&
        project.job_analysis.company !== "미확인" &&
        !!project?.job_analysis?.position &&
        project.job_analysis.position !== "미확인"
      );
    if (stepId === 2) return !!selectedResumeId || !!resumeText;
    if (stepId === 3)
      return !!charLimit && (mode === "general" || question.length > 0);
    if (stepId === 4) return genStep === "done";
    return false;
  };

  const canNavigateTo = (stepId: number) => {
    if (stepId === 1) return true;
    if (stepId === 4)
      return genStep === "done" || genStep === "evaluating" || !!answer;
    for (let i = 1; i < stepId; i++) {
      if (!isStepComplete(i)) return false;
    }
    return true;
  };

  const handleSaveResume = async () => {
    if (!project) return;
    await api.updateProject(project.id, {
      resume_id: selectedResumeId ?? undefined,
    });
    setActiveStep(3);
  };

  const handleGenerate = async () => {
    if (!project) return;
    setError("");
    setGenStep("generating");
    setActiveStep(4);

    try {
      const effectiveQuestion =
        mode === "general"
          ? "이 채용공고에 맞는 자기소개서를 작성해주세요. 지원동기, 직무 관련 경험과 역량, 입사 후 포부를 포함해주세요."
          : question;

      // Save settings
      await api.updateProject(project.id, {
        question: effectiveQuestion,
        mode,
        char_limit: charLimit ? parseInt(charLimit) : undefined,
      } as Partial<Project>);

      const result = await api.generate({
        question: effectiveQuestion,
        job_posting: project.job_posting,
        job_analysis: project.job_analysis,
        company_research: project.companies,
        resume_id: selectedResumeId ?? undefined,
        resume_text: selectedResumeId ? undefined : resumeText,
        char_limit: charLimit ? parseInt(charLimit) : undefined,
      });

      setAnswer(result.answer);
      setCharCount(result.char_count);

      setGenStep("evaluating");
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
      setGenStep("done");

      // 새 버전으로 저장 (덮어쓰지 않고 이력 보존)
      const version = await api.createVersion(project.id, {
        answer: result.answer,
        evaluation: evalRes,
        question: effectiveQuestion,
        mode,
        char_limit: charLimit ? parseInt(charLimit) : undefined,
        resume_id: selectedResumeId ?? undefined,
        job_analysis: result.job_analysis,
      });
      setVersions((prev) => [...prev, version]);
      setSelectedVersionId(version.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "API error");
      setGenStep("idle");
      setActiveStep(3);
    }
  };

  const MAX_REGENERATIONS = 5;

  const handleRegenerate = async () => {
    if (!project || !evalResult) return;
    if (versions.length >= MAX_REGENERATIONS) return;
    setGenStep("generating");
    setError("");

    try {
      const effectiveQuestion =
        mode === "general"
          ? "이 채용공고에 맞는 자기소개서를 작성해주세요. 지원동기, 직무 관련 경험과 역량, 입사 후 포부를 포함해주세요."
          : question;

      const result = await api.generate({
        question: effectiveQuestion,
        job_posting: project.job_posting,
        job_analysis: project.job_analysis,
        company_research: project.companies,
        resume_id: selectedResumeId ?? undefined,
        resume_text: selectedResumeId ? undefined : resumeText,
        char_limit: charLimit ? parseInt(charLimit) : undefined,
        feedback: evalResult.aggregated_feedback,
        previous_answer: answer,
      });

      setAnswer(result.answer);
      setCharCount(result.char_count);

      setGenStep("evaluating");
      setEvalEvents([]);

      const evalRes = await api.evaluateStream(
        {
          question: effectiveQuestion,
          answer: result.answer,
          job_analysis: project.job_analysis,
        },
        (ev) => setEvalEvents((prev) => [...prev, ev]),
      );

      setEvalResult(evalRes);
      setGenStep("done");

      // 새 버전으로 저장 (덮어쓰지 않고 이력 보존)
      const version = await api.createVersion(project.id, {
        answer: result.answer,
        evaluation: evalRes,
        question: effectiveQuestion,
        mode,
        char_limit: charLimit ? parseInt(charLimit) : undefined,
        resume_id: selectedResumeId ?? undefined,
        job_analysis: project.job_analysis,
      });
      setVersions((prev) => [...prev, version]);
      setSelectedVersionId(version.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "API error");
      setGenStep("done");
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    await api.deleteProject(project.id);
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!project) return null;

  const company = project.job_analysis?.company || "회사명 미확인";
  const position = project.job_analysis?.position || "직무 미확인";

  return (
    <div>
      {showPolicyError && (
        <PolicyErrorModal onClose={() => setShowPolicyError(false)} />
      )}
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <BackIcon />
          </button>
          <div>
            <h2 className="text-lg font-semibold">{company}</h2>
            <p className="text-xs text-muted-foreground">{position}</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="프로젝트 삭제"
        >
          <TrashIcon />
        </button>
      </div>

      <div className="flex gap-0 min-h-[calc(100vh-12rem)]">
        {/* Left: Step Navigation */}
        <nav className="w-56 shrink-0 pr-6 border-r border-border/50">
          <div className="sticky top-8">
            <ol className="space-y-1">
              {STEPS.map((step) => {
                const isActive = activeStep === step.id;
                const isComplete = isStepComplete(step.id);
                const isResult = step.id === 4;
                const canClick = canNavigateTo(step.id);
                const showDone = isResult ? genStep === "done" : isComplete;
                const showLoading = isResult && isLoading && activeStep === 4;

                return (
                  <li key={step.id}>
                    <button
                      onClick={() => canClick && setActiveStep(step.id)}
                      disabled={!canClick}
                      className={`
                        w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150
                        ${isActive ? "bg-accent/80" : canClick ? "hover:bg-accent/40" : ""}
                        ${!canClick ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                      `}
                    >
                      <span
                        className={`
                          mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                          ${
                            showLoading
                              ? "bg-primary/20 text-primary"
                              : showDone
                                ? "bg-primary text-primary-foreground"
                                : isActive
                                  ? "border-2 border-primary text-primary"
                                  : "border border-border text-muted-foreground"
                          }
                        `}
                      >
                        {showLoading ? (
                          <SpinnerIcon />
                        ) : showDone ? (
                          <CheckIcon />
                        ) : (
                          step.id
                        )}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`text-base font-semibold ${isActive ? "text-white" : "text-white/70"}`}
                        >
                          {step.title}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5 break-words whitespace-normal">
                          {step.description}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </nav>

        {/* Right: Content */}
        <div className="flex-1 pl-6">
          {/* Step 1: 채용공고 */}
          {activeStep === 1 && (
            <div className="animate-fade-in space-y-5">
              <div>
                <h3 className="text-base font-semibold">채용공고</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  분석된 채용공고 정보입니다.
                </p>
              </div>

              {/* Analysis summary */}
              {project.job_analysis && (
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      분석 결과
                    </p>
                    {!editingAnalysis ? (
                      <button
                        onClick={() => {
                          setAnalysisDraft({ ...project.job_analysis });
                          setEditingAnalysis(true);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        수정
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingAnalysis(false)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          disabled={savingAnalysis}
                        >
                          취소
                        </button>
                        <button
                          onClick={async () => {
                            if (!analysisDraft) return;
                            setSavingAnalysis(true);
                            await api.updateProject(project.id, {
                              job_analysis: analysisDraft,
                            } as Partial<Project>);
                            setProject({
                              ...project,
                              job_analysis: analysisDraft,
                            });
                            setEditingAnalysis(false);
                            setSavingAnalysis(false);
                          }}
                          className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                          disabled={savingAnalysis}
                        >
                          {savingAnalysis ? "저장 중..." : "저장"}
                        </button>
                      </div>
                    )}
                  </div>

                  {editingAnalysis && analysisDraft ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            회사
                          </label>
                          <input
                            type="text"
                            value={analysisDraft.company}
                            onChange={(e) =>
                              setAnalysisDraft({
                                ...analysisDraft,
                                company: e.target.value,
                              })
                            }
                            className="w-full h-8 rounded-md border border-input bg-transparent px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            직무
                          </label>
                          <input
                            type="text"
                            value={analysisDraft.position}
                            onChange={(e) =>
                              setAnalysisDraft({
                                ...analysisDraft,
                                position: e.target.value,
                              })
                            }
                            className="w-full h-8 rounded-md border border-input bg-transparent px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            경력
                          </label>
                          <input
                            type="text"
                            value={analysisDraft.experience_level}
                            onChange={(e) =>
                              setAnalysisDraft({
                                ...analysisDraft,
                                experience_level: e.target.value,
                              })
                            }
                            className="w-full h-8 rounded-md border border-input bg-transparent px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                      </div>
                      <div className="border-t border-border/50 pt-3 space-y-3">
                        {(
                          [
                            ["required_skills", "필수 역량"],
                            ["preferred_skills", "우대 역량"],
                            ["responsibilities", "주요 업무"],
                            ["keywords", "핵심 키워드"],
                            ["culture_keywords", "조직문화 키워드"],
                          ] as const
                        ).map(([key, label]) => (
                          <div key={key}>
                            <label className="text-xs text-muted-foreground block mb-1.5">
                              {label}
                            </label>
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                              {(analysisDraft[key] || []).map(
                                (tag: string, i: number) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent text-xs"
                                  >
                                    {tag}
                                    <button
                                      onClick={() =>
                                        setAnalysisDraft({
                                          ...analysisDraft,
                                          [key]: analysisDraft[key].filter(
                                            (_: string, j: number) => j !== i,
                                          ),
                                        })
                                      }
                                      className="text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                      <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M6 18 18 6M6 6l12 12"
                                        />
                                      </svg>
                                    </button>
                                  </span>
                                ),
                              )}
                            </div>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                placeholder="입력 후 Enter"
                                className="flex-1 h-7 rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" &&
                                    e.currentTarget.value.trim()
                                  ) {
                                    e.preventDefault();
                                    const v = e.currentTarget.value.trim();
                                    if (!analysisDraft[key].includes(v)) {
                                      setAnalysisDraft({
                                        ...analysisDraft,
                                        [key]: [...analysisDraft[key], v],
                                      });
                                    }
                                    e.currentTarget.value = "";
                                  }
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            회사
                          </p>
                          <p className="font-medium">{company}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            직무
                          </p>
                          <p className="font-medium">{position}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            경력
                          </p>
                          <p className="font-medium">
                            {project.job_analysis.experience_level}
                          </p>
                        </div>
                      </div>
                      {project.job_analysis.required_skills?.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">
                            필수 역량
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {project.job_analysis.required_skills.map(
                              (s: string) => (
                                <Badge
                                  key={s}
                                  variant="secondary"
                                  className="text-[11px]"
                                >
                                  {s}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                      {project.job_analysis.keywords?.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">
                            키워드
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {project.job_analysis.keywords.map((k: string) => (
                              <Badge
                                key={k}
                                variant="outline"
                                className="text-[11px]"
                              >
                                {k}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 회사 정보 (research 결과) */}
              {project.companies &&
                (project.companies.mission ||
                  project.companies.vision ||
                  project.companies.products_services) && (
                  <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      회사 정보
                    </p>
                    <div className="space-y-2.5 text-sm">
                      {project.companies.mission && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            미션
                          </p>
                          <p className="text-sm leading-relaxed">
                            {project.companies.mission}
                          </p>
                        </div>
                      )}
                      {project.companies.vision && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            비전
                          </p>
                          <p className="text-sm leading-relaxed">
                            {project.companies.vision}
                          </p>
                        </div>
                      )}
                      {project.companies.products_services && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            주요 제품/서비스
                          </p>
                          <p className="text-sm leading-relaxed">
                            {project.companies.products_services}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* 채용공고 원문 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    채용공고 원문
                  </p>
                  {project.job_posting && !editingJobPosting && (
                    <button
                      onClick={() => {
                        setJobPostingDraft(project.job_posting);
                        setEditingJobPosting(true);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      수정
                    </button>
                  )}
                  {editingJobPosting && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingJobPosting(false)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={async () => {
                          if (!jobPostingDraft.trim()) return;
                          // 재분석 후 저장
                          const analysis =
                            await api.analyzeJob(jobPostingDraft);
                          await api.updateProject(project.id, {
                            job_posting: jobPostingDraft,
                            job_analysis: analysis,
                          } as Partial<Project>);
                          setProject({
                            ...project,
                            job_posting: jobPostingDraft,
                            job_analysis: analysis,
                          });
                          setEditingJobPosting(false);
                        }}
                        className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        저장 및 재분석
                      </button>
                    </div>
                  )}
                </div>

                {/* 비어있으면 입력 UI */}
                {!project.job_posting && !editingJobPosting ? (
                  <div className="rounded-lg border border-dashed border-yellow-500/40 bg-yellow-500/5 p-5 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      채용공고 원문이 저장되지 않았습니다
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setJobPostingDraft("");
                          setEditingJobPosting(true);
                        }}
                      >
                        텍스트 입력
                      </Button>
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-input text-xs font-medium cursor-pointer hover:bg-accent transition-colors">
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
                        이미지 / PDF 업로드
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,.gif,.pdf"
                          className="sr-only"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const res = await api.parseImage(file);
                            const isRefusal =
                              /i'm sorry|i apologize|sorry,|죄송합니다|정책상|can't assist/i.test(
                                res.text ?? "",
                              );
                            if (isRefusal) {
                              setShowPolicyError(true);
                              return;
                            }
                            setJobPostingDraft(res.text);
                            setEditingJobPosting(true);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ) : editingJobPosting ? (
                  <Textarea
                    value={jobPostingDraft}
                    onChange={(e) => setJobPostingDraft(e.target.value)}
                    rows={10}
                    className="resize-none text-sm"
                    placeholder="채용공고 전문을 붙여넣으세요..."
                    autoFocus
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm text-muted-foreground bg-card rounded-lg p-4 max-h-72 overflow-y-auto border border-border">
                    {project.job_posting}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setActiveStep(2)}
                  disabled={!isStepComplete(1)}
                >
                  다음
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: 이력서 */}
          {activeStep === 2 && (
            <div className="animate-fade-in space-y-5">
              <div>
                <h3 className="text-base font-semibold">이력서</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  저장된 이력서를 선택하거나 직접 입력하세요.
                </p>
              </div>

              {resumes.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    저장된 이력서
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {resumes.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setSelectedResumeId(
                            selectedResumeId === r.id ? null : r.id,
                          );
                          if (selectedResumeId !== r.id) setResumeText("");
                        }}
                        disabled={isLoading}
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all
                          ${
                            selectedResumeId === r.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50 hover:bg-accent/30"
                          }
                        `}
                      >
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            selectedResumeId === r.id
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {selectedResumeId === r.id && (
                            <span className="w-2 h-2 rounded-full bg-primary-foreground" />
                          )}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.updated_at).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <Separator />
                  <p className="text-sm font-medium text-muted-foreground">
                    또는 직접 입력
                  </p>
                </div>
              )}

              <Textarea
                placeholder={
                  selectedResumeId
                    ? "저장된 이력서가 선택되었습니다."
                    : "이력서 내용을 붙여넣으세요..."
                }
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                  setSelectedResumeId(null);
                }}
                rows={resumes.length > 0 ? 5 : 10}
                disabled={isLoading || !!selectedResumeId}
                className="resize-none"
              />

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveStep(1)}>
                  이전
                </Button>
                <Button
                  onClick={handleSaveResume}
                  disabled={!(selectedResumeId || resumeText)}
                >
                  다음
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: 작성 설정 */}
          {activeStep === 3 && (
            <div className="animate-fade-in space-y-5">
              <div>
                <h3 className="text-base font-semibold">작성 설정</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  모드를 선택하고 옵션을 설정하세요.
                </p>
              </div>

              {/* Mode */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  작성 모드
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode("general")}
                    className={`px-4 py-4 rounded-lg border text-left transition-all ${
                      mode === "general"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-accent/30"
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">일반 자소서</p>
                    <p className="text-xs text-muted-foreground">
                      지원동기, 역량, 경험, 포부 포함
                    </p>
                  </button>
                  <button
                    onClick={() => setMode("question")}
                    className={`px-4 py-4 rounded-lg border text-left transition-all ${
                      mode === "question"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-accent/30"
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">질문 답변</p>
                    <p className="text-xs text-muted-foreground">
                      특정 질문에 대한 맞춤 답변
                    </p>
                  </button>
                </div>
              </div>

              {mode === "question" && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    질문
                  </p>
                  <Textarea
                    placeholder="예: 팀워크를 발휘해 공동 목표 달성에 기여한 경험을 서술하세요."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={3}
                    disabled={isLoading}
                    className="resize-none"
                  />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  글자수 제한 <span className="text-destructive">*</span>
                </p>
                <input
                  type="number"
                  placeholder="예: 800"
                  value={charLimit}
                  onChange={(e) => setCharLimit(e.target.value)}
                  className={`w-full h-10 rounded-lg border bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${!charLimit ? "border-destructive/50" : "border-input"}`}
                  disabled={isLoading}
                />
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 space-y-1">
                  <p className="text-xs font-medium text-amber-400">
                    글자수 안내
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>· 일반적으로 800자, 최대 1000자 이내가 많습니다.</li>
                    <li>
                      · 회사마다 제한이 다를 수 있으니 채용공고를 꼭 확인하세요.
                    </li>
                  </ul>
                </div>
              </div>

              <Separator />

              {/* Summary */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                <p className="text-sm font-medium">생성 요약</p>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">회사</span>
                  <span>{company}</span>
                  <span className="text-muted-foreground">직무</span>
                  <span>{position}</span>
                  <span className="text-muted-foreground">이력서</span>
                  <span>
                    {selectedResumeId
                      ? resumes.find((r) => r.id === selectedResumeId)?.name
                      : `직접 입력 (${resumeText.length}자)`}
                  </span>
                  <span className="text-muted-foreground">모드</span>
                  <span>
                    {mode === "general" ? "일반 자소서" : "질문 답변"}
                  </span>
                  {charLimit && (
                    <>
                      <span className="text-muted-foreground">글자수</span>
                      <span>{charLimit}자</span>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveStep(2)}>
                  이전
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={
                    isLoading ||
                    !charLimit ||
                    (mode === "question" && !question)
                  }
                >
                  자소서 생성하기
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: 결과 */}
          {activeStep === 4 && (
            <div className="animate-fade-in space-y-6">
              <div>
                <h3 className="text-base font-semibold">결과</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {genStep === "generating"
                    ? "자소서를 생성하고 있습니다..."
                    : genStep === "evaluating"
                      ? "9명의 AI 평가관이 평가 중입니다..."
                      : "생성된 자소서와 평가 결과입니다."}
                </p>
              </div>

              {/* Loading */}
              {genStep === "generating" && !answer && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    합격 자소서 데이터를 검색하고 생성 중...
                  </p>
                </div>
              )}

              {/* 버전 스위처 */}
              {versions.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">버전</span>
                  {versions.map((v, i) => (
                    <Button
                      key={v.id}
                      size="sm"
                      variant={
                        selectedVersionId === v.id ? "default" : "outline"
                      }
                      className="h-7 px-3 text-xs"
                      onClick={() => {
                        setAnswer(v.answer);
                        setCharCount(v.answer.length);
                        setEvalResult(v.evaluation);
                        setSelectedVersionId(v.id);
                        setEvalEvents([]);
                      }}
                    >
                      v{i + 1}
                      {v.evaluation?.overall_pass_probability != null &&
                        ` · ${Math.round(v.evaluation.overall_pass_probability * 100)}%`}
                    </Button>
                  ))}
                </div>
              )}

              {/* Answer + Evaluation 병렬 레이아웃 */}
              {answer && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 왼쪽: 자소서 + 주요 피드백 */}
                  <div className="space-y-6">
                    <Card>
                      <CardContent className="pt-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium">생성된 자소서</p>
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
                        <div className="whitespace-pre-wrap text-sm leading-relaxed bg-accent/10 rounded-lg p-4 border border-border">
                          {answer}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigator.clipboard.writeText(answer)
                            }
                          >
                            복사
                          </Button>
                          {(genStep === "done" || isLoading) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRegenerate}
                              disabled={
                                versions.length >= MAX_REGENERATIONS ||
                                isLoading
                              }
                              title={
                                versions.length >= MAX_REGENERATIONS
                                  ? "재생성은 최대 5회까지 가능합니다"
                                  : undefined
                              }
                            >
                              피드백 반영 재생성
                              {versions.length > 0
                                ? ` (${versions.length}/5)`
                                : ""}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    {evalResult && <EvaluationFeedback result={evalResult} />}
                  </div>

                  {/* 오른쪽: 통과 확률 + 평가 결과 */}
                  <div className="space-y-6">
                    {genStep === "evaluating" && evalEvents.length > 0 && (
                      <EvaluationStream events={evalEvents} />
                    )}
                    {evalResult && <EvaluationCard result={evalResult} />}
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
