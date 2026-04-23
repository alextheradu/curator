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
  const badgeStyle = { borderColor: `${color}40`, color };

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
      <div className="inline-flex max-w-full flex-wrap items-center gap-1.5 align-top">
        {onOpen ? (
          <button
            type="button"
            onClick={() => onOpen(citation)}
            className={className}
            title={citation.label}
            style={badgeStyle}
          >
            {content}
          </button>
        ) : (
          <div className={className} title={citation.label} style={badgeStyle}>
            {content}
          </div>
        )}

        {documentHref ? (
          <a
            href={documentHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-white/5"
            title={`Open ${citation.documentName ?? citation.label} PDF`}
            style={badgeStyle}
          >
            <ExternalLink size={10} className="shrink-0 opacity-70" />
            PDF
          </a>
        ) : null}

        {citation.quote ? (
          <p className="basis-full max-w-[min(18rem,70vw)] px-1 text-[11px] leading-5 text-muted-foreground line-clamp-2 sm:max-w-[24rem]">
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
      style={badgeStyle}
      title={citation.label}
    >
      {content}
    </a>
  );
}
