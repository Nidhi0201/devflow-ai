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
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="glass-soft p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-water-100 text-water-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="font-display text-3xl font-semibold tracking-tight text-slate-800">{value}</p>
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

  if (loading) return <LoadingSpinner label="Loading..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Home</h1>
        <p className="page-sub">Your review activity at a glance</p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Repositories" value={stats?.total_repositories ?? 0} icon={Package} />
        <StatCard label="Open pull requests" value={stats?.open_pull_requests ?? 0} icon={GitPullRequest} />
        <StatCard label="Reviews completed" value={stats?.reviews_completed ?? 0} icon={Sparkles} />
        <StatCard
          label="Security"
          value={stats?.avg_security_score != null ? `${stats.avg_security_score}/10` : "—"}
          icon={Shield}
        />
      </div>

      <div className="glass-soft p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Repositories</h2>
          <Link href="/repositories" className="text-sm font-medium text-water-600 hover:text-water-700">
            View all
          </Link>
        </div>
        {repos.length === 0 ? (
          <div className="py-10 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-water-300" />
            <p className="text-slate-500">No repositories yet</p>
            <Link href="/repositories" className="mt-2 inline-block text-sm font-medium text-water-600 hover:text-water-700">
              Add your first repository
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {repos.map((repo) => (
              <Link
                key={repo.id}
                href={`/repositories/${repo.id}`}
                className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/50 px-4 py-3 transition hover:border-water-200 hover:bg-white/80"
              >
                <div>
                  <p className="font-medium text-slate-700">{repo.full_name}</p>
                  {repo.description && (
                    <p className="text-sm text-slate-500">{repo.description}</p>
                  )}
                </div>
                <span className="badge-muted">
                  {repo.open_pr_count} open
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
