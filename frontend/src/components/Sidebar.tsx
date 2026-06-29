"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Package } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { LogoWordmark } from "@/components/Logo";

const nav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/repositories", label: "Repositories", icon: Package },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-white/50 bg-white/40 backdrop-blur-xl">
      <div className="border-b border-white/50 px-6 py-5">
        <LogoWordmark size="sm" />
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
              pathname.startsWith(href)
                ? "bg-water-500/10 text-water-700"
                : "text-slate-500 hover:bg-white/60 hover:text-slate-700"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {user && (
        <div className="border-t border-white/50 p-4">
          <div className="mb-3 flex items-center gap-3 px-1">
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt=""
                className="h-9 w-9 rounded-full ring-2 ring-water-200"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-700">{user.username}</p>
              {user.email && (
                <p className="truncate text-xs text-slate-400">{user.email}</p>
              )}
            </div>
          </div>
          <button onClick={logout} className="btn-ghost w-full text-xs">
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
