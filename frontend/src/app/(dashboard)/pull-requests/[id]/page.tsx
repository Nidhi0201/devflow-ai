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
    score >= 8
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : score >= 5
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-red-700 bg-red-50 border-red-200";

  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${color}`}>
      <Shield className="h-7 w-7" />
      <div>
        <p className="text-xs font-medium opacity-80">Security</p>
        <p className="font-display text-3xl font-semibold">
          {score}
          <span className="text-lg opacity-60">/10</span>
        </p>
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  items,
  icon: Icon,
  color,
  bg,
}: {
  title: string;
  items: string[];
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="glass-soft p-6">
      <h3 className={`mb-4 flex items-center gap-2 font-semibold ${color}`}>
        <Icon className="h-5 w-5" />
        {title}
      </h3>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className={`flex gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 ${bg}`}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const statusLabel: Record<string, string> = {
  completed: "Complete",
  failed: "Failed",
  pending: "In progress",
  processing: "In progress",
};

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
      setError(e instanceof Error ? e.message : "Something went wrong");
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
      setError(e instanceof Error ? e.message : "Review could not be started");
      setReviewing(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading..." />;
  if (error && !pr) return <ErrorMessage message={error} onRetry={load} />;

  if (!pr) {
    return <p className="text-slate-500">Pull request not found.</p>;
  }

  return (
    <div>
      <div className="mb-8">
        {pr.repository && (
          <Link
            href={`/repositories/${pr.repository.id}`}
            className="mb-2 inline-block text-sm text-slate-400 hover:text-water-600"
          >
            ← {pr.repository.full_name}
          </Link>
        )}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="text-sm text-slate-400">#{pr.number}</span>
              <span className={pr.state === "open" ? "badge-live" : "badge-muted"}>{pr.state}</span>
            </div>
            <h1 className="page-title">{pr.title}</h1>
            {pr.author && <p className="mt-1 text-sm text-slate-500">by {pr.author}</p>}
          </div>
          <button
            onClick={handleReview}
            disabled={reviewing || review?.status === "pending" || review?.status === "processing"}
            className="btn-water shrink-0"
          >
            {reviewing || review?.status === "pending" || review?.status === "processing" ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Reviewing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {review ? "Review again" : "Start review"}
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {!review ? (
        <div className="glass-soft py-16 text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-water-300" />
          <p className="text-slate-500">No review yet. Start one to see insights for this pull request.</p>
        </div>
      ) : review.status === "pending" || review.status === "processing" ? (
        <div className="glass-soft py-16 text-center">
          <RefreshCw className="mx-auto mb-4 h-12 w-12 animate-spin text-water-500" />
          <p className="text-slate-700">Reviewing your changes…</p>
          <p className="mt-1 text-sm text-slate-400">Usually takes about 10–30 seconds</p>
        </div>
      ) : review.status === "failed" ? (
        <div className="glass-soft border-red-200 py-8 text-center text-red-600">
          Something went wrong: {review.summary}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start gap-4">
            <ScoreBadge score={review.security_score} />
            {review.summary && (
              <div className="glass-soft min-w-0 flex-1 p-6">
                <h3 className="mb-2 font-semibold text-slate-800">Summary</h3>
                <p className="text-sm leading-relaxed text-slate-600">{review.summary}</p>
              </div>
            )}
          </div>

          <ReviewSection
            title="Security"
            items={review.security_issues}
            icon={AlertTriangle}
            color="text-red-600"
            bg="bg-red-50/60"
          />
          <ReviewSection
            title="Potential bugs"
            items={review.bug_explanations}
            icon={Bug}
            color="text-amber-700"
            bg="bg-amber-50/60"
          />
          <ReviewSection
            title="Suggestions"
            items={review.suggestions}
            icon={Lightbulb}
            color="text-water-700"
            bg="bg-water-50/60"
          />
        </div>
      )}

      {history.length > 1 && (
        <div className="glass-soft mt-8 p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-700">
            <Clock className="h-4 w-4" />
            Past reviews
          </h3>
          <div className="space-y-2">
            {history.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl bg-white/50 px-4 py-2.5 text-sm"
              >
                <span className="text-slate-500">{new Date(r.created_at).toLocaleString()}</span>
                <span
                  className={
                    r.status === "completed"
                      ? "text-emerald-600"
                      : r.status === "failed"
                        ? "text-red-500"
                        : "text-amber-600"
                  }
                >
                  {statusLabel[r.status] ?? r.status}
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
