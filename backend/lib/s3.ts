// S3 helpers for chat image attachments.
//
// Objects live in a PRIVATE bucket: nothing is publicly readable. We hand the
// browser short-lived pre-signed GET URLs (generated per read) so an attachment
// URL that leaks stops working once it expires. Uploads go through the backend
// (memory buffer -> PutObject), so the client never touches AWS credentials.

// Load env here too: this module can be imported (via the controllers) before
// server.ts runs dotenv.config(), and we read AWS_* below. Loading is
// idempotent — dotenv won't clobber already-set vars. Mirrors config/prisma.ts.
import { config as loadEnv } from "dotenv";
loadEnv({ path: "backend/config/.env" });

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Read env lazily (not captured into module-level consts at import time) so
// values are always current even if this module loads before env is populated.
function bucket(): string {
  const b = process.env.AWS_BUCKET_NAME;
  if (!b) throw new Error("AWS_BUCKET_NAME is not set");
  return b;
}

// The SDK picks up AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY from the env
// automatically via the default credential provider chain. Built once, lazily,
// after env is guaranteed loaded.
let _s3: S3Client | undefined;
function client(): S3Client {
  if (!_s3) {
    const region = process.env.AWS_REGION;
    _s3 = new S3Client(region ? { region } : {});
  }
  return _s3;
}

// How long a signed GET URL stays valid. Kept generous so an open chat doesn't
// see images 403 mid-session; the frontend can refetch messages if one expires.
export const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export async function putObject(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
}

// Build a time-limited URL the browser can load directly (e.g. from <img src>).
export async function getSignedGetUrl(key: string): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn: SIGNED_URL_TTL_SECONDS }
  );
}
