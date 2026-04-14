import { embedText } from "./embeddings";
import { searchChunks } from "./qdrant";
import type { Citation } from "./db/schema";

export interface RagContext {
  contextBlock: string;
  citations: Citation[];
}

export async function buildRagContext(query: string): Promise<RagContext> {
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(query);
  } catch {
    return { contextBlock: "", citations: [] };
  }

  let results: Awaited<ReturnType<typeof searchChunks>>;
  try {
    results = await searchChunks(queryEmbedding, 5);
  } catch {
    return { contextBlock: "", citations: [] };
  }
  if (results.length === 0) return { contextBlock: "", citations: [] };

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
  };
}
