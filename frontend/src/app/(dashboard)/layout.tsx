"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative flex h-screen">
      <div className="droplet-bg -right-20 top-0 h-64 w-64 bg-water-200/30" />
      <div className="droplet-bg bottom-10 left-1/4 h-48 w-48 bg-cyan-200/25" />
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
