import { embedBatch } from "./embeddings";
import { searchChunksForSeason, searchGeneralChunks } from "./qdrant";
import type { Citation } from "./db/schema";
import { parseSeasonYearsFromText } from "./seasons";
import { buildDocumentViewHref } from "./utils";

export const RAG_SEARCH_TOOL = {
  type: "function" as const,
  function: {
    name: "search_documents",
    description:
      "Search indexed FRC official documents (game manuals, team updates, inspection checklists, Q&As) for rules, definitions, and regulations. "
      + "Before calling: think about what exact terminology appears in official FRC documents — section names, rule keywords like 'bumper', 'ranking point', 'inspection criteria', 'gracious professionalism', etc. "
      + "Read the available document descriptions to pick the best query. "
      + "Call this when the user's question involves a rule, a definition, or anything that should be cited from an official source. "
      + "You may request up to 50 results in deep-search mode; use more for broad multi-rule questions, fewer for specific targeted lookups.",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query using FRC official terminology. Be specific—include rule names, section labels, or exact phrases you expect to find in the document.",
        },
        limit: {
          type: "number",
          description: "Number of document chunks to return (1-50). Increase for broad questions covering multiple rules.",
        },
        season_year: {
          type: "number",
          description: "FRC season year to search within (e.g. 2024, 2025). Omit to search the current season context.",
        },
      },
      required: ["query"],
    },
  },
};

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

type RagSearchResult = Awaited<ReturnType<typeof searchChunksForSeason>>[number];

const QUERY_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "beyond",
  "by",
  "can",
  "do",
  "does",
  "far",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "many",
  "of",
  "on",
  "or",
  "required",
  "the",
  "to",
  "what",
  "when",
  "where",
  "with",
]);

const TEAM_UPDATE_QUERY_HINT = /\b(update|rule|robot|perimeter|extend|extension|expansion|bumper|fuel|score|scoring|rp|ranking point|threshold|manual|legal|allowed|required|foul|inspection|weight|size|height)\b/i;

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandCommonQueryAcronyms(query: string) {
  return query.replace(/\brp\b/gi, "ranking point");
}

function extractExplicitTeamUpdateNumbers(query: string) {
  return [...query.matchAll(/\b(?:team\s+)?update\s*0*(\d{1,2})\b/gi)]
    .map((match) => parseInt(match[1] ?? "", 10))
    .filter((value) => Number.isInteger(value));
}

function extractSignificantTerms(text: string) {
  return normalizeSearchText(text)
    .split(" ")
    .filter((term) => term.length >= 2 && !QUERY_STOPWORDS.has(term));
}

function addAdjacentPhrases(phrases: Set<string>, terms: string[]) {
  for (let i = 0; i < terms.length - 1; i++) {
    phrases.add(`${terms[i]} ${terms[i + 1]}`);
  }

  for (let i = 0; i < terms.length - 2; i++) {
    phrases.add(`${terms[i]} ${terms[i + 1]} ${terms[i + 2]}`);
  }
}

function selectKeyPhrases(query: string) {
  const phraseCandidates: Array<{ phrase: string; score: number }> = [];
  const termSets = [
    extractSignificantTerms(query),
    extractSignificantTerms(expandCommonQueryAcronyms(query)),
  ];

  for (const terms of termSets) {
    for (let start = 0; start < terms.length - 1; start++) {
      for (let size = 2; size <= 3 && start + size <= terms.length; size++) {
        const slice = terms.slice(start, start + size);
        const phrase = slice.join(" ");
        const score = slice.reduce((total, term) => total + term.length + (term.length <= 2 ? 4 : 0), 0) - start;
        phraseCandidates.push({ phrase, score });
      }
    }
  }

  return [...new Set(
    phraseCandidates
      .sort((left, right) => right.score - left.score)
      .map((candidate) => candidate.phrase)
  )].slice(0, 2);
}

function selectBoundaryPhrases(query: string) {
  const terms = extractSignificantTerms(query);
  if (terms.length < 2) {
    return [];
  }

  const phrases = new Set<string>([
    terms.slice(0, 2).join(" "),
    terms.slice(-2).join(" "),
  ]);

  if (terms.length >= 3) {
    phrases.add(terms.slice(0, 3).join(" "));
    phrases.add(terms.slice(-3).join(" "));
  }

  return [...phrases];
}

function buildSearchVariants(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const expanded = expandCommonQueryAcronyms(trimmed).trim();
  const variants = new Set<string>([trimmed]);
  const explicitTeamUpdates = extractExplicitTeamUpdateNumbers(trimmed);
  const keyPhrases = selectKeyPhrases(trimmed);
  const boundaryPhrases = selectBoundaryPhrases(trimmed);
  const mentionsRankingPoint = /\b(rp|ranking point)\b/i.test(trimmed);

  if (expanded && normalizeSearchText(expanded) !== normalizeSearchText(trimmed)) {
    variants.add(expanded);
  }

  if (TEAM_UPDATE_QUERY_HINT.test(trimmed)) {
    variants.add(`Team Update ${trimmed}`);

    if (expanded && normalizeSearchText(expanded) !== normalizeSearchText(trimmed)) {
      variants.add(`Team Update ${expanded}`);
    }

    for (const phrase of keyPhrases) {
      variants.add(`Team Update ${phrase}`);
    }

    for (const phrase of boundaryPhrases) {
      variants.add(`Team Update ${phrase}`);
    }

    if (mentionsRankingPoint) {
      for (const phrase of [...keyPhrases, ...boundaryPhrases]) {
        variants.add(`Team Update ${phrase} threshold`);
      }
    }

    for (const updateNumber of explicitTeamUpdates) {
      variants.add(`Team Update ${updateNumber} ${expanded || trimmed}`);
      variants.add(`Team Update ${String(updateNumber).padStart(2, "0")} ${expanded || trimmed}`);
    }
  }

  return [...variants].slice(0, 4);
}

function buildQueryProfile(query: string) {
  const originalTerms = extractSignificantTerms(query);
  const expandedTerms = extractSignificantTerms(expandCommonQueryAcronyms(query));
  const significantTerms = [...new Set([...originalTerms, ...expandedTerms])];
  const phrases = new Set<string>();

  addAdjacentPhrases(phrases, originalTerms);
  addAdjacentPhrases(phrases, expandedTerms);

  return {
    terms: significantTerms,
    phrases: [...phrases],
    explicitTeamUpdates: extractExplicitTeamUpdateNumbers(query),
  };
}

function isTeamUpdateChunk(payload: RagSearchResult["payload"]) {
  const docName = normalizeSearchText(payload.doc_name);
  const contentPreview = normalizeSearchText(payload.content.slice(0, 140));

  return docName.includes("teamupdate")
    || docName.includes("team updates")
    || contentPreview.startsWith("team update ");
}

function extractTeamUpdateNumber(payload: RagSearchResult["payload"]) {
  const match = `${payload.doc_name}\n${payload.content}`.match(/\bTeam Update\s*0*(\d{1,2})\b/i);
  const updateNumber = match ? parseInt(match[1] ?? "", 10) : NaN;
  return Number.isInteger(updateNumber) ? updateNumber : null;
}

function countMatches(haystack: string, needles: string[]) {
  return needles.reduce((count, needle) => count + (haystack.includes(needle) ? 1 : 0), 0);
}

function rerankResults(results: RagSearchResult[], query: string) {
  const profile = buildQueryProfile(query);

  return [...results]
    .sort((left, right) => right.score - left.score)
    .map((result, index) => {
      const haystack = normalizeSearchText(`${result.payload.doc_name} ${result.payload.content}`);
      const previewHaystack = normalizeSearchText(`${result.payload.doc_name} ${result.payload.content.slice(0, 220)}`);
      const termMatches = countMatches(haystack, profile.terms);
      const phraseMatches = countMatches(haystack, profile.phrases);
      const previewTermMatches = countMatches(previewHaystack, profile.terms);
      const previewPhraseMatches = countMatches(previewHaystack, profile.phrases);
      const exactTeamUpdateMatch = profile.explicitTeamUpdates.some((updateNumber) => (
        haystack.includes(`team update ${updateNumber}`)
        || haystack.includes(`team update ${String(updateNumber).padStart(2, "0")}`)
      ));
      const teamUpdateChunk = isTeamUpdateChunk(result.payload);
      const teamUpdateNumber = teamUpdateChunk ? extractTeamUpdateNumber(result.payload) : null;
      const rerankedScore = result.score
        + (termMatches * 0.03)
        + (phraseMatches * 0.18)
        + (previewTermMatches * 0.04)
        + (previewPhraseMatches * 0.25)
        + (teamUpdateChunk && termMatches > 0 ? 0.08 : 0)
        + (teamUpdateChunk && phraseMatches > 0 ? 0.12 : 0)
        + (teamUpdateChunk && previewPhraseMatches > 0 ? 0.16 : 0)
        + (teamUpdateNumber && (phraseMatches > 0 || previewPhraseMatches > 0) ? teamUpdateNumber * 0.02 : 0)
        + (exactTeamUpdateMatch ? 0.75 : 0)
        - (index * 0.0001);

      return { result, rerankedScore };
    })
    .sort((left, right) => right.rerankedScore - left.rerankedScore)
    .map(({ result }) => result);
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

  const queryTerms = buildQueryProfile(query).terms;

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

async function searchChunksForScope(queryEmbedding: number[], seasonYear?: number | null, limit = 5) {
  if (!seasonYear) {
    return searchChunksForSeason(queryEmbedding, limit);
  }

  const [seasonResults, generalResults] = await Promise.all([
    searchChunksForSeason(queryEmbedding, limit, seasonYear),
    searchGeneralChunks(queryEmbedding, limit),
  ]);

  return [...seasonResults, ...generalResults]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function buildRagContext(
  query: string,
  preferredSeasonYear?: number,
  options?: RagStatusOptions & { limit?: number; sourceOffset?: number },
): Promise<RagContext> {
  const onStatus = options?.onStatus;
  const resultLimit = Math.min(Math.max(options?.limit ?? 6, 1), 50);
  const sourceOffset = options?.sourceOffset ?? 0;

  // Build variants synchronously before any IO so all embeddings batch into one API call.
  const searchVariants = buildSearchVariants(query);
  const allQueries = [query, ...searchVariants.slice(1)];

  let allEmbeddings: number[][];
  try {
    onStatus?.("Embedding your question for document search...");
    allEmbeddings = await embedBatch(allQueries);
  } catch {
    return {
      contextBlock: "",
      citations: [],
      selectedSeasonYear: preferredSeasonYear ?? null,
      hitCount: 0,
      bestScore: 0,
    };
  }

  const queryEmbedding = allEmbeddings[0]!;
  const alternateEmbeddings = allEmbeddings.slice(1);

  const explicitSeasonYears = parseSeasonYearsFromText(query);
  const explicitSeasonYear = explicitSeasonYears[0] ?? null;
  let selectedSeasonYear: number | null = explicitSeasonYear ?? preferredSeasonYear ?? null;
  let results: RagSearchResult[] = [];

  try {
    if (explicitSeasonYear) {
      onStatus?.(`Checking ${explicitSeasonYear} season documents and evergreen references...`);
      results = await searchChunksForScope(queryEmbedding, selectedSeasonYear, 8);
    } else if (preferredSeasonYear) {
      // Keep the conversation pinned to its selected season unless the user names a different one.
      onStatus?.(`Checking ${preferredSeasonYear} season documents and evergreen references...`);
      results = await searchChunksForScope(queryEmbedding, preferredSeasonYear, 8);
    } else {
      onStatus?.("Checking indexed documents across seasons...");
      const broadResults = await searchChunksForSeason(queryEmbedding, 18);
      selectedSeasonYear = pickDominantSeason(broadResults, preferredSeasonYear);
      if (selectedSeasonYear) {
        onStatus?.(`Narrowing document search to ${selectedSeasonYear} season sources...`);
        results = await searchChunksForScope(queryEmbedding, selectedSeasonYear, 8);
      } else {
        results = broadResults.slice(0, 8);
      }
    }

    // Skip cross-checking if primary search already found high-confidence matches.
    const bestInitialScore = results.length > 0 ? Math.max(...results.map((r) => r.score)) : 0;
    if (alternateEmbeddings.length > 0 && bestInitialScore < 0.85) {
      onStatus?.("Cross-checking likely team update and manual wording...");
      const alternateResults = await Promise.all(
        alternateEmbeddings.map((embedding) => searchChunksForScope(embedding, selectedSeasonYear, 8))
      );
      results = [...results, ...alternateResults.flat()];
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

  const uniqueResults = new Map<string, RagSearchResult>();
  for (const result of results) {
    const pageKey = `${result.payload.minio_key}:${result.payload.page_number}`;
    const existing = uniqueResults.get(pageKey);
    if (!existing || result.score > existing.score) {
      uniqueResults.set(pageKey, result);
    }
  } 

  const rerankedResults = rerankResults([...uniqueResults.values()], query);
  const citations: Citation[] = [];
  const sourceBlocks: string[] = [];
  const filteredResults = rerankedResults.slice(0, resultLimit);

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
      `[SOURCE ${sourceOffset + i + 1}]
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
    bestScore: Math.max(...results.map((result) => result.score)),
  };
}
