/**
 * Utilities for detecting, formatting, and presenting dynamic slide deck links (HyperFrames / HTML slides)
 * in chat bubbles, reports, and meeting minutes.
 */

export interface SlideLinkInfo {
  url: string;
  isSlide: boolean;
  filename?: string;
}

export function isSlideUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  if (clean.includes("/slides/") || clean.endsWith(".html") || clean.includes("slide")) {
    return true;
  }
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
