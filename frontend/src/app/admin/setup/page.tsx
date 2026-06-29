"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, ExternalLink, GitBranch, Copy, Check, RefreshCw } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const CALLBACK = `${API}/api/auth/github/callback`;

export default function AdminSetupPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/admin/setup/status`)
      .then((r) => r.json())
      .then((d) => setConfigured(d.oauth_configured))
      .catch(() => setConfigured(false));
  }, []);

  const copyCallback = () => {
    navigator.clipboard.writeText(CALLBACK);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/admin/setup/oauth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github_client_id: clientId,
          github_client_secret: clientSecret,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Setup failed");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSaving(false);
    }
  };

  if (configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <div className="card max-w-md text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
          <h1 className="mb-2 text-xl font-bold">GitHub sign-in is ready</h1>
          <p className="mb-6 text-sm text-slate-400">
            All users can now click &quot;Sign in with GitHub&quot; — no setup needed on their end.
          </p>
          <Link href="/" className="btn-primary">Go to app</Link>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <div className="card max-w-md text-center">
          <RefreshCw className="mx-auto mb-4 h-12 w-12 text-brand-400" />
          <h1 className="mb-2 text-xl font-bold">Almost done — restart the server</h1>
          <p className="mb-4 text-sm text-slate-400">
            OAuth credentials saved. Restart once, then every user can sign in with GitHub.
          </p>
          <pre className="mb-6 rounded-lg bg-surface-raised p-3 text-left text-xs text-slate-300">npm run dev</pre>
          <p className="text-xs text-slate-500">After restart, delete this page bookmark — users never need it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-border px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500">
            <GitBranch className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold">DevFlow AI — Owner Setup</span>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">One-time setup</h1>
          <p className="mt-2 text-slate-400">
            You do this once as the app owner. After that, <strong className="text-slate-200">every user</strong> signs in with one GitHub click — like any SaaS app.
          </p>
        </div>

        <div className="card mb-6 space-y-4 text-sm">
          <div>
            <p className="mb-2 font-medium">1. Create a GitHub OAuth App</p>
            <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex text-xs">
              Open GitHub Developer Settings <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div>
            <p className="mb-2 font-medium">2. Set callback URL to:</p>
            <div className="flex items-center gap-2 rounded-lg bg-surface-raised px-3 py-2 font-mono text-xs text-brand-300">
              <span className="flex-1 break-all">{CALLBACK}</span>
              <button onClick={copyCallback} type="button">
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="card space-y-4">
          <p className="font-medium">3. Paste your credentials</p>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Client ID</label>
            <input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Client Secret</label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Saving..." : "Save & enable GitHub sign-in for all users"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          <Link href="/" className="text-brand-400 hover:underline">Back to app</Link>
        </p>
      </div>
    </div>
  );
}
