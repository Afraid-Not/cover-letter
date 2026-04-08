"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { UsageSummary } from "@/lib/api";
import { AiLoader } from "@/components/ui/ai-loader";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { toast } from "sonner";

interface Resume {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

interface Education {
  school: string;
  major: string;
  gpa: string;
  period: string;
}

interface Experience {
  company: string;
  role: string;
  period: string;
  description: string;
}

interface Project {
  name: string;
  role: string;
  period: string;
  tech_stack: string[];
  description: string;
  results: string;
}

interface Language {
  name: string;
  score: string;
}

interface ResumeStructured {
  name: string;
  education: Education[];
  experience: Experience[];
  projects: Project[];
  skills: string[];
  certifications: string[];
  awards: string[];
  languages: Language[];
}

const emptyStructured = (): ResumeStructured => ({
  name: "",
  education: [],
  experience: [],
  projects: [],
  skills: [],
  certifications: [],
  awards: [],
  languages: [],
});

// ── 인라인 텍스트 인풋 ────────────────────────────────────────────
const Field = ({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) =>
  textarea ? (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="text-sm resize-none"
      />
    </label>
  ) : (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
      />
    </label>
  );

// ── 배열(문자열) 편집 ──────────────────────────────────────────────
const StringArraySection = ({
  title,
  items,
  onChange,
}: {
  title: string;
  items: string[];
  onChange: (v: string[]) => void;
}) => (
  <section>
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() => onChange([...items, ""])}
      >
        + 추가
      </Button>
    </div>
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="flex-1 h-8 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-rose-500"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            ✕
          </Button>
        </div>
      ))}
    </div>
  </section>
);

// ── 편집 모달 ─────────────────────────────────────────────────────
const ResumeEditModal = ({
  resumeId,
  open,
  onClose,
  onSaved,
}: {
  resumeId: number | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [data, setData] = useState<ResumeStructured>(emptyStructured());
  const [resumeName, setResumeName] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || resumeId === null) return;
    setFetchLoading(true);
    api
      .getResume(resumeId)
      .then((r) => {
        setResumeName(r.name ?? "");
        setData({ ...emptyStructured(), ...(r.structured_data ?? {}) });
      })
      .catch(() => toast.error("이력서를 불러오지 못했습니다."))
      .finally(() => setFetchLoading(false));
  }, [open, resumeId]);

  const set = <K extends keyof ResumeStructured>(
    key: K,
    val: ResumeStructured[K],
  ) => setData((prev) => ({ ...prev, [key]: val }));

  const setEdu = (i: number, field: keyof Education, val: string) =>
    setData((prev) => {
      const next = prev.education.map((e, j) =>
        j === i ? { ...e, [field]: val } : e,
      );
      return { ...prev, education: next };
    });

  const setExp = (i: number, field: keyof Experience, val: string) =>
    setData((prev) => {
      const next = prev.experience.map((e, j) =>
        j === i ? { ...e, [field]: val } : e,
      );
      return { ...prev, experience: next };
    });

  const setProj = (i: number, field: keyof Project, val: string | string[]) =>
    setData((prev) => {
      const next = prev.projects.map((p, j) =>
        j === i ? { ...p, [field]: val } : p,
      );
      return { ...prev, projects: next };
    });

  const setLang = (i: number, field: keyof Language, val: string) =>
    setData((prev) => {
      const next = prev.languages.map((l, j) =>
        j === i ? { ...l, [field]: val } : l,
      );
      return { ...prev, languages: next };
    });

  const handleSave = async () => {
    if (resumeId === null) return;
    setSaving(true);
    try {
      await api.updateResume(resumeId, {
        name: resumeName,
        structured_data: data as unknown as Record<string, unknown>,
      });
      toast.success("이력서가 저장되었습니다.");
      onSaved();
      onClose();
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>이력서 수정</DialogTitle>
        </DialogHeader>

        {fetchLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            불러오는 중...
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-2">
            {/* 이력서 제목 */}
            <Field
              label="이력서 제목"
              value={resumeName}
              onChange={setResumeName}
            />

            {/* 기본 정보 */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                기본 정보
              </h3>
              <Field
                label="이름"
                value={data.name}
                onChange={(v) => set("name", v)}
              />
            </section>

            <hr className="border-border" />

            {/* 학력 */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">학력</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    set("education", [
                      ...data.education,
                      { school: "", major: "", gpa: "", period: "" },
                    ])
                  }
                >
                  + 추가
                </Button>
              </div>
              <div className="flex flex-col gap-4">
                {data.education.map((edu, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border p-3 flex flex-col gap-2 relative"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-rose-500"
                      onClick={() =>
                        set(
                          "education",
                          data.education.filter((_, j) => j !== i),
                        )
                      }
                    >
                      ✕
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Field
                        label="학교명"
                        value={edu.school}
                        onChange={(v) => setEdu(i, "school", v)}
                      />
                      <Field
                        label="전공"
                        value={edu.major}
                        onChange={(v) => setEdu(i, "major", v)}
                      />
                      <Field
                        label="학점"
                        value={edu.gpa}
                        onChange={(v) => setEdu(i, "gpa", v)}
                      />
                      <Field
                        label="기간"
                        value={edu.period}
                        onChange={(v) => setEdu(i, "period", v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <hr className="border-border" />

            {/* 경력 */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">경력</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    set("experience", [
                      ...data.experience,
                      { company: "", role: "", period: "", description: "" },
                    ])
                  }
                >
                  + 추가
                </Button>
              </div>
              <div className="flex flex-col gap-4">
                {data.experience.map((exp, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border p-3 flex flex-col gap-2 relative"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-rose-500"
                      onClick={() =>
                        set(
                          "experience",
                          data.experience.filter((_, j) => j !== i),
                        )
                      }
                    >
                      ✕
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Field
                        label="회사명"
                        value={exp.company}
                        onChange={(v) => setExp(i, "company", v)}
                      />
                      <Field
                        label="직무/직책"
                        value={exp.role}
                        onChange={(v) => setExp(i, "role", v)}
                      />
                      <Field
                        label="기간"
                        value={exp.period}
                        onChange={(v) => setExp(i, "period", v)}
                      />
                    </div>
                    <Field
                      label="업무 설명"
                      value={exp.description}
                      onChange={(v) => setExp(i, "description", v)}
                      textarea
                    />
                  </div>
                ))}
              </div>
            </section>

            <hr className="border-border" />

            {/* 프로젝트 */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">
                  프로젝트
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    set("projects", [
                      ...data.projects,
                      {
                        name: "",
                        role: "",
                        period: "",
                        tech_stack: [],
                        description: "",
                        results: "",
                      },
                    ])
                  }
                >
                  + 추가
                </Button>
              </div>
              <div className="flex flex-col gap-4">
                {data.projects.map((proj, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border p-3 flex flex-col gap-2 relative"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-rose-500"
                      onClick={() =>
                        set(
                          "projects",
                          data.projects.filter((_, j) => j !== i),
                        )
                      }
                    >
                      ✕
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Field
                        label="프로젝트명"
                        value={proj.name}
                        onChange={(v) => setProj(i, "name", v)}
                      />
                      <Field
                        label="역할"
                        value={proj.role}
                        onChange={(v) => setProj(i, "role", v)}
                      />
                      <Field
                        label="기간"
                        value={proj.period}
                        onChange={(v) => setProj(i, "period", v)}
                      />
                    </div>
                    <Field
                      label="기술 스택 (쉼표 구분)"
                      value={proj.tech_stack.join(", ")}
                      onChange={(v) =>
                        setProj(
                          i,
                          "tech_stack",
                          v
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        )
                      }
                    />
                    <Field
                      label="설명"
                      value={proj.description}
                      onChange={(v) => setProj(i, "description", v)}
                      textarea
                    />
                    <Field
                      label="성과"
                      value={proj.results}
                      onChange={(v) => setProj(i, "results", v)}
                      textarea
                    />
                  </div>
                ))}
              </div>
            </section>

            <hr className="border-border" />

            {/* 스킬 */}
            <StringArraySection
              title="스킬"
              items={data.skills}
              onChange={(v) => set("skills", v)}
            />

            <hr className="border-border" />

            {/* 자격증 */}
            <StringArraySection
              title="자격증"
              items={data.certifications}
              onChange={(v) => set("certifications", v)}
            />

            <hr className="border-border" />

            {/* 수상 */}
            <StringArraySection
              title="수상"
              items={data.awards}
              onChange={(v) => set("awards", v)}
            />

            <hr className="border-border" />

            {/* 어학 */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">어학</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    set("languages", [
                      ...data.languages,
                      { name: "", score: "" },
                    ])
                  }
                >
                  + 추가
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {data.languages.map((lang, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Field
                        label="언어/시험"
                        value={lang.name}
                        onChange={(v) => setLang(i, "name", v)}
                      />
                      <Field
                        label="점수"
                        value={lang.score}
                        onChange={(v) => setLang(i, "score", v)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 mb-0.5 text-muted-foreground hover:text-rose-500"
                      onClick={() =>
                        set(
                          "languages",
                          data.languages.filter((_, j) => j !== i),
                        )
                      }
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving || fetchLoading}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── 메인 페이지 ───────────────────────────────────────────────────
export default function ResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumesLoaded, setResumesLoaded] = useState(false);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [newResumeText, setNewResumeText] = useState("");
  const [newResumeName, setNewResumeName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<"text" | "file">("file");
  const [editResumeId, setEditResumeId] = useState<number | null>(null);

  useNavigationGuard(
    loading,
    "이력서 파싱 중입니다. 페이지를 벗어나면 작업이 중단됩니다.",
  );

  const loadResumes = () => {
    api
      .listResumes()
      .then((data) => {
        setResumes(data);
        setResumesLoaded(true);
      })
      .catch(() => setResumesLoaded(true));
  };

  const refreshUsage = () =>
    api
      .getUsage()
      .then(setUsage)
      .catch(() => {});

  useEffect(() => {
    loadResumes();
    refreshUsage();
  }, []);

  const handleAdd = async () => {
    if (
      usage &&
      usage.limits.resumes > 0 &&
      usage.usage.resumes >= usage.limits.resumes
    ) {
      toast.error("이력서 등록 한도에 도달했습니다.", {
        description: "플랜을 업그레이드하여 더 많은 이력서를 등록하세요.",
        action: { label: "업그레이드", onClick: () => router.push("/pricing") },
      });
      return;
    }
    setLoading(true);
    try {
      if (inputMode === "file" && selectedFile) {
        await api.uploadResume(selectedFile, newResumeName || undefined);
        setSelectedFile(null);
      } else if (inputMode === "text" && newResumeText) {
        await api.addResume(newResumeText, newResumeName || undefined);
        setNewResumeText("");
      }
      setNewResumeName("");
      loadResumes();
      refreshUsage();
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 이력서를 삭제하시겠습니까?")) return;
    try {
      await api.deleteResume(id);
      loadResumes();
      refreshUsage();
    } catch {
      // handle error
    }
  };

  const canSubmit =
    (inputMode === "file" && selectedFile) ||
    (inputMode === "text" && newResumeText);

  const resumeLimit = usage?.limits.resumes ?? -1;
  const resumeCount = usage?.usage.resumes ?? 0;
  const atResumeLimit = resumeLimit > 0 && resumeCount >= resumeLimit;

  const resumeItemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" as const },
    },
  };

  return (
    <>
      {loading && <AiLoader />}

      <ResumeEditModal
        resumeId={editResumeId}
        open={editResumeId !== null}
        onClose={() => setEditResumeId(null)}
        onSaved={loadResumes}
      />

      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h2 className="font-heading text-2xl text-foreground">이력서 관리</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* 새 이력서 등록 폼 */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-semibold">
                    새 이력서 등록
                  </CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={inputMode === "file" ? "default" : "outline"}
                    size="sm"
                    className="w-16"
                    onClick={() => setInputMode("file")}
                  >
                    PDF
                  </Button>
                  <Button
                    variant={inputMode === "text" ? "default" : "outline"}
                    size="sm"
                    className="w-16"
                    onClick={() => setInputMode("text")}
                  >
                    TEXT
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                type="text"
                placeholder="이력서 제목"
                value={newResumeName}
                onChange={(e) => setNewResumeName(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                disabled={loading}
              />

              {inputMode === "file" ? (
                <label
                  htmlFor="resume-file"
                  className="relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                >
                  <svg
                    className="w-8 h-8 text-muted-foreground"
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
                  {selectedFile ? (
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        PDF, TXT, MD 파일을 클릭하여 선택하세요
                      </p>
                    </div>
                  )}
                  <input
                    id="resume-file"
                    type="file"
                    accept=".pdf,.txt,.md"
                    className="sr-only"
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] || null)
                    }
                    disabled={loading}
                  />
                </label>
              ) : (
                <Textarea
                  placeholder="이력서를 붙여 넣으세요."
                  value={newResumeText}
                  onChange={(e) => setNewResumeText(e.target.value)}
                  rows={10}
                  disabled={loading}
                />
              )}

              <Button
                onClick={handleAdd}
                disabled={!canSubmit || loading || atResumeLimit}
                className="w-full"
              >
                {loading ? "파싱 중..." : "등록하기"}
              </Button>
            </CardContent>
          </Card>

          {/* 저장된 이력서 목록 */}
          <div className="space-y-3 min-w-0">
            {!resumesLoaded ? null : resumes.length === 0 ? (
              <Card className="border-border shadow-sm self-start">
                <CardContent className="py-4 text-sm text-muted-foreground text-center">
                  등록된 이력서가 없습니다
                </CardContent>
              </Card>
            ) : (
              <motion.div
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.08 },
                  },
                }}
              >
                {resumes.map((r) => (
                  <motion.div key={r.id} variants={resumeItemVariants}>
                    <Card
                      className="border-border shadow-sm hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => setEditResumeId(r.id)}
                    >
                      <CardContent className="pt-3 pb-3 flex flex-col gap-3 min-h-[80px]">
                        <p className="font-heading text-lg font-semibold text-foreground">
                          {r.name}
                        </p>
                        <div className="mt-auto flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {r.updated_at?.slice(0, 10)} 업데이트
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(r.id);
                            }}
                          >
                            삭제
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
