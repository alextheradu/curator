import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION = process.env.QDRANT_COLLECTION ?? "frc_docs";
const VECTOR_SIZE = 1536;

let _client: QdrantClient | null = null;

export function buildQdrantClientConfig() {
  const apiKey = process.env.QDRANT_API_KEY?.trim();
  return {
    url: process.env.QDRANT_URL ?? "http://localhost:6333",
    ...(apiKey ? { apiKey } : {}),
  };
}

function getClient() {
  if (!_client) _client = new QdrantClient(buildQdrantClientConfig());
  return _client;
}

export async function ensureCollection() {
  const client = getClient();
  const { collections } = await client.getCollections();
  if (!collections.some((c) => c.name === COLLECTION)) {
    await client.createCollection(COLLECTION, { vectors: { size: VECTOR_SIZE, distance: "Cosine" } });
  }
}

export async function getCollectionInfo() {
  return getClient().getCollection(COLLECTION);
}

export type DocChunkPayload = {
  doc_id: string; doc_name: string; doc_scope: "season" | "general"; season_year?: number | null;
  page_number: number; chunk_index: number; minio_key: string; content: string;
};

function sanitizePayloadString(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
      "\uFFFD",
    );
}

export async function upsertChunks(
  points: Array<{ id: string; vector: number[]; payload: DocChunkPayload }>
) {
  await getClient().upsert(COLLECTION, {
    wait: true,
    points: points.map((point) => ({
      ...point,
      payload: {
        ...point.payload,
        doc_id: sanitizePayloadString(point.payload.doc_id),
        doc_name: sanitizePayloadString(point.payload.doc_name),
        minio_key: sanitizePayloadString(point.payload.minio_key),
        content: sanitizePayloadString(point.payload.content),
      },
    })),
  });
}

export async function searchChunks(vector: number[], limit = 5) {
  return searchChunksForSeason(vector, limit);
}

export async function searchChunksForSeason(vector: number[], limit = 5, seasonYear?: number) {
  const result = await getClient().search(COLLECTION, {
    vector,
    limit: seasonYear ? Math.max(limit * 2, 12) : limit,
    with_payload: true,
    ...(seasonYear
      ? {
          filter: {
            must: [{ key: "season_year", match: { value: seasonYear } }],
          },
        }
      : {}),
  });
  return result
    .map((r) => ({ score: r.score, payload: r.payload as DocChunkPayload }))
    .slice(0, limit);
}

export async function searchGeneralChunks(vector: number[], limit = 5) {
  const result = await getClient().search(COLLECTION, {
    vector,
    limit,
    with_payload: true,
    filter: {
      must: [{ key: "doc_scope", match: { value: "general" } }],
    },
  });

  return result.map((r) => ({ score: r.score, payload: r.payload as DocChunkPayload }));
}

export async function deleteChunksByDocId(docId: string) {
  await getClient().delete(COLLECTION, {
    wait: true,
    filter: { must: [{ key: "doc_id", match: { value: docId } }] },
  });
}
