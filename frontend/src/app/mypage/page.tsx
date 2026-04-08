"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type UsageSummary } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import {
  FileText,
  Repeat2,
  Crown,
  Clock,
  User,
  Pencil,
  ArrowRight,
  Activity,
  TrendingUp,
  Camera,
} from "lucide-react";

// ── Variants ──────────────────────────────────────────────────────────────────

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-700 border-slate-200",
  pro: "bg-violet-100 text-violet-700 border-violet-200",
  enterprise: "bg-amber-100 text-amber-700 border-amber-200",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// ── Sub-components ────────────────────────────────────────────────────────────

const MetricCard = ({
  title,
  value,
  suffix = "",
  description,
  icon: Icon,
  accent = "text-gray-800",
}: {
  title: string;
  value: string | number;
  suffix?: string;
  description?: string;
  icon: React.ElementType;
  accent?: string;
}) => (
  <Card className="flex-1 min-w-[200px] bg-white border border-gray-200 shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-500">
        {title}
      </CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className={`text-3xl font-bold ${accent}`}>
        {value}
        {suffix && (
          <span className="text-base font-normal text-gray-400 ml-1">
            {suffix}
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
);

const UsageBar = ({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) => {
  const unlimited = limit === -1;
  const pct = unlimited ? 100 : Math.min((used / limit) * 100, 100);
  const danger = !unlimited && pct >= 90;
  const warning = !unlimited && pct >= 70;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span
          className={`text-xs font-semibold ${
            danger
              ? "text-red-500"
              : warning
                ? "text-amber-500"
                : "text-gray-400"
          }`}
        >
          {unlimited ? "무제한" : `${used} / ${limit}`}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            unlimited
              ? "bg-gradient-to-r from-violet-300 to-violet-400"
              : danger
                ? "bg-red-400"
                : warning
                  ? "bg-amber-400"
                  : "bg-violet-400"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
        />
      </div>
    </div>
  );
};

const SkeletonCard = ({ rows = 3 }: { rows?: number }) => (
  <Card className="bg-white border border-gray-200 shadow-sm">
    <CardContent className="pt-6 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-100 rounded animate-pulse ${
            i === 0 ? "w-1/2" : i % 2 === 0 ? "w-full" : "w-3/4"
          }`}
        />
      ))}
    </CardContent>
  </Card>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const MyPage = () => {
  const router = useRouter();
  const { session } = useAuth();

  const [profile, setProfile] = useState<{
    name?: string;
    job_title?: string;
    avatar_url?: string;
    bio?: string;
  } | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [resumeCount, setResumeCount] = useState<number | null>(null);
  const [recentProjects, setRecentProjects] = useState<Array<{
    id: number;
    job_analysis?: { company?: string; position?: string };
    created_at: string;
    status?: string;
  }> | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | undefined>();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [profileRes, usageRes, resumesRes, projectsRes] =
        await Promise.allSettled([
          api.getProfile(),
          api.getUsage(),
          api.listResumes(),
          api.listProjects(),
        ]);
      if (profileRes.status === "fulfilled") setProfile(profileRes.value);
      if (usageRes.status === "fulfilled") setUsage(usageRes.value);
      if (resumesRes.status === "fulfilled")
        setResumeCount(
          Array.isArray(resumesRes.value) ? resumesRes.value.length : 0,
        );
      if (
        projectsRes.status === "fulfilled" &&
        Array.isArray(projectsRes.value)
      ) {
        setRecentProjects(
          [...projectsRes.value]
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )
            .slice(0, 8),
        );
      }
      setLoading(false);
    };
    load();
  }, []);

  const startEdit = () => {
    setEditName(profile?.name ?? "");
    setEditJobTitle(profile?.job_title ?? "");
    setEditAvatarUrl(profile?.avatar_url);
    setEditBio(profile?.bio ?? "");
    setEditing(true);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const userId = session?.user?.id;
    if (!userId) return;

    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // cache buster로 브라우저 캐시 무력화
      setEditAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await api.saveProfile({
        name: editName,
        job_title: editJobTitle || undefined,
        avatar_url: editAvatarUrl,
        bio: editBio || undefined,
        agreed_to_terms: true,
      });
      setProfile(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const email = session?.user?.email ?? "";
  const displayName = profile?.name || email.split("@")[0] || "사용자";
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const plan = usage?.plan ?? "free";

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-8"
        >
          {/* ── Header ── */}
          <motion.div variants={item}>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Dashboard
            </h1>
          </motion.div>

          {/* ── Metric cards ── */}
          <motion.div
            variants={item}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} rows={2} />
              ))
            ) : (
              <>
                <MetricCard
                  title="자소서 생성"
                  value={usage?.usage.generations ?? 0}
                  suffix={
                    usage && usage.limits.generations !== -1
                      ? `/ ${usage.limits.generations}`
                      : "회"
                  }
                  description="총 생성 횟수"
                  icon={FileText}
                  accent="text-violet-600"
                />
                <MetricCard
                  title="이력서"
                  value={resumeCount ?? 0}
                  suffix="개"
                  description="등록된 이력서"
                  icon={User}
                  accent="text-blue-600"
                />
                <MetricCard
                  title="재생성"
                  value={usage?.usage.regenerations ?? 0}
                  suffix={
                    usage && usage.limits.regenerations !== -1
                      ? `/ ${usage.limits.regenerations}`
                      : "회"
                  }
                  description="피드백 반영 재작성 횟수"
                  icon={Repeat2}
                  accent="text-emerald-600"
                />
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      현재 플랜
                    </CardTitle>
                    <Crown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span
                        className={`text-2xl font-bold ${
                          plan === "pro"
                            ? "text-violet-600"
                            : plan === "enterprise"
                              ? "text-amber-600"
                              : "text-gray-700"
                        }`}
                      >
                        {PLAN_LABELS[plan]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      구독중인 플랜
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </motion.div>

          {/* ── Middle row: 프로필 + 사용량 ── */}
          <motion.div
            variants={item}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* 프로필 */}
            {loading ? (
              <SkeletonCard rows={4} />
            ) : (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-700">
                      프로필
                    </CardTitle>
                  </div>
                  {!editing && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={startEdit}
                    >
                      <Pencil className="h-3 w-3" />
                      편집
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0 group">
                      {(editing ? editAvatarUrl : profile?.avatar_url) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={editing ? editAvatarUrl : profile?.avatar_url}
                          alt="프로필 사진"
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xl select-none">
                          {avatarLetter}
                        </div>
                      )}
                      {editing && (
                        <label className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          {avatarUploading ? (
                            <span className="text-white text-[10px]">
                              업로드 중
                            </span>
                          ) : (
                            <Camera className="h-4 w-4 text-white" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                            disabled={avatarUploading}
                          />
                        </label>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {editing ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-14 shrink-0">
                              이름
                            </span>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="홍길동"
                              className="flex-1 h-8 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-14 shrink-0">
                              희망 직무
                            </span>
                            <input
                              type="text"
                              value={editJobTitle}
                              onChange={(e) => setEditJobTitle(e.target.value)}
                              placeholder="백엔드 개발자"
                              className="flex-1 h-8 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              className="text-xs bg-violet-600 hover:bg-violet-700 text-white"
                              onClick={saveProfile}
                              disabled={saving || !editName.trim()}
                            >
                              {saving ? "저장 중..." : "저장"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-gray-500"
                              onClick={() => setEditing(false)}
                              disabled={saving}
                            >
                              취소
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400 w-16 shrink-0">
                              이름
                            </span>
                            <span className="text-gray-200 select-none">|</span>
                            <span className="font-semibold text-gray-900 truncate">
                              {displayName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400 w-16 shrink-0">
                              희망 직무
                            </span>
                            <span className="text-gray-200 select-none">|</span>
                            <span className="text-gray-600 truncate">
                              {profile?.job_title || (
                                <span className="text-gray-300 italic">
                                  미입력
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400 w-16 shrink-0">
                              메일
                            </span>
                            <span className="text-gray-200 select-none">|</span>
                            <span className="text-gray-500 truncate">
                              {email}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 pb-4 px-6 flex flex-col items-start gap-1.5 bg-transparent border-t-0">
                  <span className="text-xs font-semibold text-gray-500">
                    자기소개
                  </span>
                  {editing ? (
                    <div className="w-full flex flex-col gap-1">
                      <textarea
                        value={editBio}
                        onChange={(e) =>
                          setEditBio(e.target.value.slice(0, 200))
                        }
                        placeholder="간단한 자기소개를 입력하세요"
                        rows={3}
                        maxLength={200}
                        className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                      />
                      <p className="text-xs text-gray-400 self-end">
                        {editBio.length} / 200
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {profile?.bio || (
                        <span className="text-gray-300 italic">미입력</span>
                      )}
                    </p>
                  )}
                </CardFooter>
              </Card>
            )}

            {/* 사용량 */}
            {loading ? (
              <SkeletonCard rows={5} />
            ) : (
              <Card className="bg-white border border-gray-200 shadow-sm flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-violet-500" />
                    이번달 사용량
                  </CardTitle>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${PLAN_COLORS[plan] ?? PLAN_COLORS.free}`}
                  >
                    {PLAN_LABELS[plan] ?? plan} Plan
                  </span>
                </CardHeader>
                <CardContent className="space-y-5">
                  {usage ? (
                    <>
                      <UsageBar
                        label="자소서 생성"
                        used={usage.usage.generations}
                        limit={usage.limits.generations}
                      />
                      <UsageBar
                        label="이력서 등록"
                        used={usage.usage.resumes}
                        limit={usage.limits.resumes}
                      />
                      <UsageBar
                        label="피드백 재생성"
                        used={usage.usage.regenerations}
                        limit={usage.limits.regenerations}
                      />
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">
                      사용량 정보를 불러올 수 없습니다.
                    </p>
                  )}
                </CardContent>
                <CardFooter className="mt-auto pt-2 pb-4 px-6 border-t border-gray-100 bg-transparent">
                  <button
                    onClick={() => router.push("/pricing")}
                    className="text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1 transition-colors"
                  >
                    플랜 업그레이드 <ArrowRight className="h-3 w-3" />
                  </button>
                </CardFooter>
              </Card>
            )}
          </motion.div>

          {/* ── 최근 활동 ── */}
          <motion.div variants={item}>
            {loading ? (
              <SkeletonCard rows={5} />
            ) : (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-700">
                    <Activity className="h-4 w-4 text-violet-500" />
                    최근 활동
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[280px]">
                    <div className="divide-y divide-gray-100">
                      {!recentProjects || recentProjects.length === 0 ? (
                        <p className="p-6 text-center text-sm text-gray-400">
                          아직 작성한 자소서가 없습니다.
                        </p>
                      ) : (
                        recentProjects.map((p) => {
                          const company =
                            p.job_analysis?.company ?? "회사명 없음";
                          const position = p.job_analysis?.position;
                          return (
                            <div
                              key={p.id}
                              className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => router.push(`/projects/${p.id}`)}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                                  <FileText className="h-4 w-4 text-violet-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">
                                    {company}
                                  </p>
                                  {position && (
                                    <p className="text-xs text-gray-400 truncate">
                                      {position}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-3">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(p.created_at)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter className="pt-4 border-t border-gray-100 bg-transparent">
                  <button
                    onClick={() => router.push("/")}
                    className="text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1 transition-colors"
                  >
                    전체 프로젝트 보기 <ArrowRight className="h-3 w-3" />
                  </button>
                </CardFooter>
              </Card>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default MyPage;
