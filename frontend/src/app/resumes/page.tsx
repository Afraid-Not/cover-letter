"use client";

import { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { AiLoader } from "@/components/ui/ai-loader";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";

interface Resume {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [newResumeText, setNewResumeText] = useState("");
  const [newResumeName, setNewResumeName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<"text" | "file">("file");

  useNavigationGuard(
    loading,
    "이력서 파싱 중입니다. 페이지를 벗어나면 작업이 중단됩니다.",
  );

  const loadResumes = () => {
    api
      .listResumes()
      .then(setResumes)
      .catch(() => {});
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleAdd = async () => {
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
    } catch {
      // handle error
    }
  };

  const canSubmit =
    (inputMode === "file" && selectedFile) ||
    (inputMode === "text" && newResumeText);

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
                <CardTitle className="text-xl font-semibold">
                  새 이력서 등록
                </CardTitle>
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
                disabled={!canSubmit || loading}
                className="w-full"
              >
                {loading ? "파싱 중..." : "등록하기"}
              </Button>
            </CardContent>
          </Card>

          {/* 저장된 이력서 목록 */}
          <div className="space-y-3 min-w-0">
            {resumes.length === 0 ? (
              <Card className="border-border shadow-sm max-w-xs">
                <CardContent className="pt-6 text-center text-sm text-muted-foreground">
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
                    <Card className="border-border shadow-sm hover:border-primary/30 transition-colors">
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
                            onClick={() => handleDelete(r.id)}
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
