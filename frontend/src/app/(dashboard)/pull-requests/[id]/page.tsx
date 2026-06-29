"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bug,
  Clock,
  Lightbulb,
  RefreshCw,
  Shield,
  Sparkles,
} from "lucide-react";
import { api, Review } from "@/lib/api";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const color =
    score >= 8 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
    score >= 5 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
    "text-red-400 bg-red-500/10 border-red-500/20";

  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${color}`}>
      <Shield className="h-7 w-7" />
      <div>
        <p className="text-xs font-medium opacity-80">Security Score</p>
        <p className="text-3xl font-bold">{score}<span className="text-lg opacity-60">/10</span></p>
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  items,
  icon: Icon,
  color,
}: {
  title: string;
  items: string[];
  icon: React.ElementType;
  color: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="card">
      <h3 className={`mb-4 flex items-center gap-2 font-semibold ${color}`}>
        <Icon className="h-5 w-5" />
        {title}
      </h3>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 rounded-lg bg-surface-raised/50 px-3 py-2 text-sm text-slate-300">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PullRequestPage({ params }: { params: { id: string } }) {
  const prId = parseInt(params.id);
  const [pr, setPr] = useState<Awaited<ReturnType<typeof api.getPullRequest>> | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [history, setHistory] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [data, reviews] = await Promise.all([
        api.getPullRequest(prId),
        api.getReviews(prId),
      ]);
      setPr(data);
      setReview(data.latest_review);
      setHistory(reviews);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load PR");
    } finally {
      setLoading(false);
    }
  }, [prId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!review || review.status === "completed" || review.status === "failed") return;
    const interval = setInterval(async () => {
      try {
        const data = await api.getPullRequest(prId);
        setReview(data.latest_review);
        if (data.latest_review?.status === "completed" || data.latest_review?.status === "failed") {
          clearInterval(interval);
          setReviewing(false);
          const reviews = await api.getReviews(prId);
          setHistory(reviews);
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [review, prId]);

  const handleReview = async () => {
    setReviewing(true);
    setError(null);
    try {
      const newReview = await api.triggerReview(prId);
      setReview(newReview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
      setReviewing(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading pull request..." />;
  if (error && !pr) return <ErrorMessage message={error} onRetry={load} />;

  if (!pr) {
    return <p className="text-slate-400">Pull request not found.</p>;
  }

  return (
    <div>
      <div className="mb-8">
        {pr.repository && (
          <Link
            href={`/repositories/${pr.repository.id}`}
            className="mb-2 inline-block text-sm text-slate-500 hover:text-brand-300"
          >
            ← {pr.repository.full_name}
          </Link>
        )}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="font-mono text-sm text-slate-500">#{pr.number}</span>
              <span className={pr.state === "open" ? "badge-open" : "badge-closed"}>{pr.state}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{pr.title}</h1>
            {pr.author && <p className="mt-1 text-sm text-slate-500">by {pr.author}</p>}
          </div>
          <button
            onClick={handleReview}
            disabled={reviewing || review?.status === "pending" || review?.status === "processing"}
            className="btn-primary shrink-0"
          >
            {reviewing || review?.status === "pending" || review?.status === "processing" ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {review ? "Re-run AI Review" : "Run AI Review"}
              </>
            )}
          </button>
        </div>
      </div>

      {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

      {!review ? (
        <div className="card py-12 text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <p className="text-slate-400">No AI review yet. Click &quot;Run AI Review&quot; to analyze this PR.</p>
        </div>
      ) : review.status === "pending" || review.status === "processing" ? (
        <div className="card py-12 text-center">
          <RefreshCw className="mx-auto mb-4 h-12 w-12 animate-spin text-brand-400" />
          <p className="text-slate-300">AI is analyzing the code changes...</p>
          <p className="mt-1 text-sm text-slate-500">This usually takes 10–30 seconds</p>
        </div>
      ) : review.status === "failed" ? (
        <div className="card border-red-500/30 py-8 text-center text-red-400">
          Review failed: {review.summary}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start gap-4">
            <ScoreBadge score={review.security_score} />
            {review.summary && (
              <div className="card min-w-0 flex-1">
                <h3 className="mb-2 font-semibold">Summary</h3>
                <p className="text-sm leading-relaxed text-slate-300">{review.summary}</p>
              </div>
            )}
          </div>

          <ReviewSection title="Security Issues" items={review.security_issues} icon={AlertTriangle} color="text-red-400" />
          <ReviewSection title="Bug Explanations" items={review.bug_explanations} icon={Bug} color="text-amber-400" />
          <ReviewSection title="Suggestions" items={review.suggestions} icon={Lightbulb} color="text-brand-400" />
        </div>
      )}

      {history.length > 1 && (
        <div className="card mt-8">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-300">
            <Clock className="h-4 w-4" />
            Review History
          </h3>
          <div className="space-y-2">
            {history.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-surface-raised/50 px-4 py-2 text-sm">
                <span className="text-slate-400">
                  {new Date(r.created_at).toLocaleString()}
                </span>
                <span className={
                  r.status === "completed" ? "text-emerald-400" :
                  r.status === "failed" ? "text-red-400" : "text-amber-400"
                }>
                  {r.status}
                  {r.security_score != null && ` · ${r.security_score}/10`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
