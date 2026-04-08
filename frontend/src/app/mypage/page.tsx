"use client";

import React, { useState, useEffect } from "react";
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
import { api, type UsageSummary, type ActivityEvent } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Ticket,
  AlertTriangle,
  Search,
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

const PerkItem = ({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) => (
  <div
    className={`flex items-center gap-1.5 text-xs ${muted ? "text-gray-300" : "text-gray-600"}`}
  >
    <span
      className={`w-1 h-1 rounded-full flex-shrink-0 ${muted ? "bg-gray-300" : "bg-emerald-400"}`}
    />
    {children}
  </div>
);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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
  remaining,
}: {
  label: string;
  used: number;
  limit: number;
  remaining?: number;
}) => {
  const unlimited = limit === -1;
  const isRemainingMode = remaining !== undefined && !unlimited;
  const pct = unlimited
    ? 100
    : isRemainingMode
      ? Math.min(((remaining ?? 0) / Math.max(limit, 1)) * 100, 100)
      : Math.min((used / limit) * 100, 100);
  const danger = !unlimited && !isRemainingMode && pct >= 90;
  const warning = !unlimited && !isRemainingMode && pct >= 70;
  const remainingLow = isRemainingMode && remaining === 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span
          className={`text-xs font-semibold ${
            remainingLow
              ? "text-red-500"
              : danger
                ? "text-red-500"
                : warning
                  ? "text-amber-500"
                  : "text-gray-400"
          }`}
        >
          {unlimited
            ? "무제한"
            : isRemainingMode
              ? `${remaining} / ${limit}`
              : `${used} / ${limit}`}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            unlimited
              ? "bg-gradient-to-r from-violet-300 to-violet-400"
              : remainingLow
                ? "bg-red-400"
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
  const [activity, setActivity] = useState<ActivityEvent[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | undefined>();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete account modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Coupon modal state
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [profileRes, usageRes, resumesRes, activityRes] =
        await Promise.allSettled([
          api.getProfile(),
          api.getUsage(),
          api.listResumes(),
          api.listActivity(),
        ]);
      if (profileRes.status === "fulfilled") setProfile(profileRes.value);
      if (usageRes.status === "fulfilled") setUsage(usageRes.value);
      if (resumesRes.status === "fulfilled")
        setResumeCount(
          Array.isArray(resumesRes.value) ? resumesRes.value.length : 0,
        );
      if (
        activityRes.status === "fulfilled" &&
        Array.isArray(activityRes.value)
      ) {
        setActivity(activityRes.value);
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

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponResult(null);
    try {
      const res = await api.redeemCoupon(couponCode.trim());
      setCouponResult({
        type: "success",
        message: `쿠폰 적용 완료! 생성 +${res.bonus_generations}회, 재생성 +${res.bonus_regenerations}회가 추가되었습니다.`,
      });
      setCouponCode("");
      const updated = await api.getUsage();
      setUsage(updated);
    } catch (e) {
      setCouponResult({ type: "error", message: (e as Error).message });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.deleteAccount();
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setDeleting(false);
      setDeleteOpen(false);
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
                {/* 플랜 카드 — lg에서 2칸×2행 차지 */}
                <Card className="bg-white border border-gray-200 shadow-sm flex flex-col col-span-2 lg:row-span-2">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      현재 플랜
                    </CardTitle>
                    <Crown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="flex gap-6 flex-1">
                      {/* 좌: 플랜명 + 업그레이드 버튼 */}
                      <div className="flex flex-col justify-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                          </span>
                          <span
                            className={`text-3xl font-bold ${
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
                        {plan !== "enterprise" && (
                          <button
                            onClick={() => router.push("/pricing")}
                            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
                          >
                            플랜 업그레이드 <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      {/* 우: 플랜 비교 */}
                      <div className="flex-1 border-l border-gray-100 pl-6 flex flex-col justify-center gap-2">
                        {plan !== "enterprise" && (
                          <>
                            {/* 헤더 + 비교 행: 동일한 grid 컬럼 구조 */}
                            <div className="grid grid-cols-[1fr_5rem_5rem] gap-x-4 gap-y-1.5 items-center">
                              {/* 헤더 */}
                              <span />
                              <span className="text-sm font-semibold text-gray-400 text-center">
                                {PLAN_LABELS[plan]}
                              </span>
                              <span
                                className={`text-sm font-semibold text-center ${plan === "free" ? "text-violet-600" : "text-amber-600"}`}
                              >
                                {plan === "free" ? "Pro" : "Enterprise"}
                              </span>
                              {/* 비교 행 */}
                              {(plan === "free"
                                ? [
                                    ["이력서 등록", "최대 1개", "최대 10개"],
                                    ["자소서 생성", "월 5회", "무제한"],
                                    ["재생성", "불가", "월 5회"],
                                    ["회사 자동 검색", "불가", "무제한"],
                                  ]
                                : [
                                    ["이력서 등록", "최대 10개", "무제한"],
                                    ["자소서 생성", "무제한", "무제한"],
                                    ["재생성", "월 5회", "무제한"],
                                    ["회사 자동 검색", "무제한", "무제한"],
                                  ]
                              ).map(([label, current, next]) => (
                                <React.Fragment key={label}>
                                  <span className="text-sm text-gray-500">
                                    {label}
                                  </span>
                                  <span className="text-sm text-gray-400 text-center">
                                    {current}
                                  </span>
                                  <span
                                    className={`text-sm font-medium text-center ${plan === "free" ? "text-violet-600" : "text-amber-600"}`}
                                  >
                                    {next}
                                  </span>
                                </React.Fragment>
                              ))}
                            </div>
                          </>
                        )}
                        {plan === "enterprise" && (
                          <>
                            <p className="text-xs font-semibold text-amber-600 mb-1">
                              Enterprise 혜택
                            </p>
                            <PerkItem>이력서 무제한 등록</PerkItem>
                            <PerkItem>자소서 생성 무제한</PerkItem>
                            <PerkItem>재생성 무제한</PerkItem>
                            <PerkItem>회사 자동 검색 무제한</PerkItem>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                {usage && usage.plan === "free" ? (
                  <MetricCard
                    title="회사 검색"
                    value={usage.extra_company_searches ?? 0}
                    suffix={`/ ${usage.limits.company_searches}`}
                    description="남은 검색 횟수"
                    icon={Search}
                    accent="text-sky-600"
                  />
                ) : (
                  <MetricCard
                    title="회사 검색"
                    value={usage?.extra_company_searches ?? 0}
                    suffix="회"
                    description="무제한 사용 가능"
                    icon={Search}
                    accent="text-sky-600"
                  />
                )}
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
                      <UsageBar
                        label="회사 검색"
                        used={0}
                        limit={usage.limits.company_searches}
                        remaining={usage.extra_company_searches ?? 0}
                      />
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">
                      사용량 정보를 불러올 수 없습니다.
                    </p>
                  )}
                </CardContent>
                <CardFooter className="mt-auto pt-2 pb-4 px-6 border-t border-gray-100 bg-transparent flex items-center justify-between">
                  <button
                    onClick={() => router.push("/pricing")}
                    className="text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1 transition-colors"
                  >
                    플랜 업그레이드 <ArrowRight className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      setCouponOpen(true);
                      setCouponResult(null);
                      setCouponCode("");
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Ticket className="h-3 w-3" />
                    쿠폰 등록
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
                  <ScrollArea className="h-[320px]">
                    <div className="divide-y divide-gray-100">
                      {!activity || activity.length === 0 ? (
                        <p className="p-6 text-center text-sm text-gray-400">
                          아직 활동 내역이 없습니다.
                        </p>
                      ) : (
                        activity.map((evt, i) => {
                          const isProject = evt.type === "project";
                          const isResume = evt.type === "resume";
                          const isRegen = evt.type === "regeneration";
                          const iconBg = isResume
                            ? "bg-blue-50"
                            : isRegen
                              ? "bg-emerald-50"
                              : "bg-violet-50";
                          const iconColor = isResume
                            ? "text-blue-500"
                            : isRegen
                              ? "text-emerald-500"
                              : "text-violet-500";
                          const badge = isResume
                            ? "이력서 등록"
                            : isRegen
                              ? "재생성"
                              : "프로젝트";
                          const badgeColor = isResume
                            ? "bg-blue-50 text-blue-600"
                            : isRegen
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-violet-50 text-violet-600";
                          const IconComp = isResume
                            ? User
                            : isRegen
                              ? Repeat2
                              : FileText;
                          const clickable = isProject || isRegen;
                          return (
                            <div
                              key={`${evt.type}-${evt.id}-${i}`}
                              className={`flex items-center justify-between px-6 py-3.5 transition-colors ${clickable ? "hover:bg-gray-50 cursor-pointer" : ""}`}
                              onClick={() =>
                                clickable && router.push(`/projects/${evt.id}`)
                              }
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}
                                >
                                  <IconComp
                                    className={`h-4 w-4 ${iconColor}`}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badgeColor}`}
                                    >
                                      {badge}
                                    </span>
                                    <p className="text-sm font-medium text-gray-800 truncate">
                                      {evt.label}
                                    </p>
                                  </div>
                                  {evt.sub && (
                                    <p className="text-xs text-gray-400 truncate mt-0.5">
                                      {evt.sub}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-3">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(evt.created_at)}
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

          {/* ── 회원탈퇴 ── */}
          <motion.div variants={item} className="flex justify-end">
            <button
              onClick={() => setDeleteOpen(true)}
              className="text-sm font-medium text-black bg-red-400 hover:bg-red-500 transition-colors px-4 py-2 rounded-md"
            >
              회원탈퇴
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* ── 회원탈퇴 확인 모달 ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              회원탈퇴
            </DialogTitle>
            <DialogDescription className="pt-1">
              탈퇴하시겠습니까?
              <br />
              모든 데이터(이력서, 자소서 생성 이력)가 <strong>영구 삭제</strong>
              되며 복구할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              취소
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? "탈퇴 중..." : "탈퇴하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 쿠폰 등록 모달 ── */}
      <Dialog
        open={couponOpen}
        onOpenChange={(o) => {
          setCouponOpen(o);
          if (!o) setCouponResult(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-emerald-500" />
              쿠폰 등록
            </DialogTitle>
            <DialogDescription>
              쿠폰 코드를 입력하면 생성 +5회, 재생성 +25회가 추가됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleRedeemCoupon()}
                placeholder="쿠폰 코드 입력"
                disabled={couponLoading}
                className="flex-1 h-10 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-50"
              />
              <Button
                onClick={handleRedeemCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4"
              >
                {couponLoading ? "확인 중..." : "적용"}
              </Button>
            </div>
            {couponResult && (
              <p
                className={`text-sm rounded-md px-3 py-2 ${couponResult.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
              >
                {couponResult.message}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyPage;
