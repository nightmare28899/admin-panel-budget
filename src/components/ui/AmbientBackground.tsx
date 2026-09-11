type AmbientBackgroundProps = {
  /** "auth" adds a faint centered gold glow behind the login card. */
  variant?: "shell" | "auth";
};

// Two large, heavily blurred color blobs drifting very slowly. Replaces the
// single static top-anchored radial-gradient that used to be pasted into
// every page — that one didn't reach the viewport center on tall screens
// (looked disconnected on the login card) and never moved, which read as
// flat/lifeless across the whole app.
export function AmbientBackground({ variant = "shell" }: AmbientBackgroundProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute -left-[10%] -top-[25%] h-[70%] w-[70%] animate-ambient-drift rounded-full bg-[radial-gradient(circle,var(--emerald-dim),transparent_70%)] blur-3xl motion-reduce:animate-none" />
      <div className="absolute -bottom-[20%] -right-[10%] h-[65%] w-[65%] animate-ambient-drift rounded-full bg-[radial-gradient(circle,var(--info-dim),transparent_70%)] opacity-80 blur-3xl [animation-delay:-12s] motion-reduce:animate-none" />
      {variant === "auth" && (
        <div className="absolute left-1/2 top-1/2 h-[55%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--gold-dim),transparent_72%)] opacity-30 blur-3xl" />
      )}
    </div>
  );
}
