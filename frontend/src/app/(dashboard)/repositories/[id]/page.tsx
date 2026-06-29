"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitPullRequest, RefreshCw } from "lucide-react";
import { api, PullRequest, Repository } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function RepositoryDetailPage({ params }: { params: { id: string } }) {
  const repoId = parseInt(params.id);
  const { isDemo } = useAuth();
  const [repo, setRepo] = useState<Repository | null>(null);
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const repos = await api.getRepositories();
      const found = repos.find((r) => r.id === repoId);
      setRepo(found || null);
      const pullRequests = await api.getPullRequests(repoId);
      setPrs(pullRequests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [repoId]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await api.syncPullRequests(repoId);
      setSyncMsg(`Synced ${result.synced} new PRs (${result.total} total on GitHub)`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error && !repo) return <ErrorMessage message={error} onRetry={load} />;

  if (!repo) {
    return <p className="text-slate-400">Repository not found.</p>;
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link href="/repositories" className="mb-2 inline-block text-sm text-slate-500 hover:text-brand-300">
            ← Repositories
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{repo.full_name}</h1>
          {repo.description && <p className="text-slate-400">{repo.description}</p>}
        </div>
        {!isDemo && (
          <button onClick={handleSync} disabled={syncing} className="btn-secondary">
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Sync PRs
          </button>
        )}
      </div>

      {syncMsg && (
        <div className="card mb-4 border-brand-500/20 bg-brand-500/5 text-sm text-brand-300">{syncMsg}</div>
      )}
      {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

      <div className="card">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <GitPullRequest className="h-5 w-5 text-brand-400" />
          Pull Requests
        </h2>
        {prs.length === 0 ? (
          <p className="py-8 text-center text-slate-500">
            {isDemo ? "No pull requests in this demo repo." : 'No pull requests found. Click "Sync PRs" to fetch from GitHub.'}
          </p>
        ) : (
          <div className="space-y-2">
            {prs.map((pr) => (
              <Link
                key={pr.id}
                href={`/pull-requests/${pr.id}`}
                className="flex items-center justify-between rounded-xl border border-surface-border px-4 py-3 transition hover:border-brand-500/30 hover:bg-brand-500/5"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-slate-500">#{pr.number}</span>
                  <span className="font-medium">{pr.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={pr.state === "open" ? "badge-open" : "badge-closed"}>{pr.state}</span>
                  {pr.has_review && (
                    <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-medium text-brand-400">
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
