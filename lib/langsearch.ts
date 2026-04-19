export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export async function webSearch(query: string, limit = 3): Promise<SearchResult[]> {
  const response = await fetch("https://api.langsearch.com/v1/web-search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LANGSEARCH_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, count: limit, summary: true }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    console.error("LangSearch error:", response.status);
    throw new Error(`LangSearch ${response.status}`);
  }

  const data = await response.json();
  return (data?.webPages?.value ?? []).slice(0, limit).map((r: {
    name: string; snippet: string; url: string;
  }) => ({ title: r.name, snippet: r.snippet, url: r.url }));
}

export function buildWebContext(results: SearchResult[]) {
  if (results.length === 0) {
    return "";
  }

  return `\n\nRelevant web results:\n${results
    .map((result, index) => `[WEB ${index + 1}] ${result.title}\n${result.snippet}\nURL: ${result.url}`)
    .join("\n\n")}`;
}
