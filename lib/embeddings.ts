import OpenAI from "openai";

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY!,
  });
  return _client;
}

export async function embedText(text: string): Promise<number[]> {
  const r = await getClient().embeddings.create({ model: "openai/text-embedding-3-small", input: text });
  return r.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const r = await getClient().embeddings.create({ model: "openai/text-embedding-3-small", input: texts });
  return r.data.map((d) => d.embedding);
}
