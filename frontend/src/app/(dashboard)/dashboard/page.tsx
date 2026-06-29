"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitPullRequest, Package, Shield, Sparkles } from "lucide-react";
import { api, DashboardStats, Repository } from "@/lib/api";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="stat-card">
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-slate-400">{label}</span>
          <div className={`rounded-lg p-2 ${accent}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([api.getDashboardStats(), api.getRepositories()])
      .then(([s, r]) => {
        setStats(s);
        setRepos(r);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingSpinner label="Loading dashboard..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-slate-400">Overview of your code review activity</p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Repositories" value={stats?.total_repositories ?? 0} icon={Package} accent="bg-brand-500/15 text-brand-400" />
        <StatCard label="Open PRs" value={stats?.open_pull_requests ?? 0} icon={GitPullRequest} accent="bg-amber-500/15 text-amber-400" />
        <StatCard label="Reviews Done" value={stats?.reviews_completed ?? 0} icon={Sparkles} accent="bg-accent-500/15 text-accent-400" />
        <StatCard
          label="Avg Security Score"
          value={stats?.avg_security_score != null ? `${stats.avg_security_score}/10` : "—"}
          icon={Shield}
          accent="bg-emerald-500/15 text-emerald-400"
        />
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Repositories</h2>
          <Link href="/repositories" className="text-sm text-brand-400 hover:text-brand-300">
            Manage repos →
          </Link>
        </div>
        {repos.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            <Package className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p>No repositories imported yet.</p>
            <Link href="/repositories" className="mt-2 inline-block text-brand-400 hover:underline">
              Import your first repo
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {repos.map((repo) => (
              <Link
                key={repo.id}
                href={`/repositories/${repo.id}`}
                className="flex items-center justify-between rounded-xl border border-surface-border px-4 py-3 transition hover:border-brand-500/30 hover:bg-brand-500/5"
              >
                <div>
                  <p className="font-medium">{repo.full_name}</p>
                  {repo.description && (
                    <p className="text-sm text-slate-500">{repo.description}</p>
                  )}
                </div>
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                  {repo.open_pr_count} open PR{repo.open_pr_count !== 1 ? "s" : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
