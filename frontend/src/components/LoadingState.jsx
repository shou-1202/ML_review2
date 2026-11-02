/**
 * Shared loading / error state for any view waiting on the backend.
 * Errors are rendered from the friendly message produced by services/api.js —
 * never a raw Axios/network error object.
 */
export default function LoadingState({ variant = "loading", message, onRetry, title, tone = "light" }) {
  const dark = tone === "dark";

  if (variant === "error") {
    return (
      <div
        role="alert"
        className={`relative overflow-hidden border-l-[3px] border-coral px-6 py-10 sm:px-10 ${
          dark ? "bg-white/[0.06] text-white" : "bg-surface shadow-panel"
        }`}
      >
        <p className={`meta ${dark ? "text-coral" : "text-coral-ink"}`}>Backend unavailable</p>
        <h2 className={`mt-3 font-serif text-display-sm font-medium ${dark ? "text-white" : "text-ink"}`}>
          {title || "The results could not be loaded"}
        </h2>
        <p className={`mt-3 max-w-xl text-[15px] leading-relaxed ${dark ? "text-white/70" : "text-muted"}`}>{message}</p>
        <p className={`mt-2 max-w-xl text-[13px] ${dark ? "text-white/50" : "text-faint"}`}>
          Start it with <span className="font-mono">uvicorn main:app --reload</span> in the backend folder, then try again.
        </p>
        {onRetry && (
          <button onClick={onRetry} className="btn btn-coral mt-7">
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-24 text-center" role="status">
      <div className={`relative h-px w-56 overflow-hidden ${dark ? "bg-white/15" : "bg-silver"}`}>
        <span className="absolute inset-y-0 left-0 w-1/3 animate-scan bg-coral" />
      </div>
      <p className={`font-mono text-[12.5px] ${dark ? "text-white/70" : "text-muted"}`}>{message || "Loading results…"}</p>
    </div>
  );
}
