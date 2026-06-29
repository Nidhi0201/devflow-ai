"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ErrorMessage } from "@/components/ErrorMessage";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Sign-in session expired. Please try again.",
  no_token: "GitHub did not return an access token. Please try again.",
  github_failed: "Could not connect to GitHub. Please try again.",
};

function CallbackHandler() {
  const searchParams = useSearchParams();
  const { setToken } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      setError(ERROR_MESSAGES[err] || "Sign-in failed. Please try again.");
      return;
    }

    const token = searchParams.get("token");
    if (token) {
      setToken(token)
        .then(() => router.push("/dashboard"))
        .catch(() => setError("Sign-in failed. Please try again."));
    } else {
      setError("No authentication token received.");
    }
  }, [searchParams, setToken, router]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-6">
        <div className="w-full max-w-md">
          <ErrorMessage message={error} onRetry={() => router.push("/")} />
        </div>
        <Link href="/" className="text-sm text-brand-400 hover:underline">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        <p className="text-slate-400">Signing you in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <AuthProvider>
      <Suspense>
        <CallbackHandler />
      </Suspense>
    </AuthProvider>
  );
}
