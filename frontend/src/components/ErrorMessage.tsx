import { AlertCircle } from "lucide-react";

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex items-start gap-3 border-red-500/30 bg-red-500/5">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
      <div className="flex-1">
        <p className="text-sm text-red-300">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-2 text-sm font-medium text-brand-400 hover:text-brand-300">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
