export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const friendly = message.includes("backend") || message.includes("npm run")
    ? "We're having trouble connecting. Please try again in a moment."
    : message;

  return (
    <div className="glass-soft flex items-start gap-3 p-5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
        !
      </div>
      <div className="flex-1">
        <p className="text-sm text-slate-600">{friendly}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-2 text-sm font-medium text-water-600 hover:text-water-700">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
