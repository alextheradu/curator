import * as Minio from "minio";

let _client: Minio.Client | null = null;

function getClient(): Minio.Client {
  if (_client) return _client;
  _client = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT!,
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY!,
    secretKey: process.env.MINIO_SECRET_KEY!,
  });
  return _client;
}

const BUCKET = process.env.MINIO_BUCKET ?? "curator-docs";

export async function ensureBucketExists() {
  const client = getClient();
  const exists = await client.bucketExists(BUCKET);
  if (!exists) await client.makeBucket(BUCKET);
}

export async function uploadPdf(key: string, buffer: Buffer, size: number) {
  const client = getClient();
  await ensureBucketExists();
  await client.putObject(BUCKET, key, buffer, size, { "Content-Type": "application/pdf" });
}

export async function getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
  return getClient().presignedGetObject(BUCKET, key, expirySeconds);
}

export async function deletePdf(key: string) {
  await getClient().removeObject(BUCKET, key);
}
