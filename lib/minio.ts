import * as Minio from "minio";

let _client: Minio.Client | null = null;

function getMinioConfig(): Minio.ClientOptions {
  const rawEndpoint = process.env.MINIO_ENDPOINT?.trim();
  if (!rawEndpoint) {
    throw new Error("MINIO_ENDPOINT is not configured");
  }

  const defaultUseSSL = process.env.MINIO_USE_SSL === "true";

  const assertProductionSsl = (useSSL: boolean) => {
    if (process.env.NODE_ENV === "production" && !useSSL) {
      throw new Error("MINIO_ENDPOINT must use HTTPS in production");
    }
  };

  if (rawEndpoint.startsWith("http://") || rawEndpoint.startsWith("https://")) {
    const parsed = new URL(rawEndpoint);
    if (parsed.pathname !== "/" && parsed.pathname !== "") {
      throw new Error("MINIO_ENDPOINT must not include a path");
    }
    const useSSL = parsed.protocol === "https:";
    assertProductionSsl(useSSL);

    return {
      endPoint: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : undefined,
      useSSL,
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!,
    };
  }

  assertProductionSsl(defaultUseSSL);

  return {
    endPoint: rawEndpoint,
    useSSL: defaultUseSSL,
    accessKey: process.env.MINIO_ACCESS_KEY!,
    secretKey: process.env.MINIO_SECRET_KEY!,
  };
}

function getClient(): Minio.Client {
  if (_client) return _client;
  _client = new Minio.Client(getMinioConfig());
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

export async function getPresignedUrl(key: string, expirySeconds = 300): Promise<string> {
  return getClient().presignedGetObject(BUCKET, key, expirySeconds);
}

export async function deletePdf(key: string) {
  await getClient().removeObject(BUCKET, key);
}
