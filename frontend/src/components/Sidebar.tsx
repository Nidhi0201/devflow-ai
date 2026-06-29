"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitBranch, LayoutDashboard, LogOut, Package } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/repositories", label: "Repositories", icon: Package },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isDemo } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-surface-border bg-surface-raised">
      <div className="flex items-center gap-2.5 border-b border-surface-border px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500">
          <GitBranch className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">DevFlow AI</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              pathname.startsWith(href)
                ? "bg-brand-500/15 text-brand-300 shadow-inner"
                : "text-slate-400 hover:bg-surface-card hover:text-slate-200"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {user && (
        <div className="border-t border-surface-border p-4">
          {isDemo && (
            <div className="mb-3 rounded-lg bg-accent-500/10 px-3 py-2 text-xs text-accent-400">
              Demo mode — sign in with GitHub for real repos
            </div>
          )}
          <div className="mb-3 flex items-center gap-3 px-1">
            {user.avatar_url && (
              <img src={user.avatar_url} alt="" className="h-9 w-9 rounded-full ring-2 ring-brand-500/30" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.username}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <button onClick={logout} className="btn-secondary w-full text-xs">
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
