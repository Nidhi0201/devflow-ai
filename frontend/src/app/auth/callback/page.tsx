"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { LogoWordmark } from "@/components/Logo";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Your session expired. Please try again.",
  no_token: "We couldn't complete sign-in. Please try again.",
  github_failed: "We couldn't connect to GitHub. Please try again.",
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
      setError("Sign-in could not be completed.");
    }
  }, [searchParams, setToken, router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        <LogoWordmark />
        <div className="w-full max-w-md">
          <ErrorMessage message={error} onRetry={() => router.push("/")} />
        </div>
        <Link href="/" className="text-sm font-medium text-water-600 hover:text-water-700">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <LogoWordmark />
      <LoadingSpinner label="Signing you in..." />
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
