/**
 * Utilities for detecting, formatting, and presenting dynamic slide deck links (HyperFrames / HTML slides)
 * in chat bubbles, reports, and meeting minutes.
 */

export interface SlideLinkInfo {
  url: string;
  isSlide: boolean;
  filename?: string;
}

/** Hosts whose presentation URLs are slide decks even without a /slides/ path. */
const KNOWN_SLIDE_HOSTS = new Set([
  "docs.google.com", // Google Slides presentations: /presentation/d/…
  "slides.google.com",
]);

export function isSlideUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.trim();
  if (!clean) return false;
  const lower = clean.toLowerCase();

  let pathname = lower;
  let hostname = "";
  try {
    const parsed = new URL(lower);
    pathname = parsed.pathname;
    hostname = parsed.hostname;
  } catch {
    // Not an absolute URL — treat the whole string as a (relative) path.
  }

  // Known slide host (e.g. a Google Slides presentation link).
  if (hostname && KNOWN_SLIDE_HOSTS.has(hostname)) return true;
  // A file under a slides/ directory: "slides/intro.html", "/slides/x.html",
  // "https://…/slides/intro.html". The (^|/) anchor keeps prose like
  // "how-to-slide-into-dms" from matching.
  if (/(^|\/)slides\//.test(pathname)) return true;
  // A numbered slide file anywhere, e.g. slide-03.html, slide_3.html.
  if (/slide[-_]?\d+\.html$/i.test(pathname)) return true;
  return false;
}

export function detectSlideLinks(text: string | null | undefined): string[] {
  if (!text) return [];
  const found: string[] = [];

  // 1. Match markdown links [Label](url)
  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdLinkRegex.exec(text)) !== null) {
    const href = match[2].trim();
    if (isSlideUrl(href) && !found.includes(href)) {
      found.push(href);
    }
  }

  // 2. Match raw http/https or file links
  const rawUrlRegex = /(https?:\/\/[^\s<)"]+|file:\/\/\/[^\s<)"]+)/g;
  while ((match = rawUrlRegex.exec(text)) !== null) {
    const raw = match[1].trim();
    if (isSlideUrl(raw) && !found.includes(raw)) {
      found.push(raw);
    }
  }

  // 3. Match relative /slides/...html paths
  const relativeSlideRegex = /(?:^|\s)((\/|\.\/)?slides\/[^\s<)"]+\.html)/gi;
  while ((match = relativeSlideRegex.exec(text)) !== null) {
    const rel = match[1].trim();
    if (!found.includes(rel)) {
      found.push(rel);
    }
  }

  return found;
}
