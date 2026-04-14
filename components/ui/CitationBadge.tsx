import { ExternalLink, FileText, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/db/schema";

interface Props {
  citation: Citation;
  index: number;
  onOpen?: (citation: Citation) => void;
}

export function CitationBadge({ citation, index, onOpen }: Props) {
  const isWeb = citation.type === "web";
  const color = isWeb ? "#0066B3" : "#0066B3";

  const content = (
    <>
      {isWeb ? <Globe size={10} /> : <FileText size={10} />}
      <span className="font-medium">[{index}]</span>
      <span className="max-w-[160px] truncate">{citation.label}</span>
      {(isWeb || citation.url || citation.minioKey) && <ExternalLink size={9} className="shrink-0 opacity-60" />}
    </>
  );

  const className = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:bg-white/5"
  );

  if (!isWeb && onOpen) {
    return (
      <button
        type="button"
        onClick={() => onOpen(citation)}
        className={className}
        style={{ borderColor: `${color}40`, color }}
        title={citation.label}
      >
        {content}
      </button>
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
