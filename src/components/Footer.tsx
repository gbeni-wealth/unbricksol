export function Footer() {
  return (
    <footer className="border-t border-line mt-10">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="rounded-2xl bg-panel2 hairline p-5 mb-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-warn">Safety</div>
          <div className="text-sm text-muted mt-2 leading-relaxed">
            We will <span className="text-ink font-medium">never</span> ask for your seed phrase.
            Recovery is signed by your own wallet, or by a mint keypair file that is read locally in your browser
            and never uploaded. Verify every transaction before you approve it.
          </div>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 font-display font-semibold">
            <img src="/logo.png" alt="" className="h-8 w-auto" />
            <span>Unbrick<span className="grad-text">SOL</span></span>
          </div>
          <div className="flex items-center gap-5 flex-wrap">
            <a href="https://x.com/UnbrickSOL" target="_blank" rel="noopener noreferrer"
              aria-label="UnbrickSOL on X"
              className="inline-flex items-center text-muted hover:text-sol transition">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="/blog" className="font-mono text-xs text-muted hover:text-sol transition">
              Blog
            </a>
            <a href="/affiliate" className="font-mono text-xs text-muted hover:text-sol transition">
              Be an affiliate →
            </a>
            <div className="font-mono text-xs text-faint">
              p-token · SIMD-0266 · withdraw_excess_lamports
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
