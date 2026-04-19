const SparklesIcon = ({ size = 13 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

export function StreamingIndicator({ label }: { label?: string }) {
  return (
    <div className="group/message w-full" data-role="assistant">
      <div className="flex items-start gap-3">
        {/* Same icon as assistant messages */}
        <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
          <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
            <SparklesIcon size={13} />
          </div>
        </div>

        {/* Typing bubble */}
        <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border/50 bg-card px-4 py-3 text-[13px] text-muted-foreground shadow-[var(--shadow-card)]">
          {label ? (
            <>
              <span className="block size-2 rounded-full bg-muted-foreground/50 animate-pulse" />
              <span>{label}</span>
            </>
          ) : (
            <>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block size-2 rounded-full bg-muted-foreground/50"
                  style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.18}s infinite` }}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
