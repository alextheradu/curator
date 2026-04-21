import { ExternalLink, FileText, Globe } from "lucide-react";
import { buildDocumentViewHref, cn } from "@/lib/utils";
import type { Citation } from "@/lib/db/schema";

interface Props {
  citation: Citation;
  index: number;
  onOpen?: (citation: Citation) => void;
}

export function CitationBadge({ citation, index, onOpen }: Props) {
  const isWeb = citation.type === "web";
  const color = isWeb ? "#0066B3" : "#0066B3";
  const documentHref = !isWeb && citation.minioKey
    ? citation.url ?? buildDocumentViewHref(citation.minioKey, citation.pageNumber)
    : citation.url;

  const content = (
    <>
      {isWeb ? <Globe size={10} /> : <FileText size={10} />}
      <span className="font-medium">[{index}]</span>
      <span className="truncate">{citation.documentName ?? citation.label}</span>
      {citation.pageNumber ? (
        <span className="shrink-0 rounded-full bg-muted/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          p. {citation.pageNumber}
        </span>
      ) : null}
    </>
  );

  const className = cn(
    "inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:bg-white/5"
  );

  if (!isWeb) {
    return (
      <div
        className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-2xl border px-2 py-1.5"
        style={{ borderColor: `${color}40`, color }}
      >
        {onOpen ? (
          <button
            type="button"
            onClick={() => onOpen(citation)}
            className={className}
            title={citation.label}
          >
            {content}
          </button>
        ) : (
          <div className={className} title={citation.label}>
            {content}
          </div>
        )}

        {documentHref ? (
          <a
            href={documentHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-current/15 px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-white/5"
            title={`Open ${citation.documentName ?? citation.label} PDF`}
          >
            <ExternalLink size={10} className="shrink-0 opacity-70" />
            PDF
          </a>
        ) : null}

        {citation.quote ? (
          <p className="w-full px-1 text-[11px] leading-5 text-muted-foreground">
            <span aria-hidden="true">&ldquo;</span>
            {citation.quote}
            <span aria-hidden="true">&rdquo;</span>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <a
      href={citation.url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={{ borderColor: `${color}40`, color }}
      title={citation.label}
    >
      {content}
    </a>
  );
}
