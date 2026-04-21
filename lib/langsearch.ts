import { buildWebSearchQuery } from "@/lib/web-search-decision";

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

interface WebSearchOptions {
  onStatus?: (message: string) => void;
}

export async function webSearch(
  query: string,
  limit = 3,
  seasonYear?: number,
  options?: WebSearchOptions,
): Promise<SearchResult[]> {
  const searchQuery = buildWebSearchQuery(query, seasonYear);
  options?.onStatus?.(
    seasonYear
      ? `Running a live web search for current ${seasonYear} FRC information...`
      : "Running a live web search for current information...",
  );
  const response = await fetch("https://api.langsearch.com/v1/web-search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LANGSEARCH_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: searchQuery, count: limit, summary: true }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    console.error("LangSearch error:", response.status);
    throw new Error(`LangSearch ${response.status}`);
  }

  const data = await response.json() as {
    data?: {
      webPages?: {
        value?: Array<{
          name: string;
          snippet?: string;
          summary?: string;
          url: string;
        }>;
      };
    };
    webPages?: {
      value?: Array<{
        name: string;
        snippet?: string;
        summary?: string;
        url: string;
      }>;
    };
  };

  const results = data.data?.webPages?.value ?? data.webPages?.value ?? [];
  return results.slice(0, limit).map((r) => ({
    title: r.name,
    snippet: r.summary ?? r.snippet ?? "",
    url: r.url,
  }));
}

export function buildWebContext(results: SearchResult[]) {
  if (results.length === 0) {
    return "";
  }

  return `\n\nCurrent web results for this question (use these for fresh or time-sensitive facts and cite them as [WEB N]):\n${results
    .map((result, index) => `[WEB ${index + 1}] ${result.title}\n${result.snippet}\nURL: ${result.url}`)
    .join("\n\n")}`;
}
