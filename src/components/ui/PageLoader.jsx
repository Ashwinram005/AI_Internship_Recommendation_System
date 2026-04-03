import { Loader2 } from "lucide-react";

/**
 * Accessible loading surface with spinner. Matches app tokens (--color-primary).
 *
 * @param {'fullscreen' | 'embedded' | 'minimal'} variant — fullscreen: app shell; embedded: section/card; minimal: inline row
 * @param {string} label — Primary line
 * @param {string} [sublabel] — Secondary line (embedded/fullscreen)
 * @param {string} [className] — On outer wrapper
 */
export default function PageLoader({
  variant = "fullscreen",
  label = "Loading",
  sublabel,
  className = "",
}) {
  if (variant === "minimal") {
    return (
      <span
        className={`inline-flex items-center gap-2 text-slate-600 text-sm font-medium ${className}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2
          className="h-4 w-4 shrink-0 animate-spin text-[var(--color-primary)]"
          strokeWidth={2.5}
          aria-hidden
        />
        {label}
      </span>
    );
  }

  const inner = (
    <>
      <div className="rounded-2xl bg-[var(--color-primary-soft)] p-4 ring-1 ring-[var(--color-primary)]/10 shadow-[0_2px_12px_rgba(0,62,199,0.08)]">
        <Loader2
          className="h-9 w-9 text-[var(--color-primary)] animate-spin"
          strokeWidth={2}
          aria-hidden
        />
      </div>
      <div className="text-center space-y-1.5 max-w-sm mx-auto">
        <p className="text-sm font-semibold text-slate-800 tracking-tight">{label}</p>
        {sublabel ? (
          <p className="text-xs text-slate-500 leading-relaxed">{sublabel}</p>
        ) : null}
      </div>
    </>
  );

  if (variant === "fullscreen") {
    return (
      <div
        className={`min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50 px-6 ${className}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-7">{inner}</div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-7 py-16 px-6 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {inner}
    </div>
  );
}
