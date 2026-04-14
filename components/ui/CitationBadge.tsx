import { ExternalLink, FileText, Globe } from "lucide-react";
import type { Citation } from "@/lib/db/schema";

interface Props { citation: Citation; index: number; }

export function CitationBadge({ citation, index }: Props) {
  const isWeb = citation.type === "web";
  const color = isWeb ? "#0066B3" : "#ED1C24";

  return (
    <a
      href={citation.url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:bg-white/5"
      style={{ borderColor: `${color}40`, color }}
      title={citation.label}
    >
      {isWeb ? <Globe size={10} /> : <FileText size={10} />}
      <span className="font-medium">[{index}]</span>
      <span className="max-w-[140px] truncate">{citation.label}</span>
      {citation.url && <ExternalLink size={9} className="shrink-0 opacity-60" />}
    </a>
  );
}
