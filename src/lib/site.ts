// Canonical site metadata, shared across SEO helpers, structured data and prerender.
export const SITE_URL = "https://unbricksol.com";
export const SITE_NAME = "UnbrickSOL";
export const SITE_TAGLINE = "Recover excess SOL from your Solana token mints";
export const SITE_DESCRIPTION =
  "UnbrickSOL is the simplest, safest way to recover excess SOL locked in Solana token mint accounts. " +
  "Scan a mint, see exactly what's recoverable above the rent-exempt minimum, and withdraw it non-custodially " +
  "in a single on-chain transaction. Powered by SIMD-0266 withdraw_excess_lamports. Supports Token Program and Token-2022.";

export const abs = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

// Open-source repo + CLI (Advanced recovery "download the CLI" trust path).
export const GITHUB_URL = "https://github.com/gbeni-wealth/unbricksol";
export const CLI_URL = `${GITHUB_URL}/tree/main/cli`;

// Organization block reused across pages' JSON-LD.
export const ORG_JSONLD = {
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: abs("/logo.png"),
  description: SITE_DESCRIPTION,
} as const;
