"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitPullRequest, RefreshCw } from "lucide-react";
import { api, PullRequest, Repository } from "@/lib/api";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function RepositoryDetailPage({ params }: { params: { id: string } }) {
  const repoId = parseInt(params.id);
  const [repo, setRepo] = useState<Repository | null>(null);
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const repos = await api.getRepositories();
      const found = repos.find((r) => r.id === repoId);
      setRepo(found || null);
      const pullRequests = await api.getPullRequests(repoId);
      setPrs(pullRequests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [repoId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const result = await api.syncPullRequests(repoId);
      setRefreshMsg(
        result.synced > 0
          ? `Found ${result.synced} new pull request${result.synced !== 1 ? "s" : ""}`
          : "Everything is up to date"
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error && !repo) return <ErrorMessage message={error} onRetry={load} />;

  if (!repo) {
    return <p className="text-slate-500">Repository not found.</p>;
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link href="/repositories" className="mb-2 inline-block text-sm text-slate-400 hover:text-water-600">
            ← Repositories
          </Link>
          <h1 className="page-title">{repo.full_name}</h1>
          {repo.description && <p className="page-sub">{repo.description}</p>}
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-ghost">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {refreshMsg && (
        <div className="glass-soft mb-4 px-4 py-3 text-sm text-water-700">{refreshMsg}</div>
      )}
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="glass-soft p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
          <GitPullRequest className="h-5 w-5 text-water-500" />
          Pull requests
        </h2>
        {prs.length === 0 ? (
          <p className="py-8 text-center text-slate-500">
            No pull requests yet. Try refreshing to fetch the latest from GitHub.
          </p>
        ) : (
          <div className="space-y-2">
            {prs.map((pr) => (
              <Link
                key={pr.id}
                href={`/pull-requests/${pr.id}`}
                className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/50 px-4 py-3 transition hover:border-water-200 hover:bg-white/80"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">#{pr.number}</span>
                  <span className="font-medium text-slate-700">{pr.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={pr.state === "open" ? "badge-live" : "badge-muted"}>
                    {pr.state}
                  </span>
                  {pr.has_review && (
                    <span className="rounded-full bg-water-100 px-2.5 py-0.5 text-xs font-medium text-water-700">
                      Reviewed
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
