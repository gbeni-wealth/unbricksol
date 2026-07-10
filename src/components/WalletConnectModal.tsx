import { useEffect, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import type { WalletName } from "@solana/wallet-adapter-base";

/**
 * Custom "Clean Fintech" wallet-connect modal (replaces the stock wallet-adapter modal).
 * Connect logic is untouched - it drives the same `useWallet().select()` and is opened
 * via the WalletModalContext that WalletProvider now supplies (see providers/WalletProvider).
 * Wallet icons are the real bundled assets from each adapter (`wallet.adapter.icon`).
 */
export function WalletConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { wallets, select } = useWallet();

  // Installed wallets first, then the rest - each still its own row.
  const sorted = useMemo(() => {
    const installed = [];
    const rest = [];
    for (const w of wallets) {
      if (w.readyState === WalletReadyState.Installed) installed.push(w);
      else rest.push(w);
    }
    return [...installed, ...rest];
  }, [wallets]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  function pick(name: WalletName) {
    select(name);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(25,26,29,0.45)] backdrop-blur-[2px] wcm-fade"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wcm-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[400px] max-w-[92vw] max-h-[80vh] flex flex-col overflow-hidden rounded-2xl bg-panel border border-line shadow-[0_24px_60px_rgba(20,20,20,0.16)] wcm-in"
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 px-[22px] pt-[22px] pb-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">Step 1 of 1</div>
            <h2 id="wcm-title" className="font-display font-extrabold text-[19px] tracking-[-0.01em] text-ink mt-1.5">
              Connect a wallet
            </h2>
            <p className="text-[13.5px] text-muted mt-1">Choose a Solana wallet to continue.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 w-8 h-8 rounded-full grid place-items-center bg-panel2 border border-line2 text-muted hover:text-ink transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* wallet list */}
        <div className="border-t border-line/70 p-2 overflow-y-auto">
          {sorted.map((w) => {
            const detected = w.readyState === WalletReadyState.Installed;
            return (
              <button
                key={w.adapter.name}
                onClick={() => pick(w.adapter.name)}
                className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-left hover:bg-panel2 transition"
              >
                <span className="flex-shrink-0 w-9 h-9 rounded-[10px] grid place-items-center overflow-hidden bg-panel border border-line2">
                  <img src={w.adapter.icon} alt="" className="w-6 h-6" />
                </span>
                <span className="flex-1 min-w-0 font-display font-bold text-[14.5px] text-ink">
                  {w.adapter.name}
                </span>
                {detected ? (
                  <span className="font-mono text-[11px] text-good bg-good/10 border border-good/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                    Detected
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-faint px-0.5 whitespace-nowrap">Install</span>
                )}
              </button>
            );
          })}
        </div>

        {/* reassurance footer */}
        <div className="flex items-center gap-2 px-[22px] py-3.5 border-t border-line/70">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="flex-shrink-0 text-faint">
            <path d="M12 2l8 4v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6l8-4z" />
          </svg>
          <span className="text-xs text-faint">We never ask for your seed phrase.</span>
        </div>
      </div>
    </div>
  );
}
