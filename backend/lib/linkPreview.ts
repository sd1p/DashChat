// Open Graph link unfurling for URLs pasted in chat messages.
//
// Security: fetching an arbitrary user-supplied URL server-side is an SSRF risk
// (a user could paste http://169.254.169.254/ or an internal host). We resolve
// the hostname and reject private / loopback / link-local / reserved ranges
// before fetching, cap the timeout, and swallow all errors (a failed unfurl
// just means no preview — never a failed message send).

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import ogs from "open-graph-scraper";

export type LinkPreviewData = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

// First http(s) URL in a block of text. Deliberately simple — good enough to
// find a pasted link; the URL constructor validates it afterwards.
const URL_RE = /\bhttps?:\/\/[^\s<>"')]+/i;

export function extractFirstUrl(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(URL_RE);
  return match ? match[0] : null;
}

// True if an IP string is in a range we must not fetch (private, loopback,
// link-local, unique-local, or otherwise non-public).
function isBlockedIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const p = ip.split(".").map(Number);
    const [a = 0, b = 0] = p;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 0) return true; // "this" network
    if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    return false;
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true; // loopback
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique-local
    if (lower.startsWith("::ffff:")) {
      // IPv4-mapped — re-check the embedded v4 address.
      const v4 = lower.split(":").pop();
      if (v4 && isIP(v4) === 4) return isBlockedIp(v4);
    }
    return false;
  }
  return true; // unparseable → block
}

// Validate the URL is public-web-safe: http(s), has a hostname, and every
// resolved address is a public IP.
async function assertSafeUrl(rawUrl: string): Promise<URL | null> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  const host = u.hostname;
  // Reject obvious localhost aliases outright.
  if (host === "localhost" || host.endsWith(".localhost")) return null;

  try {
    // If the host is already a literal IP, check it directly; otherwise resolve.
    if (isIP(host)) {
      if (isBlockedIp(host)) return null;
    } else {
      const records = await lookup(host, { all: true });
      if (records.length === 0) return null;
      if (records.some((r) => isBlockedIp(r.address))) return null;
    }
  } catch {
    return null;
  }
  return u;
}

// Fetch OG metadata for the first URL in `text`. Returns null when there's no
// URL, the URL is unsafe, or the fetch/parse fails. Never throws.
export async function fetchLinkPreview(
  text: string | null | undefined
): Promise<LinkPreviewData | null> {
  const raw = extractFirstUrl(text);
  if (!raw) return null;

  const safe = await assertSafeUrl(raw);
  if (!safe) return null;

  try {
    const { error, result } = await ogs({
      url: safe.href,
      timeout: 5000,
      fetchOptions: {
        headers: {
          // Some sites serve OG tags only to "real" browsers/crawlers.
          "user-agent":
            "Mozilla/5.0 (compatible; DashChatBot/1.0; +link-preview)",
        },
      },
    });
    if (error || !result?.success) return null;

    const title = result.ogTitle ?? result.twitterTitle ?? null;
    const description =
      result.ogDescription ?? result.twitterDescription ?? null;
    const siteName = result.ogSiteName ?? null;

    // og:image may be an array of objects; take the first usable url.
    let imageUrl: string | null = null;
    const img = result.ogImage ?? result.twitterImage;
    if (Array.isArray(img) && img.length > 0) imageUrl = img[0]?.url ?? null;

    // Nothing worth showing.
    if (!title && !description && !imageUrl) return null;

    return { url: safe.href, title, description, imageUrl, siteName };
  } catch {
    return null;
  }
}
