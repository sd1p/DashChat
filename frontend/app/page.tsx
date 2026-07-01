import ChatHome from "@/components/chat/ChatHome";

// "/" — the chat app. The proxy (middleware) guarantees a signed-in Clerk
// session before this renders. ChatHome is a client component (sockets + React
// Query hooks); this server page is just the mount point.
export default function HomePage() {
  return <ChatHome />;
}
