import React from "react";
import { createRoot } from "react-dom/client";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./index.css";
import { resolveRoute } from "./routes";

const root = document.getElementById("root")!;

// Routes are prerendered to static HTML (see scripts/prerender.mjs) so crawlers and
// LLMs get real content. That markup is produced by a browser render, not React SSR,
// so it lacks the hydration text-node markers - we client-render over it rather than
// hydrate. The prerendered HTML is already painted (instant content); React then mounts
// the identical tree, so there's no mismatch and no visible flash.
resolveRoute(window.location.pathname).then((element) => {
  createRoot(root).render(<React.StrictMode>{element}</React.StrictMode>);
});
