import { ReactElement } from "react";

/**
 * Resolve a pathname to its page element, awaiting the route's chunk first. main.tsx
 * awaits this before hydrating so the prerendered markup is matched by a concrete
 * component (no Suspense-fallback hydration mismatch). Navigation is full page loads.
 */
export async function resolveRoute(pathname: string): Promise<ReactElement> {
  const path = pathname.replace(/\/+$/, "");

  if (path === "/affiliate") {
    const M = (await import("./pages/AffiliatePage")).default;
    return <M />;
  }
  if (path === "/faq") {
    const M = (await import("./pages/FaqPage")).default;
    return <M />;
  }
  if (path === "/blog") {
    const M = (await import("./pages/BlogPage")).default;
    return <M />;
  }
  if (path.startsWith("/blog/")) {
    const M = (await import("./pages/BlogPostPage")).default;
    return <M slug={path.slice("/blog/".length)} />;
  }
  const M = (await import("./HomeApp")).default;
  return <M />;
}
