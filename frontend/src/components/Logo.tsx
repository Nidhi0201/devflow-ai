export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className={`${dim} relative flex items-center justify-center`}>
      <div className="absolute inset-0 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] bg-gradient-to-br from-water-400 to-water-600 opacity-90 shadow-droplet" />
      <svg className={`${icon} relative text-white`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C12 2 6 10.5 6 15a6 6 0 1012 0C18 10.5 12 2 12 2z" />
      </svg>
    </div>
  );
}

export function LogoWordmark({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={size} />
      <span className={`font-display font-semibold tracking-tight text-slate-800 ${size === "sm" ? "text-base" : "text-lg"}`}>
        DevFlow
      </span>
    </div>
  );
}
