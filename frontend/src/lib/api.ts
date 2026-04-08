import { supabase } from "@/lib/supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
};

export const api = {
  analyzeJob: (text: string) =>
    fetch(`${API_BASE}/api/analyze-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).then((r) => r.json()),

  generate: async (data: {
    question: string;
    job_posting: string;
    job_analysis?: Record<string, unknown>;
    company_research?: CompanyInfo | null;
    resume_id?: number;
    resume_text?: string;
    char_limit?: number;
    feedback?: string;
    previous_answer?: string;
  }) => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: r.statusText }));
      throw new Error(err.detail || `생성 실패 (${r.status})`);
    }
    return r.json();
  },

  evaluate: (data: {
    question: string;
    answer: string;
    job_analysis: Record<string, unknown>;
    resume_structured?: Record<string, unknown> | null;
    company_size?: string | null;
  }) =>
    fetch(`${API_BASE}/api/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  getResume: async (id: number) => {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE}/api/resumes/${id}`, { headers }).then((r) =>
      r.json(),
    );
  },

  listResumes: async () => {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE}/api/resumes`, { headers }).then((r) => r.json());
  },

  addResume: async (source: string, name?: string) => {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE}/api/resumes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ source, name }),
    }).then((r) => r.json());
  },

  updateResume: async (
    id: number,
    fields: { name?: string; structured_data?: Record<string, unknown> },
  ) => {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE}/api/resumes/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(fields),
    }).then((r) => r.json());
  },

  deleteResume: async (id: number) => {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE}/api/resumes/${id}`, {
      method: "DELETE",
      headers,
    }).then((r) => r.json());
  },

  uploadResume: async (file: File, name?: string) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name || "");
    return fetch(`${API_BASE}/api/resumes/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then((r) => r.json());
  },

  parseImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/api/parse-image`, {
      method: "POST",
      body: formData,
    }).then((r) => r.json());
  },

  listGenerations: () =>
    fetch(`${API_BASE}/api/generations`).then((r) => r.json()),

  getGeneration: (id: number) =>
    fetch(`${API_BASE}/api/generations/${id}`).then((r) => r.json()),

  saveGeneration: (data: {
    job_posting: string;
    job_analysis: Record<string, unknown>;
    question: string;
    mode: string;
    resume_id?: number;
    answer: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    evaluation?: any;
    char_limit?: number;
  }) =>
    fetch(`${API_BASE}/api/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  // ── 프로젝트 CRUD ──

  createProject: async (job_posting: string): Promise<Project> => {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers,
      body: JSON.stringify({ job_posting }),
    }).then((r) => r.json());
  },

  researchCompany: async (projectId: number): Promise<Project> => {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE}/api/projects/${projectId}/research`, {
      method: "POST",
      headers,
    }).then((r) => r.json());
  },

  listActivity: async (): Promise<ActivityEvent[]> => {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE}/api/activity`, { headers }).then((r) => r.json());
  },

  listProjects: async (): Promise<Project[]> => {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE}/api/projects`, { headers }).then((r) => r.json());
  },

  getProject: async (id: number): Promise<Project> => {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE}/api/projects/${id}`, { headers }).then((r) =>
      r.json(),
    );
  },

  updateProject: async (
    id: number,
    data: Partial<Project>,
  ): Promise<Project> => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/projects/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: r.statusText }));
      throw new Error(err.detail || `프로젝트 업데이트 실패 (${r.status})`);
    }
    return r.json();
  },

  deleteProject: async (id: number): Promise<void> => {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE}/api/projects/${id}`, {
      method: "DELETE",
      headers,
    });
  },

  createVersion: async (
    projectId: number,
    data: {
      answer: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      evaluation?: any;
      question?: string;
      mode?: string;
      char_limit?: number;
      resume_id?: number;
      job_analysis?: Record<string, unknown>;
      is_regeneration?: boolean;
    },
  ): Promise<ProjectVersion> => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/projects/${projectId}/versions`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: r.statusText }));
      throw new Error(err.detail || `버전 저장 실패 (${r.status})`);
    }
    return r.json();
  },

  updateVersion: async (
    projectId: number,
    versionId: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { evaluation: any },
  ): Promise<void> => {
    const headers = await getAuthHeaders();
    const r = await fetch(
      `${API_BASE}/api/projects/${projectId}/versions/${versionId}`,
      { method: "PATCH", headers, body: JSON.stringify(data) },
    );
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: r.statusText }));
      throw new Error(err.detail || `평가 저장 실패 (${r.status})`);
    }
  },

  getPlanSettings: async (): Promise<{
    plan_free_enabled: boolean;
    plan_pro_enabled: boolean;
    plan_enterprise_enabled: boolean;
  }> => {
    const r = await fetch(`${API_BASE}/api/plan-settings`);
    if (!r.ok)
      return {
        plan_free_enabled: true,
        plan_pro_enabled: true,
        plan_enterprise_enabled: true,
      };
    return r.json();
  },

  getUsage: async (): Promise<UsageSummary> => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/usage`, { headers });
    if (!r.ok) throw new Error("사용량 조회 실패");
    return r.json();
  },

  changePlan: async (plan: "free" | "pro" | "enterprise") => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/profiles/plan`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ plan }),
    });
    if (!r.ok) throw new Error("플랜 변경 실패");
    return r.json();
  },

  billingAuth: async (data: {
    auth_key: string;
    customer_key: string;
    plan: string;
  }) => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/payments/billing-auth`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: r.statusText }));
      throw new Error(err.detail || "결제 처리 실패");
    }
    return r.json();
  },

  getSubscription: async (): Promise<{
    plan?: string;
    status?: string;
    amount?: number;
    last_billed_at?: string;
    next_billing_date?: string;
  }> => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/payments/subscription`, { headers });
    if (!r.ok) return {};
    return r.json();
  },

  redeemCoupon: async (
    code: string,
  ): Promise<{ bonus_generations: number; bonus_regenerations: number }> => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/coupons/redeem`, {
      method: "POST",
      headers,
      body: JSON.stringify({ code }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: r.statusText }));
      throw new Error(err.detail || "쿠폰 사용 실패");
    }
    return r.json();
  },

  cancelSubscription: async () => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/payments/subscription`, {
      method: "DELETE",
      headers,
    });
    if (!r.ok) throw new Error("구독 취소 실패");
    return r.json();
  },

  getProfile: async () => {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE}/api/profiles/me`, { headers }).then((r) =>
      r.json(),
    );
  },

  saveProfile: async (data: {
    name: string;
    phone?: string;
    birth_date?: string;
    job_title?: string;
    job_seeker_status?: string;
    years_of_experience?: number;
    education_level?: string;
    education_major?: string;
    agreed_to_terms: boolean;
    avatar_url?: string;
    bio?: string;
  }) => {
    const headers = await getAuthHeaders();
    return fetch(`${API_BASE}/api/profiles`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    }).then((r) => r.json());
  },

  deleteAccount: async () => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/account`, {
      method: "DELETE",
      headers,
    });
    if (!r.ok) throw new Error("계정 삭제 실패");
    return r.json();
  },

  evaluateStream: async (
    data: {
      question: string;
      answer: string;
      job_analysis: Record<string, unknown>;
      resume_structured?: Record<string, unknown> | null;
      company_size?: string | null;
    },
    onEvaluator: (event: EvaluatorEvent) => void,
  ): Promise<EvalSummary> => {
    const res = await fetch(`${API_BASE}/api/evaluate/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let summary: EvalSummary | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const cleaned = line.replace(/^data: /, "").trim();
        if (!cleaned) continue;
        const parsed = JSON.parse(cleaned);
        if (parsed.type === "summary") {
          summary = parsed;
        } else {
          onEvaluator(parsed);
        }
      }
    }

    return summary!;
  },
};

// ── 프로젝트 타입 ──

export interface ActivityEvent {
  type: "project" | "resume" | "regeneration";
  id: number;
  label: string;
  sub: string | null;
  created_at: string;
}

export interface ProjectVersion {
  id: number;
  answer: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluation: any | null;
  created_at: string;
  question: string;
  mode: string;
  char_limit: number | null;
  resume_id: number | null;
  job_analysis: Project["job_analysis"];
}

export interface CompanyInfo {
  id: number;
  name: string;
  mission: string | null;
  vision: string | null;
  products_services: string | null;
  employee_count: number | null;
  revenue_billion: number | null;
  company_size: string | null;
}

export interface Project {
  id: number;
  project_id: number | null;
  job_posting: string;
  job_analysis: {
    company: string;
    position: string;
    required_skills: string[];
    preferred_skills: string[];
    responsibilities: string[];
    keywords: string[];
    culture_keywords: string[];
    experience_level: string;
  };
  company_id: number | null;
  companies: CompanyInfo | null; // Supabase FK 조인 결과
  question: string;
  mode: string;
  char_limit: number | null;
  resume_id: number | null;
  answer: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluation: any | null;
  created_at: string;
  versions?: ProjectVersion[];
}

export type ProjectStatus = "draft" | "ready" | "generated" | "evaluated";

export const getProjectStatus = (p: Project): ProjectStatus => {
  if (p.evaluation) return "evaluated";
  if (p.answer) return "generated";
  if (p.resume_id) return "ready";
  return "draft";
};

export interface EvaluatorEvent {
  type: "evaluator";
  index: number;
  total: number;
  group: string;
  background: string;
  result: {
    scores: Record<string, { score: number; comment: string }>;
    pass_probability: number;
    feedback: string;
  } | null;
  error: string | null;
}

export interface EvalSummary {
  type: "summary";
  groups: Record<string, unknown>;
  overall_pass_probability: number;
  all_feedback: string[];
  aggregated_feedback: string;
}

export interface UsageSummary {
  plan: "free" | "pro" | "enterprise";
  limits: {
    resumes: number;
    generations: number;
    regenerations: number;
    company_searches: number;
  };
  usage: { resumes: number; generations: number; regenerations: number };
  extra_company_searches: number;
}

// ── Admin Types ──

export interface AdminUser {
  user_id: string;
  email: string;
  name: string;
  plan: "free" | "pro" | "enterprise";
  role: "user" | "admin";
  extra_regenerations: number;
  extra_company_searches: number;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  today_generations: number;
  total_generations: number;
  plan_distribution: { free: number; pro: number; enterprise: number };
}

export interface AdminSettings {
  plan_free_enabled: boolean;
  plan_pro_enabled: boolean;
  plan_enterprise_enabled: boolean;
}

export interface AdminGeneration {
  id: number;
  user_id: string;
  job_analysis: Record<string, unknown>;
  answer: string;
  is_regeneration: boolean;
  created_at: string;
}

export interface AdminResume {
  id: number;
  user_id: string;
  name: string;
  created_at: string;
}

export interface AdminCoupon {
  code: string;
  created_at: string;
  expires_at: string;
  bonus_generations: number;
  bonus_regenerations: number;
  bonus_company_searches: number;
  used_by: string | null;
  used_at: string | null;
}

export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/admin/stats`, { headers });
    if (!r.ok) throw new Error("통계 조회 실패");
    return r.json();
  },

  listUsers: async (): Promise<AdminUser[]> => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/admin/users`, { headers });
    if (!r.ok) throw new Error("유저 목록 조회 실패");
    return r.json();
  },

  listGenerations: async (): Promise<AdminGeneration[]> => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/admin/generations`, { headers });
    if (!r.ok) throw new Error("생성 이력 조회 실패");
    return r.json();
  },

  listResumes: async (): Promise<AdminResume[]> => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/admin/resumes`, { headers });
    if (!r.ok) throw new Error("이력서 이력 조회 실패");
    return r.json();
  },

  getSettings: async (): Promise<AdminSettings> => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/admin/settings`, { headers });
    if (!r.ok) throw new Error("설정 조회 실패");
    return r.json();
  },

  updateSettings: async (settings: Partial<AdminSettings>): Promise<void> => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/admin/settings`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(settings),
    });
    if (!r.ok) throw new Error("설정 업데이트 실패");
  },

  changeUserPlan: async (
    userId: string,
    plan: "free" | "pro" | "enterprise",
  ): Promise<void> => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/admin/users/${userId}/plan`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ plan }),
    });
    if (!r.ok) throw new Error("플랜 변경 실패");
  },

  setExtraRegenerations: async (
    userId: string,
    extra_regenerations: number,
  ): Promise<void> => {
    const headers = await getAuthHeaders();
    const r = await fetch(
      `${API_BASE}/api/admin/users/${userId}/extra-regenerations`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ extra_regenerations }),
      },
    );
    if (!r.ok) throw new Error("추가 재생성 횟수 설정 실패");
  },

  setExtraCompanySearches: async (
    userId: string,
    extra_company_searches: number,
  ): Promise<void> => {
    const headers = await getAuthHeaders();
    const r = await fetch(
      `${API_BASE}/api/admin/users/${userId}/extra-company-searches`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ extra_company_searches }),
      },
    );
    if (!r.ok) throw new Error("추가 회사 검색 크레딧 설정 실패");
  },

  listCoupons: async (): Promise<AdminCoupon[]> => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/admin/coupons`, { headers });
    if (!r.ok) throw new Error("쿠폰 목록 조회 실패");
    return r.json();
  },

  createCoupon: async (
    code: string,
    bonusGenerations: number,
    bonusRegenerations: number,
    bonusCompanySearches: number,
  ): Promise<AdminCoupon> => {
    const headers = await getAuthHeaders();
    const r = await fetch(`${API_BASE}/api/admin/coupons`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        code,
        bonus_generations: bonusGenerations,
        bonus_regenerations: bonusRegenerations,
        bonus_company_searches: bonusCompanySearches,
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: r.statusText }));
      throw new Error(err.detail || "쿠폰 생성 실패");
    }
    return r.json();
  },
};
