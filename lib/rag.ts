import { embedText } from "./embeddings";
import { searchChunksForSeason, searchGeneralChunks } from "./qdrant";
import type { Citation } from "./db/schema";
import { parseSeasonYearsFromText } from "./seasons";

export interface RagContext {
  contextBlock: string;
  citations: Citation[];
  selectedSeasonYear: number | null;
  hitCount: number;
  bestScore: number;
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

export async function buildRagContext(query: string, preferredSeasonYear?: number): Promise<RagContext> {
  let queryEmbedding: number[];
  try {
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
  let selectedSeasonYear: number | null = explicitSeasonYears[0] ?? null;
  let results: Awaited<ReturnType<typeof searchChunksForSeason>> = [];

  try {
    if (selectedSeasonYear) {
      results = await searchChunksForScope(queryEmbedding, selectedSeasonYear);
    } else {
      const broadResults = await searchChunksForSeason(queryEmbedding, 18);
      selectedSeasonYear = pickDominantSeason(broadResults, preferredSeasonYear);
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

  const citations: Citation[] = [];
  const sourceBlocks: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const { payload } = results[i];
    citations.push({
      type: "doc",
      label: `${payload.doc_name}, p.${payload.page_number}`,
      pageNumber: payload.page_number,
      minioKey: payload.minio_key,
    });

    sourceBlocks.push(
      `[SOURCE ${i + 1}] ${payload.doc_name} (page ${payload.page_number}):\n${payload.content}`
    );
  }

  return {
    contextBlock: `\n\nRelevant documentation:\n${sourceBlocks.join("\n\n")}`,
    citations,
    selectedSeasonYear,
    hitCount: results.length,
    bestScore: results[0]?.score ?? 0,
  };
}
