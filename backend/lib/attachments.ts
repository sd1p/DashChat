// Turn stored Attachment rows into the client-facing shape: swap the private S3
// `key` for a short-lived signed `url`. Everything the client renders (images)
// goes through here so URLs are never persisted, only minted on read.

import { getSignedGetUrl } from "./s3";

// The columns we select for attachments on a message read.
export type StoredAttachment = {
  id: string;
  key: string;
  mimeType: string;
  fileName: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
};

export type SerializedAttachment = Omit<StoredAttachment, "key"> & {
  // Empty string if signing failed — the client shows a broken/missing image
  // rather than the whole message thread failing to load.
  url: string;
};

export async function serializeAttachment(
  a: StoredAttachment
): Promise<SerializedAttachment> {
  const { key, ...rest } = a;
  try {
    return { ...rest, url: await getSignedGetUrl(key) };
  } catch (err) {
    // Never let a signing failure (bad bucket/creds) take down the whole
    // messages request — degrade to a missing image instead.
    console.error(`[attachments] failed to sign ${key}:`, err);
    return { ...rest, url: "" };
  }
}

// Sign a whole message's attachments in parallel and return the message with
// `attachments` replaced by the serialized (url-bearing) versions.
export async function serializeMessageAttachments<
  T extends { attachments?: StoredAttachment[] | null }
>(message: T): Promise<Omit<T, "attachments"> & { attachments: SerializedAttachment[] }> {
  const attachments = await Promise.all(
    (message.attachments ?? []).map(serializeAttachment)
  );
  return { ...message, attachments };
}
