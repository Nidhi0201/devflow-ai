"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Plus, Trash2, Webhook } from "lucide-react";
import { api, Repository } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface AvailableRepo {
  github_id: number;
  name: string;
  full_name: string;
  description: string | null;
  imported: boolean;
}

export default function RepositoriesPage() {
  const { isDemo } = useAuth();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [available, setAvailable] = useState<AvailableRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const imported = await api.getRepositories();
      setRepos(imported);
      if (!isDemo) {
        const avail = await api.getAvailableRepos();
        setAvailable(avail.filter((r) => !r.imported));
      } else {
        setAvailable([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load repositories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [isDemo]);

  const handleImport = async (full_name: string) => {
    setImporting(full_name);
    setActionError(null);
    try {
      await api.importRepo(full_name);
      await load();
      setShowImport(false);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this repository from DevFlow AI?")) return;
    setActionError(null);
    try {
      await api.deleteRepo(id);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (loading) return <LoadingSpinner label="Loading repositories..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Repositories</h1>
          <p className="text-slate-400">Manage imported GitHub repositories</p>
        </div>
        {!isDemo && (
          <button onClick={() => setShowImport(!showImport)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Import Repository
          </button>
        )}
      </div>

      {isDemo && (
        <div className="card mb-6 border-accent-500/20 bg-accent-500/5">
          <p className="text-sm text-accent-300">
            You&apos;re in demo mode with sample data. Sign in with GitHub to import and review your real repositories.
          </p>
        </div>
      )}

      {actionError && (
        <div className="mb-4">
          <ErrorMessage message={actionError} />
        </div>
      )}

      {showImport && (
        <div className="card mb-6">
          <h2 className="mb-4 text-lg font-semibold">Available Repositories</h2>
          {available.length === 0 ? (
            <p className="text-slate-500">All your GitHub repos are already imported.</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {available.map((repo) => (
                <div
                  key={repo.github_id}
                  className="flex items-center justify-between rounded-xl border border-surface-border px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{repo.full_name}</p>
                    {repo.description && (
                      <p className="text-sm text-slate-500">{repo.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleImport(repo.full_name)}
                    disabled={importing === repo.full_name}
                    className="btn-primary text-xs"
                  >
                    {importing === repo.full_name ? "Importing..." : "Import"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {repos.length === 0 ? (
        <div className="card py-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <p className="mb-4 text-slate-400">No repositories imported yet.</p>
          {!isDemo && (
            <button onClick={() => setShowImport(true)} className="btn-primary">
              <Plus className="h-4 w-4" />
              Import your first repo
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {repos.map((repo) => (
            <div key={repo.id} className="card flex items-center justify-between">
              <Link href={`/repositories/${repo.id}`} className="flex-1">
                <p className="font-medium hover:text-brand-300">{repo.full_name}</p>
                {repo.description && (
                  <p className="text-sm text-slate-500">{repo.description}</p>
                )}
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span>{repo.open_pr_count} open PR{repo.open_pr_count !== 1 ? "s" : ""}</span>
                  {repo.webhook_active && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Webhook className="h-3 w-3" /> Webhook active
                    </span>
                  )}
                </div>
              </Link>
              {!isDemo && (
                <button
                  onClick={() => handleDelete(repo.id)}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
