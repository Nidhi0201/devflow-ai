export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 animate-ping rounded-full bg-water-300/40" />
        <div className="relative h-10 w-10 animate-spin rounded-full border-2 border-water-200 border-t-water-500" />
      </div>
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}
