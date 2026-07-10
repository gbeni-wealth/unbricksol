import { useEffect } from "react";

interface SeoOptions {
  title: string;
  description: string;
  canonical?: string;
  type?: "website" | "article";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Client-side SEO for our SPA routes: sets <title>, meta description, canonical,
 * OpenGraph/Twitter tags and optional JSON-LD. Good enough for indexing; for maximum
 * crawlability the blog routes should also be prerendered to static HTML at build time.
 */
export function useSeo({ title, description, canonical, type = "website", jsonLd }: SeoOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const upsert = (selector: string, create: () => HTMLElement, attr: string, value: string) => {
      let el = document.head.querySelector(selector) as HTMLElement | null;
      if (!el) { el = create(); document.head.appendChild(el); }
      el.setAttribute(attr, value);
    };
    const meta = (kind: "name" | "property", key: string, content: string) =>
      upsert(`meta[${kind}="${key}"]`, () => {
        const m = document.createElement("meta"); m.setAttribute(kind, key); return m;
      }, "content", content);

    meta("name", "description", description);
    meta("property", "og:title", title);
    meta("property", "og:description", description);
    meta("property", "og:type", type);
    meta("name", "twitter:title", title);
    meta("name", "twitter:description", description);
    if (canonical) {
      meta("property", "og:url", canonical);
      upsert('link[rel="canonical"]', () => {
        const l = document.createElement("link"); l.setAttribute("rel", "canonical"); return l;
      }, "href", canonical);
    }

    const scripts: HTMLScriptElement[] = [];
    if (jsonLd) {
      for (const block of Array.isArray(jsonLd) ? jsonLd : [jsonLd]) {
        const s = document.createElement("script");
        s.type = "application/ld+json";
        s.text = JSON.stringify(block);
        document.head.appendChild(s);
        scripts.push(s);
      }
    }

    return () => { document.title = prevTitle; scripts.forEach((s) => s.remove()); };
  }, [title, description, canonical, type, JSON.stringify(jsonLd)]);
}
