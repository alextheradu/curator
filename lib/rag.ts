import { embedText } from "./embeddings";
import { searchChunksForSeason, searchGeneralChunks } from "./qdrant";
import type { Citation } from "./db/schema";
import { parseSeasonYearsFromText } from "./seasons";
import { buildDocumentViewHref } from "./utils";

export interface RagContext {
  contextBlock: string;
  citations: Citation[];
  selectedSeasonYear: number | null;
  hitCount: number;
  bestScore: number;
}

interface RagStatusOptions {
  onStatus?: (message: string) => void;
}

function selectQuoteSnippet(content: string, query: string, maxLength = 220) {
  const normalizedContent = content.replace(/\s+/g, " ").trim();
  if (!normalizedContent) {
    return "";
  }

  const segments = normalizedContent
    .split(/(?<=[.?!])\s+|\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const queryTerms = [...new Set(
    query
      .toLowerCase()
      .match(/[a-z0-9]{3,}/g)
      ?.filter((term) => !["with", "from", "that", "this", "what", "when", "where", "which"].includes(term))
      ?? []
  )];

  const bestSegment = (segments.length > 0 ? segments : [normalizedContent]).reduce((best, segment) => {
    const lowerSegment = segment.toLowerCase();
    const score = queryTerms.reduce((sum, term) => sum + (lowerSegment.includes(term) ? 1 : 0), 0);
    const bestScore = queryTerms.reduce((sum, term) => sum + (best.toLowerCase().includes(term) ? 1 : 0), 0);

    if (score > bestScore) {
      return segment;
    }

    if (score === bestScore && segment.length < best.length) {
      return segment;
    }

    return best;
  }, segments[0] ?? normalizedContent);

  if (bestSegment.length <= maxLength) {
    return bestSegment;
  }

  return `${bestSegment.slice(0, maxLength - 1).trimEnd()}…`;
}

function pickDominantSeason(
  results: Array<{ score: number; payload: { season_year?: number | null; doc_scope: "season" | "general" } }>,
  preferredSeasonYear?: number,
) {
  const weights = new Map<number, number>();

  for (const result of results) {
    if (result.payload.doc_scope !== "season" || typeof result.payload.season_year !== "number") {
      continue;
    }

    const seasonYear = result.payload.season_year;
    weights.set(seasonYear, (weights.get(seasonYear) ?? 0) + result.score);
  }

  if (weights.size === 0) {
    return preferredSeasonYear ?? null;
  }

  if (preferredSeasonYear && weights.has(preferredSeasonYear)) {
    const preferredWeight = weights.get(preferredSeasonYear) ?? 0;
    const strongestWeight = Math.max(...weights.values());
    if (preferredWeight >= strongestWeight * 0.9) {
      return preferredSeasonYear;
    }
  }

  return [...weights.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

async function searchChunksForScope(queryEmbedding: number[], seasonYear?: number | null) {
  if (!seasonYear) {
    return searchChunksForSeason(queryEmbedding, 5);
  }

  const [seasonResults, generalResults] = await Promise.all([
    searchChunksForSeason(queryEmbedding, 5, seasonYear),
    searchGeneralChunks(queryEmbedding, 5),
  ]);

  return [...seasonResults, ...generalResults]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export async function buildRagContext(
  query: string,
  preferredSeasonYear?: number,
  options?: RagStatusOptions,
): Promise<RagContext> {
  const onStatus = options?.onStatus;
  let queryEmbedding: number[];
  try {
    onStatus?.("Embedding your question for document search...");
    queryEmbedding = await embedText(query);
  } catch {
    return {
      contextBlock: "",
      citations: [],
      selectedSeasonYear: preferredSeasonYear ?? null,
      hitCount: 0,
      bestScore: 0,
    };
  }

  const explicitSeasonYears = parseSeasonYearsFromText(query);
  const explicitSeasonYear = explicitSeasonYears[0] ?? null;
  let selectedSeasonYear: number | null = explicitSeasonYear ?? preferredSeasonYear ?? null;
  let results: Awaited<ReturnType<typeof searchChunksForSeason>> = [];

  try {
    if (explicitSeasonYear) {
      onStatus?.(`Checking ${explicitSeasonYear} season documents and evergreen references...`);
      results = await searchChunksForScope(queryEmbedding, selectedSeasonYear);
    } else if (preferredSeasonYear) {
      // Keep the conversation pinned to its selected season unless the user names a different one.
      onStatus?.(`Checking ${preferredSeasonYear} season documents and evergreen references...`);
      results = await searchChunksForScope(queryEmbedding, preferredSeasonYear);
    } else {
      onStatus?.("Checking indexed documents across seasons...");
      const broadResults = await searchChunksForSeason(queryEmbedding, 18);
      selectedSeasonYear = pickDominantSeason(broadResults, preferredSeasonYear);
      if (selectedSeasonYear) {
        onStatus?.(`Narrowing document search to ${selectedSeasonYear} season sources...`);
      }
      results = await searchChunksForScope(queryEmbedding, selectedSeasonYear);
    }
  } catch {
    return {
      contextBlock: "",
      citations: [],
      selectedSeasonYear: selectedSeasonYear ?? preferredSeasonYear ?? null,
      hitCount: 0,
      bestScore: 0,
    };
  }
  if (results.length === 0) {
    return {
      contextBlock: "",
      citations: [],
      selectedSeasonYear: selectedSeasonYear ?? preferredSeasonYear ?? null,
      hitCount: 0,
      bestScore: 0,
    };
  }

  onStatus?.("Selecting the most relevant document pages...");

  const citations: Citation[] = [];
  const sourceBlocks: string[] = [];
  const uniqueResults = new Map<string, (typeof results)[number]>();

  for (const result of results) {
    const pageKey = `${result.payload.minio_key}:${result.payload.page_number}`;
    if (!uniqueResults.has(pageKey)) {
      uniqueResults.set(pageKey, result);
    }
  }

  const filteredResults = [...uniqueResults.values()].slice(0, 4);

  for (let i = 0; i < filteredResults.length; i++) {
    const { payload } = filteredResults[i];
    const quote = selectQuoteSnippet(payload.content, query);

    citations.push({
      type: "doc",
      label: payload.doc_name,
      documentName: payload.doc_name,
      pageNumber: payload.page_number,
      minioKey: payload.minio_key,
      url: buildDocumentViewHref(payload.minio_key, payload.page_number),
      quote,
    });

    sourceBlocks.push(
      `[SOURCE ${i + 1}]
Document: ${payload.doc_name}
Exact page: ${payload.page_number}
Quoted excerpt candidate: "${quote}"
Full extracted page text:
${payload.content}`
    );
  }

  return {
    contextBlock: `\n\nRelevant documentation:\n${sourceBlocks.join("\n\n")}`,
    citations,
    selectedSeasonYear,
    hitCount: filteredResults.length,
    bestScore: filteredResults[0]?.score ?? 0,
  };
}
