"use client";

import { useEffect } from "react";
import { Shield, Sparkles, Waves } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LogoWordmark } from "@/components/Logo";
import { LoadingSpinner } from "@/components/LoadingSpinner";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.395-.135-.345-.72-1.395-1.23-1.665-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LandingContent() {
  const { user, loading, login } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      window.location.href = "/dashboard";
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="droplet-bg -left-32 top-20 h-96 w-96 bg-water-300/30" />
      <div className="droplet-bg -right-24 top-40 h-80 w-80 bg-cyan-200/40" />
      <div className="droplet-bg bottom-0 left-1/3 h-72 w-72 bg-water-200/35" />

      <header className="relative z-10 border-b border-white/40 bg-white/30 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <LogoWordmark />
          <button onClick={login} className="btn-water">
            <GitHubIcon className="h-4 w-4" />
            Sign in with GitHub
          </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-32 pt-24 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-water-200/60 bg-white/60 px-4 py-1.5 text-sm font-medium text-water-700 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" />
          Intelligent code reviews
        </div>

        <h1 className="font-display mx-auto mb-6 max-w-3xl text-5xl font-semibold leading-[1.1] tracking-tight text-slate-800 md:text-6xl">
          Code reviews that flow
          <span className="block bg-gradient-to-r from-water-500 to-cyan-500 bg-clip-text text-transparent">
            with your workflow
          </span>
        </h1>

        <p className="mx-auto mb-12 max-w-xl text-lg leading-relaxed text-slate-500">
          Connect GitHub and get thoughtful AI feedback on every pull request — clear, fast, and beautifully simple.
        </p>

        <button onClick={login} className="btn-water px-8 py-3.5 text-base">
          <GitHubIcon className="h-5 w-5" />
          Sign in with GitHub
        </button>
      </section>

      <section className="relative z-10 mx-auto grid max-w-5xl gap-5 px-6 pb-24 md:grid-cols-3">
        {[
          {
            icon: Waves,
            title: "Every PR, reviewed",
            desc: "New pull requests are analyzed automatically so nothing slips through.",
          },
          {
            icon: Shield,
            title: "Security insights",
            desc: "Understand risk at a glance with a clear score and plain-language notes.",
          },
          {
            icon: Sparkles,
            title: "Actionable suggestions",
            desc: "Improvements tailored to your code — not generic boilerplate.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="glass-soft p-6 text-left transition hover:shadow-float">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-water-100 text-water-600">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mb-2 font-semibold text-slate-800">{title}</h3>
            <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
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
