"use client";

import { ExternalLink, FileText, Globe } from "lucide-react";
import { buildDocumentViewHref, cn } from "@/lib/utils";
import type { Citation } from "@/lib/db/schema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  citation: Citation;
  index: number;
  onOpen?: (citation: Citation) => void;
}

const chipClass = cn(
  "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full",
  "border border-[#0066B3]/25 bg-[#0066B3]/8 px-1.5",
  "text-[10px] font-semibold text-[#0066B3] leading-none",
  "transition-colors hover:bg-[#0066B3]/15 cursor-pointer select-none"
);

function safeHttpHref(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

function safeDocumentHref(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value, "https://curator.local");
    if (url.origin !== "https://curator.local" || url.pathname !== "/api/documents/view") return undefined;
    return `${url.pathname}${url.search}`;
  } catch {
    return undefined;
  }
}

export function CitationBadge({ citation, index, onOpen }: Props) {
  const isWeb = citation.type === "web";
  const documentHref = !isWeb && citation.minioKey
    ? buildDocumentViewHref(citation.minioKey, citation.pageNumber)
    : safeDocumentHref(citation.url);
  const webHref = isWeb ? safeHttpHref(citation.url) : undefined;

  const tooltipLabel = (
    <span className="flex items-center gap-1.5">
      {isWeb
        ? <Globe size={10} className="shrink-0 opacity-70" />
        : <FileText size={10} className="shrink-0 opacity-70" />}
      <span>{citation.documentName ?? citation.label}</span>
      {citation.pageNumber
        ? <span className="opacity-60">· p.{citation.pageNumber}</span>
        : null}
      {(isWeb || documentHref)
        ? <ExternalLink size={9} className="shrink-0 opacity-50" />
        : null}
    </span>
  );

  return (
    <TooltipProvider delay={250}>
    <Tooltip>
      <TooltipTrigger
        render={
          isWeb
            ? <a href={webHref} target="_blank" rel="noopener noreferrer" />
            : onOpen
              ? <button type="button" onClick={() => onOpen(citation)} />
              : documentHref
                ? <a href={documentHref} target="_blank" rel="noopener noreferrer" />
                : <span />
        }
        className={chipClass}
      >
        {index}
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {tooltipLabel}
      </TooltipContent>
    </Tooltip>
    </TooltipProvider>
  );
}
