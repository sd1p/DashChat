import type { Socket } from "socket.io";
import { bearerToken, verifyArgusToken } from "../lib/argus";
import { resolveUserFromClaims } from "../lib/authenticateUser";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types/socket";

// The fully-parameterized socket type, matching the io<...> generics in
// server.ts so io.use(socketAuth) type-checks.
type AppServerSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

// Socket.IO handshake middleware — the realtime counterpart of isAuthenticated.
// Runs once per connection (before any event) and rejects the handshake unless
// the client presents a valid Argus access token, verified against the same
// JWKS the REST API uses. On success the resolved local user is attached to
// socket.data.user, so event handlers derive identity from the verified token
// instead of trusting a client-supplied userId.
//
// The token is read from handshake.auth.token (set client-side via
// io(url, { auth: { token } })), falling back to the Authorization header.

export async function socketAuth(
  socket: AppServerSocket,
  // socket.io types this as `(err?: ExtendedError) => void`; ExtendedError just
  // extends Error, and we only ever pass a plain Error or nothing.
  next: (err?: Error) => void,
): Promise<void> {
  const authToken =
    typeof socket.handshake.auth?.token === "string"
      ? socket.handshake.auth.token
      : null;
  const token = authToken ?? bearerToken(socket.handshake.headers.authorization);

  if (!token) {
    next(new Error("Unauthorized: missing token"));
    return;
  }

  try {
    const claims = await verifyArgusToken(token);
    const user = await resolveUserFromClaims(claims);
    socket.data.user = user;
    socket.data.userId = user.id;
    next();
  } catch {
    next(new Error("Unauthorized: invalid or expired token"));
  }
}
