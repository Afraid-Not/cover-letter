import { supabase } from "@/lib/supabase";

const API_BASE = "http://localhost:8000";

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

  generate: (data: {
    question: string;
    job_posting: string;
    resume_id?: number;
    resume_text?: string;
    char_limit?: number;
    feedback?: string;
  }) =>
    fetch(`${API_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  evaluate: (data: {
    question: string;
    answer: string;
    job_analysis: Record<string, unknown>;
  }) =>
    fetch(`${API_BASE}/api/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  listResumes: () => fetch(`${API_BASE}/api/resumes`).then((r) => r.json()),

  addResume: (source: string, name?: string) =>
    fetch(`${API_BASE}/api/resumes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, name }),
    }).then((r) => r.json()),

  uploadResume: (file: File, name?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name || "");
    return fetch(`${API_BASE}/api/resumes/upload`, {
      method: "POST",
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

  evaluateStream: async (
    data: {
      question: string;
      answer: string;
      job_analysis: Record<string, unknown>;
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
