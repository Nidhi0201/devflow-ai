"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Plus, Trash2 } from "lucide-react";
import { api, Repository } from "@/lib/api";
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
  const [repos, setRepos] = useState<Repository[]>([]);
  const [available, setAvailable] = useState<AvailableRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const imported = await api.getRepositories();
      setRepos(imported);
      const avail = await api.getAvailableRepos();
      setAvailable(avail.filter((r) => !r.imported));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (full_name: string) => {
    setAdding(full_name);
    setActionError(null);
    try {
      await api.importRepo(full_name);
      await load();
      setShowAdd(false);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not add repository");
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm("Remove this repository?")) return;
    setActionError(null);
    try {
      await api.deleteRepo(id);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not remove repository");
    }
  };

  if (loading) return <LoadingSpinner label="Loading..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">Repositories</h1>
          <p className="page-sub">Projects connected to DevFlow</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-water">
          <Plus className="h-4 w-4" />
          Add repository
        </button>
      </div>

      {actionError && (
        <div className="mb-4">
          <ErrorMessage message={actionError} />
        </div>
      )}

      {showAdd && (
        <div className="glass-soft mb-6 p-6">
          <h2 className="mb-4 font-semibold text-slate-800">Choose a repository</h2>
          {available.length === 0 ? (
            <p className="text-slate-500">All of your GitHub repositories are already connected.</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {available.map((repo) => (
                <div
                  key={repo.github_id}
                  className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/50 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-700">{repo.full_name}</p>
                    {repo.description && (
                      <p className="text-sm text-slate-500">{repo.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAdd(repo.full_name)}
                    disabled={adding === repo.full_name}
                    className="btn-water text-xs"
                  >
                    {adding === repo.full_name ? "Adding..." : "Add"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {repos.length === 0 ? (
        <div className="glass-soft py-16 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-water-300" />
          <p className="mb-4 text-slate-500">No repositories connected yet</p>
          <button onClick={() => setShowAdd(true)} className="btn-water">
            <Plus className="h-4 w-4" />
            Add your first repository
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {repos.map((repo) => (
            <div key={repo.id} className="glass-soft flex items-center justify-between p-5">
              <Link href={`/repositories/${repo.id}`} className="flex-1">
                <p className="font-medium text-slate-700 hover:text-water-700">{repo.full_name}</p>
                {repo.description && (
                  <p className="text-sm text-slate-500">{repo.description}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {repo.open_pr_count} open pull request{repo.open_pr_count !== 1 ? "s" : ""}
                </p>
              </Link>
              <button
                onClick={() => handleRemove(repo.id)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                aria-label="Remove repository"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
