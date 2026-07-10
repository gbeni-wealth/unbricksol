// Build-time prerender: serve dist/, crawl the SPA with headless Chromium, and write
// real static HTML per route (so crawlers + LLMs get content, not an empty #root).
// Also generates dist/sitemap.xml from the discovered routes.
//
// Runs after `vite build`. Drives Playwright's bundled Chromium. Production builds run in
// GitHub Actions (Ubuntu, full Chromium) and deploy prebuilt to Vercel, because Vercel's
// build container can't launch Chromium (missing libnss3). See .github/workflows/deploy.yml.
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const SITE_URL = "https://unbricksol.com";
const PORT = 5199;

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain",
  ".woff": "font/woff", ".woff2": "font/woff2", ".xml": "application/xml",
};

// Cache the clean Vite index.html BEFORE we start overwriting per-route files —
// otherwise routes prerendered after "/" would inherit the home page's baked <head>.
const TEMPLATE = await readFile(join(DIST, "index.html"), "utf8");

// Static server: real files from disk; every HTML route gets the clean template.
function serve() {
  return createServer(async (req, res) => {
    try {
      const url = decodeURIComponent((req.url || "/").split("?")[0]);
      if (extname(url)) {
        const buf = await readFile(join(DIST, url));
        res.writeHead(200, { "Content-Type": MIME[extname(url)] || "application/octet-stream" });
        return res.end(buf);
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(TEMPLATE);
    } catch {
      res.writeHead(404); res.end("not found");
    }
  });
}

const norm = (p) => (p !== "/" && p.endsWith("/") ? p.slice(0, -1) : p);

// Fallback route list for the sitemap when a browser isn't available (e.g. a cloud
// build container without Chromium's system libs). The authoritative sitemap is
// produced by the real crawl below when prerendering runs (locally).
const FALLBACK_ROUTES = [
  "/", "/faq", "/blog",
  "/blog/recover-excess-sol-solana-token-mint-guide",
  "/blog/what-is-rent-exempt-reserve-solana",
  "/blog/simd-0266-withdraw-excess-lamports",
  "/blog/recover-sol-renounced-mint",
  "/blog/token-2022-vs-token-program-excess-sol",
  "/blog/is-excess-sol-recovery-safe",
];

function writeSitemap(routes) {
  const urls = [...routes].sort().map((r) => {
    const loc = `${SITE_URL}${r === "/" ? "/" : r}`;
    const priority = r === "/" ? "1.0" : r.startsWith("/blog/") ? "0.7" : "0.8";
    return `  <url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>${priority}</priority></url>`;
  });
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  return writeFile(join(DIST, "sitemap.xml"), sitemap).then(() =>
    console.log(`sitemap.xml written with ${routes.size ?? routes.length} routes`));
}

async function main() {
  const server = serve();
  await new Promise((r) => server.listen(PORT, r));

  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    // No usable browser (a build container whose Chromium can't run). Don't fail the
    // build — ship the SPA shell + a valid sitemap so the site stays up. Prerendered
    // HTML is produced by the GitHub Actions build (Ubuntu, full Chromium).
    server.close();
    console.warn("\n[prerender] Chromium unavailable, skipping prerender (SPA shell only).");
    console.warn("[prerender] Reason:", e.message.split("\n")[0]);
    console.warn("[prerender] Production prerender runs in GitHub Actions; local builds need Playwright Chromium.\n");
    await writeSitemap(new Set(FALLBACK_ROUTES));
    return;
  }

  const page = await browser.newPage();

  // /affiliate is prerendered so it serves real HTML (the SPA rewrite fallback isn't
  // reliable on the prebuilt output), but kept low-profile: excluded from the sitemap
  // below to discourage discovery/self-referral. Seeded explicitly since it's only a
  // discreet footer link.
  const NO_SITEMAP = new Set(["/affiliate"]);
  const seeds = ["/", "/faq", "/blog", "/affiliate"];
  const queue = [...seeds];
  const done = new Set();

  while (queue.length) {
    const route = norm(queue.shift());
    if (done.has(route)) continue;
    done.add(route);

    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "networkidle" });
    // Wait until the app has actually rendered real content into #root.
    await page.waitForFunction(() => {
      const root = document.getElementById("root");
      return root && root.querySelector("main, article, h1") && document.title.length > 0;
    }, { timeout: 20000 });

    // Discover same-origin internal links to crawl (auto-covers every blog post).
    const links = await page.$$eval("a[href]", (as) =>
      as.map((a) => a.getAttribute("href")).filter(Boolean));
    for (const href of links) {
      if (href.startsWith("/") && !href.startsWith("//") && !href.includes("#") && !href.includes(".")) {
        const r = norm(href);
        if (!done.has(r) && !queue.includes(r)) queue.push(r);
      }
    }

    let html = "<!doctype html>\n" + (await page.content()).replace(/^<!doctype html>/i, "");
    // Drop runtime-injected modulepreload hints: on content pages they'd pull the
    // wallet/web3 chunk the page never runs. Needed chunks still load via the import graph.
    html = html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>\s*/g, "");

    const outDir = route === "/" ? DIST : join(DIST, route);
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, "index.html"), html);
    console.log("prerendered", route);
  }

  await browser.close();
  server.close();

  // Sitemap from discovered routes, minus the low-profile ones (e.g. /affiliate).
  await writeSitemap(new Set([...done].filter((r) => !NO_SITEMAP.has(r))));
}

main().catch((e) => { console.error(e); process.exit(1); });
