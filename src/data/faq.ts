// Shared FAQ content: rendered on-page (home + /faq) and emitted as FAQPage JSON-LD.
// Plain strings so it can feed both React and schema.org without duplication.
export interface Faq { q: string; a: string; }

export const FAQS: Faq[] = [
  {
    q: "What is excess SOL in a Solana token mint?",
    a: "Every Solana account must hold a minimum balance (the rent-exempt reserve). Token mints often hold more than that minimum. The surplus is excess SOL, and it used to be stuck.",
  },
  {
    q: "Can someone else recover the SOL in my mint?",
    a: "No. Recovery needs an authorised signature: your mint authority wallet or the original mint keypair. A mint address alone gives no access.",
  },
  {
    q: "Does recovering excess SOL affect my token?",
    a: "No. Only the surplus above the rent-exempt minimum moves. Your token supply, metadata, and authorities stay exactly the same.",
  },
  {
    q: "Is excess-SOL recovery live on Solana mainnet?",
    a: "Yes. It's live on mainnet today, for both the Token Program and Token-2022.",
  },
  {
    q: "Can I recover SOL from a renounced mint?",
    a: "Yes, if you still have the original mint keypair. UnbrickSOL reads it locally in your browser and never uploads it. No keypair, no recovery.",
  },
  {
    q: "Is UnbrickSOL non-custodial and safe to use?",
    a: "Yes. No seed phrase, no custody, no uploaded keys. You sign in your own wallet and can verify the transaction on-chain.",
  },
  {
    q: "How much SOL can I recover?",
    a: "It depends on the mint. Some hold a tiny amount, others a lot. Scan yours to see the exact figure before you decide.",
  },
];
