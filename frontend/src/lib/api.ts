const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  id: number;
  github_id: number;
  username: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Repository {
  id: number;
  github_id: number;
  name: string;
  full_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  open_pr_count: number;
  webhook_active: boolean;
}

export interface PullRequest {
  id: number;
  github_id: number;
  number: number;
  title: string;
  state: string;
  author: string | null;
  repository_id: number;
  created_at: string;
  has_review: boolean;
}

export interface Review {
  id: number;
  pull_request_id: number;
  status: string;
  summary: string | null;
  security_score: number | null;
  suggestions: string[];
  security_issues: string[];
  bug_explanations: string[];
  created_at: string;
}

export interface DashboardStats {
  total_repositories: number;
  open_pull_requests: number;
  reviews_completed: number;
  avg_security_score: number | null;
}

function parseErrorDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === "object" && d && "msg" in d ? String(d.msg) : String(d))).join(", ");
  }
  return "Request failed";
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("devflow_token", token);
      else localStorage.removeItem("devflow_token");
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("devflow_token");
    }
    return this.token;
  }

  isDemoUser(): boolean {
    const u = this.getToken();
    return !!u;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    } catch {
      throw new Error("Cannot reach backend. Run npm run dev from the project root.");
    }

    if (res.status === 401) {
      this.setToken(null);
      if (typeof window !== "undefined") window.location.href = "/";
      throw new Error("Session expired. Please sign in again.");
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(parseErrorDetail(err.detail));
    }
    return res.json();
  }

  getMe() {
    return this.request<User>("/api/auth/me");
  }

  getDashboardStats() {
    return this.request<DashboardStats>("/api/dashboard/stats");
  }

  getRepositories() {
    return this.request<Repository[]>("/api/repositories");
  }

  getAvailableRepos() {
    return this.request<
      Array<{
        github_id: number;
        name: string;
        full_name: string;
        description: string | null;
        imported: boolean;
      }>
    >("/api/repositories/available");
  }

  importRepo(full_name: string) {
    return this.request<Repository>("/api/repositories/import", {
      method: "POST",
      body: JSON.stringify({ full_name }),
    });
  }

  deleteRepo(id: number) {
    return this.request<{ ok: boolean }>(`/api/repositories/${id}`, { method: "DELETE" });
  }

  getPullRequests(repoId: number) {
    return this.request<PullRequest[]>(`/api/repositories/${repoId}/pull-requests`);
  }

  syncPullRequests(repoId: number) {
    return this.request<{ synced: number; total: number }>(
      `/api/repositories/${repoId}/sync`,
      { method: "POST" }
    );
  }

  getPullRequest(prId: number) {
    return this.request<{
      id: number;
      number: number;
      title: string;
      state: string;
      author: string | null;
      repository: { id: number; full_name: string } | null;
      latest_review: Review | null;
    }>(`/api/pull-requests/${prId}`);
  }

  triggerReview(prId: number) {
    return this.request<Review>(`/api/pull-requests/${prId}/review`, { method: "POST" });
  }

  getReviews(prId: number) {
    return this.request<Review[]>(`/api/pull-requests/${prId}/reviews`);
  }

  getGithubLoginUrl() {
    return `${API_URL}/api/auth/github`;
  }

  getGithubStatus() {
    return this.request<{ configured: boolean; callback_url: string }>("/api/auth/github/status");
  }

  getDemoLoginUrl() {
    return `${API_URL}/api/auth/demo`;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const api = new ApiClient();
