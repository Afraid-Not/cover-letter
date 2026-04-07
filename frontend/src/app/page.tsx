"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api, getProjectStatus } from "@/lib/api";
import type { Project, ProjectStatus } from "@/lib/api";

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; color: string; accent: string }
> = {
  draft: {
    label: "채용공고만 입력됨",
    color: "bg-muted/50 text-muted-foreground/80",
    accent: "bg-muted-foreground/20",
  },
  ready: {
    label: "이력서 설정 완료",
    color: "bg-sky-400/8 text-sky-300/70",
    accent: "bg-sky-400/40",
  },
  generated: {
    label: "자소서 생성 완료",
    color: "bg-amber-400/8 text-amber-300/70",
    accent: "bg-amber-300/40",
  },
  evaluated: {
    label: "평가 완료",
    color: "bg-emerald-400/8 text-emerald-300/70",
    accent: "bg-emerald-400/40",
  },
};

const PlusIcon = () => (
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
      d="M12 4.5v15m7.5-7.5h-15"
    />
  </svg>
);

const ArrowRightIcon = () => (
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
      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
    />
  </svg>
);

const PencilIcon = () => (
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
      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"
    />
  </svg>
);

const BriefcaseIcon = () => (
  <svg
    className="w-10 h-10 text-muted-foreground/20"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z"
    />
  </svg>
);

// ── 아이콘 ──

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

const XIcon = () => (
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
      d="M6 18 18 6M6 6l12 12"
    />
  </svg>
);

const CheckIcon = () => (
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
      d="m4.5 12.75 6 6 9-13.5"
    />
  </svg>
);

// ── 태그 입력 컴포넌트 ──

const TagEditor = ({
  label,
  tags,
  onChange,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}) => {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) {
      onChange([...tags, v]);
      setInput("");
    }
  };

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1.5">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent text-xs"
          >
            {tag}
            <button
              onClick={() => onChange(tags.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <XIcon />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="입력 후 Enter"
          className="flex-1 h-7 rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleAdd}
          disabled={!input.trim()}
        >
          추가
        </Button>
      </div>
    </div>
  );
};

// ── OpenAI 정책 오류 모달 ──

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
            AI가 채용공고 분석을 거부했습니다. 아래 방법 중 하나를 시도해보세요.
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

// ── 채용공고 분석 확인 모달 ──

const AnalysisConfirmModal = ({
  project,
  onConfirm,
  onClose,
}: {
  project: Project;
  onConfirm: (analysis: Project["job_analysis"]) => Promise<void>;
  onClose: () => void;
}) => {
  const a = project.job_analysis;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(a?.company || "");
  const [position, setPosition] = useState(a?.position || "");
  const [experienceLevel, setExperienceLevel] = useState(
    a?.experience_level || "",
  );
  const [requiredSkills, setRequiredSkills] = useState<string[]>(
    a?.required_skills || [],
  );
  const [preferredSkills, setPreferredSkills] = useState<string[]>(
    a?.preferred_skills || [],
  );
  const [responsibilities, setResponsibilities] = useState<string[]>(
    a?.responsibilities || [],
  );
  const [keywords, setKeywords] = useState<string[]>(a?.keywords || []);
  const [cultureKeywords, setCultureKeywords] = useState<string[]>(
    a?.culture_keywords || [],
  );

  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm({
      company,
      position,
      experience_level: experienceLevel,
      required_skills: requiredSkills,
      preferred_skills: preferredSkills,
      responsibilities,
      keywords,
      culture_keywords: cultureKeywords,
    });
    setSaving(false);
  };

  const fieldRow = (
    label: string,
    value: string,
    setter: (v: string) => void,
    placeholder: string,
  ) => (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">
        {label}
      </label>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => setter(e.target.value)}
          placeholder={placeholder}
          className="w-full h-8 rounded-md border border-input bg-transparent px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      ) : (
        <p className="text-sm font-medium">
          {value || <span className="text-muted-foreground">미확인</span>}
        </p>
      )}
    </div>
  );

  const tagRow = (
    label: string,
    tags: string[],
    setter: (t: string[]) => void,
  ) => (
    <div>
      {editing ? (
        <TagEditor label={label} tags={tags} onChange={setter} />
      ) : (
        <>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {label}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {tags.length > 0 ? (
              tags.map((t, i) => (
                <Badge key={i} variant="secondary" className="text-[11px]">
                  {t}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">없음</span>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card border border-border rounded-xl shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-4 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold">채용공고 분석 결과</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editing
                ? "각 항목을 직접 수정할 수 있습니다"
                : "분석 결과를 확인해주세요"}
            </p>
          </div>
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setEditing(true)}
            >
              <PencilIcon /> 수정
            </Button>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-accent/10 p-4">
          {fieldRow("회사명", company, setCompany, "예: 삼성전자")}
          {fieldRow("포지션", position, setPosition, "예: 백엔드 개발자")}
          {fieldRow(
            "경력 수준",
            experienceLevel,
            setExperienceLevel,
            "예: 신입/경력/무관",
          )}
          <div className="border-t border-border/50 pt-3 space-y-3">
            {tagRow("필수 역량", requiredSkills, setRequiredSkills)}
            {tagRow("우대 역량", preferredSkills, setPreferredSkills)}
            {tagRow("주요 업무", responsibilities, setResponsibilities)}
            {tagRow("핵심 키워드", keywords, setKeywords)}
            {tagRow("조직문화 키워드", cultureKeywords, setCultureKeywords)}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            취소
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? (
              "저장 중..."
            ) : (
              <>
                <CheckIcon /> 확인
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── 메인 대시보드 ──

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [jobPosting, setJobPosting] = useState("");
  const [creating, setCreating] = useState(false);
  const [creatingStep, setCreatingStep] = useState<
    "analyzing" | "researching" | null
  >(null);
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [jobFileLoading, setJobFileLoading] = useState(false);

  // 분석 확인 모달
  const [confirmProject, setConfirmProject] = useState<Project | null>(null);
  const [showPolicyError, setShowPolicyError] = useState(false);

  useEffect(() => {
    api
      .listProjects()
      .then((data) => {
        setProjects(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const hasUnknownInfo = (p: Project) => {
    const c = p.job_analysis?.company;
    const pos = p.job_analysis?.position;
    return !c || c === "미확인" || !pos || pos === "미확인";
  };

  const handleConfirmAnalysis = async (analysis: Project["job_analysis"]) => {
    if (!confirmProject) return;
    await api.updateProject(confirmProject.id, {
      job_analysis: analysis,
    } as Partial<Project>);
    const updated = { ...confirmProject, job_analysis: analysis };
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setConfirmProject(null);
    router.push(`/projects/${updated.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await api.deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const isRefusalResponse = (project: Project) => {
    const text = JSON.stringify(project.job_analysis || "").toLowerCase();
    return /i'm sorry|i apologize|sorry,|죄송합니다|정책상/.test(text);
  };

  const handleCreate = async (text?: string) => {
    const posting = text || jobPosting;
    if (!posting.trim()) return;
    setCreating(true);
    setCreatingStep("analyzing");
    try {
      const project = await api.createProject(posting);

      if (isRefusalResponse(project)) {
        await api.deleteProject(project.id);
        setShowPolicyError(true);
        return;
      }

      setProjects((prev) => [project, ...(Array.isArray(prev) ? prev : [])]);
      setShowCreate(false);
      setJobPosting("");
      setJobFile(null);

      setCreatingStep("researching");
      const researched = await api.researchCompany(project.id);
      setConfirmProject(researched);
    } catch {
      // keep form open on error
    } finally {
      setCreating(false);
      setCreatingStep(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">자소서 관리</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            채용공고별로 자소서를 생성하고 관리하세요
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="gap-2">
          <PlusIcon />새 자소서 만들기
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="animate-fade-in border-primary/30">
          <CardContent className="pt-5 space-y-4">
            {/* 캡쳐 안내 박스 */}
            <div className="rounded-lg border border-primary/30 bg-primary/10 px-5 py-4 space-y-2.5">
              <p className="text-sm font-extrabold text-white">
                📸 이런 부분을 캡쳐하거나 텍스트로 붙여넣으세요
              </p>
              <ul className="text-sm font-bold text-white space-y-1 pl-1">
                <li>· 회사명 및 채용 직무명</li>
                <li>· 경력 유무 (신입 / 경력 / 무관)</li>
                <li>· 필수 조건 (자격요건)</li>
                <li>· 우대 조건</li>
                <li>· 주요 업무 내용</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">채용공고 입력</p>
              <Textarea
                placeholder="채용공고 전문을 붙여넣으세요..."
                value={jobPosting}
                onChange={(e) => setJobPosting(e.target.value)}
                rows={6}
                disabled={creating}
                className="resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <label
                htmlFor="job-upload"
                className={`
                  inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border text-xs font-medium
                  cursor-pointer transition-colors hover:bg-accent
                  ${jobFileLoading ? "opacity-50 pointer-events-none" : ""}
                `}
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
                  id="job-upload"
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
                  disabled={creating}
                />
              </label>
              {jobFile && (
                <span className="text-xs text-muted-foreground">
                  {jobFile.name}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {jobPosting.length > 0 &&
                  `${jobPosting.length.toLocaleString()}자`}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCreate(false);
                    setJobPosting("");
                  }}
                  disabled={creating}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleCreate()}
                  disabled={!jobPosting.trim() || creating}
                >
                  {creatingStep === "analyzing"
                    ? "채용공고 분석 중..."
                    : creatingStep === "researching"
                      ? "회사 정보 조회 중..."
                      : "프로젝트 생성"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && !showCreate && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BriefcaseIcon />
          <p className="text-muted-foreground mt-4 text-sm">
            아직 생성된 자소서가 없습니다
          </p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            첫 자소서를 만들어보세요
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-2"
            onClick={() => setShowCreate(true)}
          >
            <PlusIcon />
            시작하기
          </Button>
        </div>
      )}

      {/* Project cards */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {projects.map((project, idx) => {
            const status = getProjectStatus(project);
            const config = STATUS_CONFIG[status];
            const company = project.job_analysis?.company || "회사명 미확인";
            const position = project.job_analysis?.position || "직무 미확인";
            const passProb = project.evaluation?.overall_pass_probability;
            const date = new Date(project.created_at).toLocaleDateString(
              "ko-KR",
              {
                month: "short",
                day: "numeric",
              },
            );

            return (
              <div key={project.id ?? idx} className="group">
                <button
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="w-full text-left"
                >
                  <div className="relative h-[160px] rounded-xl bg-card border border-border/50 p-4 overflow-hidden hover:border-primary/20 hover:bg-card/90 hover:shadow-lg hover:shadow-primary/[0.06] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                    <div
                      className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-full ${config.accent}`}
                    />

                    <div className="pl-3 h-full flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <p className="text-base font-medium truncate pr-4">
                            {company}
                          </p>
                          <span className="text-xs text-muted-foreground/40 shrink-0">
                            {date}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground/60 truncate mt-1">
                          {position}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={`text-xs border-0 ${config.color}`}
                          >
                            {config.label}
                          </Badge>
                          {passProb != null && (
                            <Badge
                              variant="secondary"
                              className={`text-xs font-mono border-0 ${
                                passProb >= 70
                                  ? "bg-emerald-400/8 text-emerald-300/70"
                                  : passProb >= 50
                                    ? "bg-amber-400/8 text-amber-300/70"
                                    : "bg-rose-400/8 text-rose-300/70"
                              }`}
                            >
                              {passProb}%
                            </Badge>
                          )}
                        </div>
                        <span
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm("이 프로젝트를 정말 삭제하시겠습니까?")
                            ) {
                              handleDelete(e, project.id);
                            }
                          }}
                          className="text-xs font-semibold px-2 py-0.5 rounded border border-destructive/40 text-destructive/70 hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                        >
                          삭제
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 정책 오류 모달 */}
      {showPolicyError &&
        createPortal(
          <PolicyErrorModal onClose={() => setShowPolicyError(false)} />,
          document.body,
        )}

      {/* 분석 확인 모달 */}
      {confirmProject &&
        createPortal(
          <AnalysisConfirmModal
            project={confirmProject}
            onConfirm={handleConfirmAnalysis}
            onClose={() => {
              setConfirmProject(null);
              router.push(`/projects/${confirmProject.id}`);
            }}
          />,
          document.body,
        )}
    </div>
  );
}
