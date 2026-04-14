import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION = "frc_docs";
const VECTOR_SIZE = 1536;

let _client: QdrantClient | null = null;
function getClient() {
  if (!_client) _client = new QdrantClient({ url: process.env.QDRANT_URL ?? "http://localhost:6333" });
  return _client;
}

export async function ensureCollection() {
  const client = getClient();
  const { collections } = await client.getCollections();
  if (!collections.some((c) => c.name === COLLECTION)) {
    await client.createCollection(COLLECTION, { vectors: { size: VECTOR_SIZE, distance: "Cosine" } });
  }
}

export type DocChunkPayload = {
  doc_id: string; doc_name: string; season_year: number;
  page_number: number; chunk_index: number; minio_key: string; content: string;
};

export async function upsertChunks(
  points: Array<{ id: string; vector: number[]; payload: DocChunkPayload }>
) {
  await getClient().upsert(COLLECTION, { wait: true, points });
}

export async function searchChunks(vector: number[], limit = 5) {
  const result = await getClient().search(COLLECTION, { vector, limit, with_payload: true });
  return result.map((r) => ({ score: r.score, payload: r.payload as DocChunkPayload }));
}

export async function deleteChunksByDocId(docId: string) {
  await getClient().delete(COLLECTION, {
    wait: true,
    filter: { must: [{ key: "doc_id", match: { value: docId } }] },
  });
}
