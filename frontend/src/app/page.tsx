"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api, getProjectStatus } from "@/lib/api";
import type { Project, ProjectStatus } from "@/lib/api";

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  draft: {
    label: "채용공고만 입력됨",
    color: "bg-muted text-muted-foreground",
  },
  ready: { label: "이력서 설정 완료", color: "bg-blue-500/15 text-blue-400" },
  generated: {
    label: "자소서 생성 완료",
    color: "bg-yellow-500/15 text-yellow-400",
  },
  evaluated: { label: "평가 완료", color: "bg-green-500/15 text-green-400" },
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

// ── 회사명/직무 편집 모달 ──

const EditInfoModal = ({
  project,
  isUnknown,
  onSave,
  onClose,
}: {
  project: Project;
  isUnknown: boolean;
  onSave: (id: number, company: string, position: string) => Promise<void>;
  onClose: () => void;
}) => {
  const [company, setCompany] = useState(
    project.job_analysis?.company === "미확인"
      ? ""
      : project.job_analysis?.company || "",
  );
  const [position, setPosition] = useState(
    project.job_analysis?.position === "미확인"
      ? ""
      : project.job_analysis?.position || "",
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!company.trim() || !position.trim()) return;
    setSaving(true);
    await onSave(project.id, company.trim(), position.trim());
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 space-y-4 animate-fade-in">
        <div>
          <h3 className="text-base font-semibold">
            {isUnknown ? "회사/직무 정보를 입력해주세요" : "회사/직무 수정"}
          </h3>
          {isUnknown && (
            <p className="text-xs text-muted-foreground mt-1">
              채용공고에서 자동 감지하지 못했습니다. 직접 입력해주세요.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1.5">
              회사명
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="예: 삼성전자"
              className="w-full h-10 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1.5">
              직무
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="예: 백엔드 개발자"
              className="w-full h-10 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          {!isUnknown && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
            >
              취소
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!company.trim() || !position.trim() || saving}
          >
            {saving ? "저장 중..." : "저장"}
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
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [jobFileLoading, setJobFileLoading] = useState(false);

  // 편집 모달
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editIsUnknown, setEditIsUnknown] = useState(false);

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

  const openEditModal = useCallback((project: Project, isUnknown: boolean) => {
    setEditingProject(project);
    setEditIsUnknown(isUnknown);
  }, []);

  const handleSaveInfo = async (
    id: number,
    company: string,
    position: string,
  ) => {
    const target = projects.find((p) => p.id === id);
    if (!target) return;

    const updatedAnalysis = { ...target.job_analysis, company, position };
    await api.updateProject(id, {
      job_analysis: updatedAnalysis,
    } as Partial<Project>);

    setProjects((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, job_analysis: updatedAnalysis } : p,
      ),
    );
    setEditingProject(null);
  };

  const handleCreate = async (text?: string) => {
    const posting = text || jobPosting;
    if (!posting.trim()) return;
    setCreating(true);
    try {
      const project = await api.createProject(posting);
      setProjects((prev) => [project, ...(Array.isArray(prev) ? prev : [])]);
      setShowCreate(false);
      setJobPosting("");
      setJobFile(null);

      // 미확인이면 바로 편집 모달 띄우기
      if (hasUnknownInfo(project)) {
        openEditModal(project, true);
      }
    } catch {
      // keep form open on error
    } finally {
      setCreating(false);
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
                  {creating ? "분석 중..." : "프로젝트 생성"}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            const unknown = hasUnknownInfo(project);

            return (
              <div key={project.id ?? idx} className="text-left group relative">
                {/* 편집 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(project, false);
                  }}
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                  title="회사/직무 수정"
                >
                  <PencilIcon />
                </button>

                <button
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="w-full text-left"
                >
                  <Card
                    className={`h-full transition-all duration-200 hover:border-primary/40 hover:bg-accent/20 cursor-pointer ${unknown ? "border-yellow-500/30" : ""}`}
                  >
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1 pr-6">
                          <p
                            className={`text-sm font-semibold truncate ${unknown ? "text-yellow-400" : ""}`}
                          >
                            {company}
                          </p>
                          <p
                            className={`text-xs truncate mt-0.5 ${unknown ? "text-yellow-400/70" : "text-muted-foreground"}`}
                          >
                            {position}
                          </p>
                        </div>
                        <span className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
                          <ArrowRightIcon />
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {unknown && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-yellow-500/15 text-yellow-400"
                          >
                            정보 미확인
                          </Badge>
                        )}
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${config.color}`}
                        >
                          {config.label}
                        </Badge>
                        {passProb != null && (
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-mono ${
                              passProb >= 70
                                ? "bg-green-500/15 text-green-400"
                                : passProb >= 50
                                  ? "bg-yellow-500/15 text-yellow-400"
                                  : "bg-red-500/15 text-red-400"
                            }`}
                          >
                            {passProb}%
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground/50 ml-auto">
                          {date}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 편집 모달 */}
      {editingProject && (
        <EditInfoModal
          project={editingProject}
          isUnknown={editIsUnknown}
          onSave={handleSaveInfo}
          onClose={() => setEditingProject(null)}
        />
      )}
    </div>
  );
}
