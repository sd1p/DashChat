// Hermes realtime integration (publish side).
//
// DashChat's realtime layer is externalized to Hermes, a shared multi-tenant
// Socket.IO service (https://socket.sudipmandal.com). DashChat's backend fans
// events out to socket rooms by calling Hermes's server-to-server REST API
// (POST /api/emit), authenticated with this tenant's apiKey. Hermes then
// broadcasts to the connected clients. The backend holds no socket state and
// needs no Redis of its own, so it can scale to multiple instances freely.
//
// Why REST and not the Redis bus: production Hermes reads its bus from a managed
// Redis (Upstash) we don't want to hand DashChat credentials to. The apiKey +
// HTTPS is the decoupled cross-host path — the app never shares Hermes's Redis.

const HERMES_URL = process.env.HERMES_URL;
if (!HERMES_URL) {
  throw new Error(
    "HERMES_URL is not set — the Hermes service origin is required to publish realtime events.",
  );
}

const HERMES_API_KEY = process.env.HERMES_API_KEY;
if (!HERMES_API_KEY) {
  throw new Error(
    "HERMES_API_KEY is not set — the tenant apiKey is required to authenticate to Hermes's REST API.",
  );
}

const EMIT_URL = `${HERMES_URL.replace(/\/$/, "")}/api/emit`;

// Hermes forces tenantId from the authenticated apiKey, so the body omits it.
type EmitBody = { kind: "emit"; room: string; event: string; data?: unknown };
type GrantBody = { kind: "grant"; userId: string; room: string; ttl?: number };

/** Room name convention shared with Hermes: a user's private room. */
export const userRoom = (userId: string) => `user:${userId}`;
/** Room name convention shared with Hermes: a conversation room. */
export const chatRoom = (chatId: string) => `chat:${chatId}`;

// POST a bus message to Hermes. Best-effort with a short timeout: a slow or
// unreachable Hermes must never block or fail the REST request that triggered
// it (the message is already persisted; the socket is just a live nudge).
async function emit(body: EmitBody | GrantBody): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(EMIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HERMES_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[hermes] /api/emit ${res.status}: ${detail.slice(0, 200)}`);
    }
  } catch (err) {
    console.error(
      "[hermes] /api/emit request failed:",
      err instanceof Error ? err.message : err,
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fan a saved message out to each recipient's user room as a `notify` event —
 * the authoritative backend→client path that replaces the old client-emitted
 * `newMessage`. Best-effort (see emit()).
 */
export async function notifyNewMessage(
  message: unknown,
  recipientIds: string[],
): Promise<void> {
  await Promise.all(
    recipientIds.map((uid) =>
      emit({ kind: "emit", room: userRoom(uid), event: "notify", data: message }),
    ),
  );
}

/**
 * Authorize a user's sockets to join a conversation room. Argus clients can
 * only join their own `user:<id>` room on their own; broader rooms require this
 * backend grant (Hermes enforces per-conversation access this way). Called when
 * a user opens/loads a chat they're a member of. Best-effort.
 */
export async function grantChatAccess(
  userId: string,
  chatId: string,
): Promise<void> {
  await emit({ kind: "grant", userId, room: chatRoom(chatId) });
}
