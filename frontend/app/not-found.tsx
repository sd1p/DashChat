import Link from "next/link";

// Custom 404. Dynamic rendering is inherited from the root layout's
// `export const dynamic = "force-dynamic"` (so Clerk isn't invoked at build
// time). A custom not-found page also avoids Next's built-in /_not-found being
// statically prerendered inside <ClerkProvider>.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">404 — Page not found</h1>
      <p className="text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/" className="underline">
        Go home
      </Link>
    </div>
  );
}
