"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, GitBranch, Shield, Sparkles, Zap } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

function LandingContent() {
  const { user, loading, login, demoLogin, githubEnabled } = useAuth();
  const [backendUp, setBackendUp] = useState<boolean | null>(null);

  useEffect(() => {
    api.checkHealth().then(setBackendUp);
  }, []);

  if (!loading && user) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div className="min-h-screen">
      {backendUp === false && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-3 text-center text-sm text-amber-200">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          Backend not running. Run <code className="rounded bg-black/30 px-2 py-0.5">npm run dev</code> from the project folder.
        </div>
      )}

      <header className="border-b border-surface-border/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500">
              <GitBranch className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">DevFlow AI</span>
          </div>
          <div className="flex items-center gap-3">
            {!githubEnabled && (
              <Link href="/admin/setup" className="hidden text-xs text-slate-500 hover:text-slate-300 sm:block">
                Owner setup
              </Link>
            )}
            {githubEnabled && (
              <button onClick={login} className="btn-secondary">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.395-.135-.345-.72-1.395-1.23-1.665-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Sign in with GitHub
              </button>
            )}
            <button onClick={demoLogin} className={githubEnabled ? "btn-primary" : "btn-secondary"}>
              {githubEnabled ? "Try Demo" : "Get Started"}
            </button>
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 py-28 text-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-radial" />
        <div className="relative">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm font-medium text-brand-300">
            <Sparkles className="h-4 w-4" />
            AI-Powered Code Reviews
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
            Ship better code with
            <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-accent-400 bg-clip-text text-transparent">
              {" "}AI reviews
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-400">
            Connect your GitHub account and get instant AI-powered code reviews on every pull request.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            {githubEnabled ? (
              <>
                <button onClick={login} className="btn-primary px-8 py-3.5 text-base">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.395-.135-.345-.72-1.395-1.23-1.665-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  Sign in with GitHub
                </button>
                <button onClick={demoLogin} className="btn-secondary px-8 py-3.5 text-base">
                  Try Demo
                </button>
              </>
            ) : (
              <>
                <button onClick={demoLogin} className="btn-primary px-8 py-3.5 text-base">
                  Get Started — Try Demo
                </button>
                <Link href="/admin/setup" className="btn-secondary px-8 py-3.5 text-base">
                  Enable GitHub sign-in (owner, one-time)
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 md:grid-cols-3">
        {[
          { icon: Zap, title: "Instant PR Analysis", desc: "Automatically detect new pull requests and generate contextual code reviews in seconds.", accent: "text-brand-400" },
          { icon: Shield, title: "Security Scoring", desc: "Get a security score for every PR with detailed vulnerability explanations.", accent: "text-emerald-400" },
          { icon: Sparkles, title: "Smart Suggestions", desc: "AI suggests simplifications, caching strategies, and best practices tailored to your code.", accent: "text-accent-400" },
        ].map(({ icon: Icon, title, desc, accent }) => (
          <div key={title} className="card text-left transition hover:border-brand-500/20">
            <Icon className={`mb-4 h-8 w-8 ${accent}`} />
            <h3 className="mb-2 text-lg font-semibold">{title}</h3>
            <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <LandingContent />
    </AuthProvider>
  );
}
