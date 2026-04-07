"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">이력서 관리</h2>
        <p className="text-muted-foreground text-sm mt-1">
          이력서를 등록하면 자소서 생성 시 바로 선택할 수 있습니다
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* 첫 번째 컬럼: 새 이력서 등록 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">새 이력서 등록</CardTitle>
              <div className="flex gap-1">
                <Button
                  variant={inputMode === "file" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInputMode("file")}
                >
                  파일 업로드
                </Button>
                <Button
                  variant={inputMode === "text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInputMode("text")}
                >
                  텍스트 입력
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="text"
              placeholder="이름 (예: 홍길동)"
              value={newResumeName}
              onChange={(e) => setNewResumeName(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              disabled={loading}
            />

            {inputMode === "file" ? (
              <label
                htmlFor="resume-file"
                className="relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input p-8 transition-colors hover:border-foreground/30 cursor-pointer"
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
                    <p className="text-sm font-medium">{selectedFile.name}</p>
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
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </label>
            ) : (
              <Textarea
                placeholder="이력서 전문을 붙여넣으세요..."
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

        {/* 두 번째 컬럼: 저장된 이력서 목록 */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            저장된 이력서 ({resumes.length}건)
          </h3>
          {resumes.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                등록된 이력서가 없습니다
              </CardContent>
            </Card>
          ) : (
            resumes.map((r) => (
              <Card key={r.id}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.updated_at?.slice(0, 10)} 업데이트
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(r.id)}
                  >
                    삭제
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
