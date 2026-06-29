export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}
