"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import {
  adminApi,
  type AdminUser,
  type AdminStats,
  type AdminSettings,
  type AdminGeneration,
  type AdminResume,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ── 플랜 배지 ──
const PlanBadge = ({ plan }: { plan: string }) => {
  const styles: Record<string, string> = {
    free: "bg-zinc-700 text-zinc-200",
    pro: "bg-violet-700 text-violet-100",
    enterprise: "bg-amber-700 text-amber-100",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${styles[plan] ?? styles.free}`}
    >
      {plan.toUpperCase()}
    </span>
  );
};

// ── Toggle Switch ──
const Toggle = ({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none disabled:opacity-50 ${
      checked ? "bg-violet-600" : "bg-zinc-600"
    }`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-4" : "translate-x-1"
      }`}
    />
  </button>
);

// ── KPI 카드 ──
const KpiCard = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <Card className="bg-card border-border">
    <CardContent className="pt-5 pb-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </CardContent>
  </Card>
);

// ── 인라인 숫자 편집 ──
const InlineNumber = ({
  value,
  onSave,
}: {
  value: number;
  onSave: (v: number) => Promise<void>;
}) => {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleChange = async (n: number) => {
    if (isNaN(n) || n < 0) return;
    setDraft(n);
    setSaving(true);
    await onSave(n);
    setSaving(false);
  };

  return (
    <input
      type="number"
      min={0}
      value={draft}
      disabled={saving}
      onChange={(e) => handleChange(parseInt(e.target.value, 10))}
      className="w-16 px-1.5 py-0.5 text-sm font-semibold rounded bg-zinc-800 border border-zinc-600 text-zinc-50 focus:outline-none focus:border-violet-500 disabled:opacity-50"
    />
  );
};

// ── 플랜 선택 드롭다운 ──
const PlanSelect = ({
  current,
  onChange,
}: {
  current: string;
  onChange: (plan: "free" | "pro" | "enterprise") => Promise<void>;
}) => {
  const [saving, setSaving] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const plan = e.target.value as "free" | "pro" | "enterprise";
    setSaving(true);
    await onChange(plan);
    setSaving(false);
  };

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={saving}
      className="text-xs font-semibold px-2 py-1 rounded bg-zinc-800 border border-zinc-600 text-zinc-50 focus:outline-none focus:border-violet-500 disabled:opacity-50"
    >
      <option value="free" className="bg-zinc-800 text-white font-semibold">
        FREE
      </option>
      <option value="pro" className="bg-zinc-800 text-white font-semibold">
        PRO
      </option>
      <option
        value="enterprise"
        className="bg-zinc-800 text-white font-semibold"
      >
        ENTERPRISE
      </option>
    </select>
  );
};

// ── 메인 페이지 ──
export default function AdminPage() {
  const { role, loading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [generations, setGenerations] = useState<AdminGeneration[]>([]);
  const [resumes, setResumes] = useState<AdminResume[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [fetching, setFetching] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    if (!loading && role !== "admin") {
      router.replace("/");
    }
  }, [loading, role, router]);

  const fetchAll = useCallback(async () => {
    setFetching(true);
    try {
      const [s, u, g, rv, cfg] = await Promise.all([
        adminApi.getStats(),
        adminApi.listUsers(),
        adminApi.listGenerations(),
        adminApi.listResumes(),
        adminApi.getSettings(),
      ]);
      setStats(s);
      setUsers(u);
      setGenerations(g);
      setResumes(rv);
      setSettings(cfg);
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (role === "admin") fetchAll();
  }, [role, fetchAll]);

  const handleTogglePlan = async (key: keyof AdminSettings, value: boolean) => {
    if (!settings) return;
    const optimistic = { ...settings, [key]: value };
    setSettings(optimistic);
    setSettingsSaving(true);
    try {
      await adminApi.updateSettings({ [key]: value });
    } catch {
      setSettings(settings);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleChangePlan = async (
    userId: string,
    plan: "free" | "pro" | "enterprise",
  ) => {
    await adminApi.changeUserPlan(userId, plan);
    setUsers((prev) =>
      prev.map((u) => (u.user_id === userId ? { ...u, plan } : u)),
    );
  };

  const handleSetExtraRegen = async (userId: string, value: number) => {
    await adminApi.setExtraRegenerations(userId, value);
    setUsers((prev) =>
      prev.map((u) =>
        u.user_id === userId ? { ...u, extra_regenerations: value } : u,
      ),
    );
  };

  if (loading || role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-8 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              관리자 대시보드
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">AURA Admin</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAll}
            disabled={fetching}
            className="text-xs"
          >
            {fetching ? "로딩 중..." : "새로고침"}
          </Button>
        </div>

        {/* KPI 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="총 유저" value={stats?.total_users ?? "-"} />
          <KpiCard label="오늘 생성" value={stats?.today_generations ?? "-"} />
          <KpiCard label="총 생성" value={stats?.total_generations ?? "-"} />
          <KpiCard
            label="플랜 분포 (Free / Pro / Ent)"
            value={
              stats
                ? `${stats.plan_distribution.free} / ${stats.plan_distribution.pro} / ${stats.plan_distribution.enterprise}`
                : "-"
            }
          />
        </div>

        {/* 플랜 구매 on/off */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              플랜 구매 설정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              {(
                [
                  {
                    key: "plan_free_enabled" as const,
                    label: "Free 플랜 구매",
                  },
                  { key: "plan_pro_enabled" as const, label: "Pro 플랜 구매" },
                  {
                    key: "plan_enterprise_enabled" as const,
                    label: "Enterprise 플랜 구매",
                  },
                ] as const
              ).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2.5">
                  <Toggle
                    checked={settings?.[key] ?? true}
                    onChange={(v) => handleTogglePlan(key, v)}
                    disabled={settingsSaving || !settings}
                  />
                  <span className="text-sm text-foreground">{label}</span>
                  <span
                    className={`text-xs ${settings?.[key] ? "text-emerald-400" : "text-zinc-500"}`}
                  >
                    {settings?.[key] ? "활성" : "비활성"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 탭: 유저 관리 / 생성 이력 / 자소서 등록 이력 */}
        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users" className="text-xs">
              유저 관리 ({users.length})
            </TabsTrigger>
            <TabsTrigger value="generations" className="text-xs">
              생성 이력 ({generations.length})
            </TabsTrigger>
            <TabsTrigger value="resumes" className="text-xs">
              자소서 등록 이력 ({resumes.length})
            </TabsTrigger>
          </TabsList>

          {/* 유저 테이블 */}
          <TabsContent value="users">
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          이메일
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          이름
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          플랜
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          역할
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          추가 재생성
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          가입일
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr
                          key={u.user_id}
                          className="border-b border-border/50 hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate">
                            {u.email}
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground">
                            {u.name || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <PlanSelect
                              current={u.plan}
                              onChange={(plan) =>
                                handleChangePlan(u.user_id, plan)
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            {u.role === "admin" ? (
                              <Badge className="text-[10px] bg-violet-900 text-violet-200 border-violet-700">
                                admin
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                user
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <InlineNumber
                              value={u.extra_regenerations}
                              onSave={(v) => handleSetExtraRegen(u.user_id, v)}
                            />
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {u.created_at
                              ? new Date(u.created_at).toLocaleDateString(
                                  "ko-KR",
                                )
                              : "-"}
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && !fetching && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-xs text-muted-foreground"
                          >
                            유저 없음
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 생성 이력 테이블 */}
          <TabsContent value="generations">
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          #
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          회사
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          직무
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          종류
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          자소서 미리보기
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          생성일
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {generations.map((g) => (
                        <tr
                          key={g.id}
                          className="border-b border-border/50 hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {g.id}
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground">
                            {(g.job_analysis as { company?: string })
                              ?.company || "-"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {(g.job_analysis as { position?: string })
                              ?.position || "-"}
                          </td>
                          <td className="px-4 py-3">
                            {g.is_regeneration ? (
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300">
                                재생성
                              </span>
                            ) : (
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-sky-900/50 text-sky-300">
                                신규
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-[260px] truncate">
                            {g.answer || "-"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {g.created_at
                              ? new Date(g.created_at).toLocaleDateString(
                                  "ko-KR",
                                )
                              : "-"}
                          </td>
                        </tr>
                      ))}
                      {generations.length === 0 && !fetching && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-xs text-muted-foreground"
                          >
                            생성 이력 없음
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 자소서 등록 이력 테이블 */}
          <TabsContent value="resumes">
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          #
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          유저 ID
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          이력서 이름
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          등록일
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumes.map((rv) => (
                        <tr
                          key={rv.id}
                          className="border-b border-border/50 hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {rv.id}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                            {rv.user_id}
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground">
                            {rv.name || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {rv.created_at
                              ? new Date(rv.created_at).toLocaleDateString(
                                  "ko-KR",
                                )
                              : "-"}
                          </td>
                        </tr>
                      ))}
                      {resumes.length === 0 && !fetching && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-xs text-muted-foreground"
                          >
                            등록된 이력서 없음
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
