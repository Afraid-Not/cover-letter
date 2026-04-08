"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BentoGrid } from "@/components/ui/bento-grid";
import { api, getProjectStatus } from "@/lib/api";
import type { Project, ProjectStatus, UsageSummary } from "@/lib/api";
import { AiLoader } from "@/components/ui/ai-loader";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";

const STATUS_CONFIG: Record<
  ProjectStatus,
  {
    label: string;
    color: string;
    accent: string;
    statusColor: string;
    accentGradient: string;
    iconGlow: string;
  }
> = {
  draft: {
    label: "작성 중",
    color: "bg-muted text-muted-foreground",
    accent: "bg-muted-foreground/30",
    statusColor: "bg-muted text-muted-foreground group-hover:bg-accent",
    accentGradient: "from-zinc-500/15 via-zinc-500/5 to-transparent",
    iconGlow: "bg-zinc-400/20",
  },
  ready: {
    label: "작성 중",
    color: "bg-muted text-muted-foreground",
    accent: "bg-muted-foreground/30",
    statusColor: "bg-muted text-muted-foreground group-hover:bg-accent",
    accentGradient: "from-zinc-500/15 via-zinc-500/5 to-transparent",
    iconGlow: "bg-zinc-400/20",
  },
  generated: {
    label: "생성 완료",
    color: "bg-amber-100 text-amber-700",
    accent: "bg-amber-400",
    statusColor: "bg-amber-100 text-amber-700 group-hover:bg-amber-200",
    accentGradient: "from-amber-400/20 via-amber-400/5 to-transparent",
    iconGlow: "bg-amber-400/15",
  },
  evaluated: {
    label: "평가 완료",
    color: "bg-emerald-100 text-emerald-700",
    accent: "bg-emerald-500",
    statusColor: "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200",
    accentGradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    iconGlow: "bg-emerald-400/15",
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

  const [showCompanyCheck, setShowCompanyCheck] = useState(false);

  const handleConfirmClick = () => {
    setShowCompanyCheck(true);
  };

  const handleConfirm = async () => {
    setShowCompanyCheck(false);
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
      <div className="relative bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold">채용공고 분석 결과</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              분석 결과를 확인해주세요
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
            onClick={handleConfirmClick}
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

      {/* 회사명 재확인 팝업 */}
      {showCompanyCheck && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowCompanyCheck(false)}
          />
          <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4 animate-fade-in">
            <h3 className="text-base font-semibold">회사명을 확인해주세요</h3>
            <div className="rounded-lg bg-accent/20 border border-border px-4 py-3 text-center">
              <p className="text-lg font-bold text-foreground">
                {company || (
                  <span className="text-muted-foreground">미입력</span>
                )}
              </p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              회사명이 정확하지 않으면 회사 정보 자동 조사가 제대로 이루어지지
              않을 수 있습니다. 다시 한번 확인해주세요.
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompanyCheck(false)}
              >
                수정하기
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleConfirm}
                disabled={saving}
              >
                <CheckIcon /> 맞습니다
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── 메인 대시보드 ──

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [resumeMap, setResumeMap] = useState<Record<number, string>>({});
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [jobPosting, setJobPosting] = useState("");
  const [creating, setCreating] = useState(false);
  const [creatingStep, setCreatingStep] = useState<
    "analyzing" | "researching" | null
  >(null);
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [jobFileLoading, setJobFileLoading] = useState(false);
  const [pastedImageName, setPastedImageName] = useState<string | null>(null);

  // 분석 확인 모달
  const [confirmProject, setConfirmProject] = useState<Project | null>(null);
  const [showPolicyError, setShowPolicyError] = useState(false);

  useNavigationGuard(
    creating || jobFileLoading,
    "분석 작업이 진행 중입니다. 페이지를 벗어나면 작업이 중단됩니다.",
  );

  useEffect(() => {
    if (!showCreate) return;
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          e.preventDefault();
          const name = `붙여넣기_이미지_${Date.now()}.png`;
          const namedFile = new File([file], name, { type: file.type });
          setJobFile(namedFile);
          setPastedImageName(name);
          setJobFileLoading(true);
          try {
            const res = await api.parseImage(namedFile);
            setJobPosting(res.text);
          } catch {
            // handle error silently
          } finally {
            setJobFileLoading(false);
          }
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [showCreate]);

  useEffect(() => {
    Promise.all([
      api.listProjects(),
      api.listResumes(),
      api.getUsage().catch(() => null),
    ])
      .then(([projectData, resumeData, usageData]) => {
        setProjects(Array.isArray(projectData) ? projectData : []);
        const map: Record<number, string> = {};
        if (Array.isArray(resumeData)) {
          resumeData.forEach((r: { id: number; name: string }) => {
            map[r.id] = r.name;
          });
        }
        setResumeMap(map);
        setUsage(usageData);
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
      setPastedImageName(null);
      setConfirmProject(project);
    } catch {
      // keep form open on error
    } finally {
      setCreating(false);
      setCreatingStep(null);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" as const },
    },
  };

  const createModal = (
    <AnimatePresence>
      {showCreate && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop */}
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            className="relative z-10 w-full max-w-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: "easeOut" as const }}
          >
            <Card className="border-primary/20 shadow-2xl flex flex-col max-h-[90vh]">
              <CardContent className="pt-5 space-y-4 overflow-y-auto flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2.5">
                    <p className="text-sm font-semibold">새 자소서 만들기</p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-700 text-[11px] font-medium">
                      <svg
                        className="w-3 h-3 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                        />
                      </svg>
                      AI가 거부하면 스크린샷을 다시 찍어주세요.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (!creating) {
                        setShowCreate(false);
                        setJobPosting("");
                        setJobFile(null);
                        setPastedImageName(null);
                      }
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <XIcon />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">채용공고 입력</p>
                  <Textarea
                    placeholder="채용공고 전문을 붙여 넣으세요. (스크린샷 붙여넣기도 가능합니다.)"
                    value={jobPosting}
                    onChange={(e) => setJobPosting(e.target.value)}
                    rows={6}
                    disabled={creating}
                    className="resize-none"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="job-upload-modal"
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
                      id="job-upload-modal"
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
                  {(jobFile || pastedImageName) && (
                    <span className="text-xs text-muted-foreground">
                      {pastedImageName ?? jobFile?.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  필요한 정보 : 회사명, 직무, 경력 유무, 필수조건(역량),
                  우대조건(역량), 주요 업무 내용
                </p>
              </CardContent>
              {/* 항상 보이는 하단 액션 바 */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
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
                      setJobFile(null);
                      setPastedImageName(null);
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
                      : "프로젝트 생성"}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {(creating || jobFileLoading) && <AiLoader />}
      {typeof window !== "undefined" &&
        createPortal(createModal, document.body)}
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl text-foreground">
              자소서 관리
            </h2>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <PlusIcon />새 자소서 만들기
          </Button>
        </div>

        {/* 플랜 사용량 카드 */}
        {usage && (
          <div className="rounded-xl border border-border bg-card shadow-sm px-5 py-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-foreground">
                이번달 사용량
              </p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  usage.plan === "pro"
                    ? "bg-violet-100 text-violet-700 border-violet-200"
                    : usage.plan === "enterprise"
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {usage.plan === "pro"
                  ? "Pro"
                  : usage.plan === "enterprise"
                    ? "Enterprise"
                    : "Free"}{" "}
                Plan
              </span>
            </div>
            <div className="grid grid-cols-4 gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>생성한 자소서</span>
                  <span className="font-medium text-foreground">
                    {usage.usage.generations}&nbsp;/&nbsp;
                    {usage.limits.generations === -1
                      ? "∞"
                      : usage.limits.generations}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all"
                    style={{
                      width:
                        usage.limits.generations === -1
                          ? "0%"
                          : `${Math.min((usage.usage.generations / usage.limits.generations) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>피드백 재생성</span>
                  <span className="font-medium text-foreground">
                    {usage.usage.regenerations}&nbsp;/&nbsp;
                    {usage.limits.regenerations === -1
                      ? "∞"
                      : usage.limits.regenerations}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{
                      width:
                        usage.limits.regenerations === -1
                          ? "0%"
                          : `${Math.min((usage.usage.regenerations / usage.limits.regenerations) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>등록된 이력서</span>
                  <span className="font-medium text-foreground">
                    {usage.usage.resumes}&nbsp;/&nbsp;
                    {usage.limits.resumes === -1 ? "∞" : usage.limits.resumes}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width:
                        usage.limits.resumes === -1
                          ? "0%"
                          : `${Math.min((usage.usage.resumes / usage.limits.resumes) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>회사 검색</span>
                  <span className="font-medium text-foreground">
                    {usage.limits.company_searches === -1
                      ? "∞"
                      : `${usage.extra_company_searches}회 남음`}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{
                      width:
                        usage.limits.company_searches === -1
                          ? "0%"
                          : usage.limits.company_searches === 0
                            ? "0%"
                            : `${Math.min((usage.extra_company_searches / usage.limits.company_searches) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {/* Empty state */}
        <AnimatePresence>
          {!loading && projects.length === 0 && !showCreate && (
            <motion.div
              className="flex flex-col items-center justify-center py-20 text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.4 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <BriefcaseIcon />
              </div>
              <p className="font-heading text-xl text-foreground mt-2">
                아직 생성된 자소서가 없습니다
              </p>
              <Button
                size="sm"
                className="mt-5 gap-2"
                onClick={() => setShowCreate(true)}
              >
                <PlusIcon />
                시작하기
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Project cards */}
        {!loading && projects.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <BentoGrid
              items={projects.map((project) => {
                const status = getProjectStatus(project);
                const config = STATUS_CONFIG[status];
                const company =
                  project.job_analysis?.company || "회사명 미확인";
                const position =
                  project.job_analysis?.position || "직무 미확인";
                const passProb = project.evaluation?.overall_pass_probability;
                const d = new Date(project.created_at);
                const date =
                  "작성 시간 | " +
                  d.toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }) +
                  " " +
                  d.toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  });

                return {
                  title: company,
                  subtitle: position,
                  meta: date,
                  status: config.label,
                  statusColor: config.statusColor,
                  accentColor: config.accent,
                  accentGradient: config.accentGradient,
                  iconGlow: config.iconGlow,
                  resumeName: project.resume_id
                    ? resumeMap[project.resume_id]
                    : undefined,
                  tags: [],
                  badge: passProb != null ? `${passProb}%` : undefined,
                  badgeColor:
                    passProb != null
                      ? passProb >= 70
                        ? "bg-emerald-100 text-emerald-700"
                        : passProb >= 50
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-600"
                      : undefined,
                  onClick: () => router.push(`/projects/${project.id}`),
                  onDelete: (e) => {
                    e.stopPropagation();
                    if (confirm("이 프로젝트를 정말 삭제하시겠습니까?")) {
                      handleDelete(e, project.id);
                    }
                  },
                };
              })}
            />
          </motion.div>
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
      </motion.div>
    </>
  );
}
