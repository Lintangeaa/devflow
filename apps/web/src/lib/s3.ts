import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
const region = process.env.S3_REGION ?? "us-east-1";
const bucket = process.env.S3_BUCKET ?? "devflow";
const accessKey = process.env.S3_ACCESS_KEY ?? "devflow";
const secretKey = process.env.S3_SECRET_KEY ?? "devflow-secret";

export const s3 = new S3Client({
  region,
  endpoint,
  forcePathStyle: true, // required for MinIO / non-AWS S3
  credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
});

export async function uploadObject(key: string, body: Buffer, mime: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: mime,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** Public/signed URL for serving a stored object (X-Amz-Expires). */
export async function signedUrl(key: string, expiresIn = 3600): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  const base = process.env.S3_PUBLIC_URL; // nginx front if set
  if (base) return `${base.replace(/\/$/, "")}/${key}`;
  return await getSignedUrl(s3, cmd, { expiresIn });
}

export function newKey(dir: string, originalName: string): string {
  const ext = originalName.includes(".")
    ? originalName.split(".").pop()!.toLowerCase().slice(0, 10)
    : "";
  return `${dir}/${randomUUID()}${ext ? `.${ext}` : ""}`;
}