import { useEffect, useMemo, useRef, useState } from "react";
import { LAMPORTS, SOL_USD, shorten } from "../lib/solana";

/** Post-recovery success animation (Clean Fintech / Option 1c). Auto-plays on mount
 *  (~1.3s): card fades+scales in, green glow pulses, ring draws, checkmark draws, ◎
 *  particles burst outward, the recovered amount counts up from 0, then the label /
 *  amount / USD / tx rows / CTAs fade up in sequence. CSS keyframes (cs-* in index.css)
 *  + one rAF loop for the count-up; no animation library.
 *
 *  Shown from Recover.tsx once a recovery transaction confirms. */
export function ClaimSuccessModal({
  lamports, sig, onClose, dp = 4,
}: {
  lamports: number; // net recovered lamports (what lands in the user's wallet)
  sig: string;      // confirmed transaction signature
  onClose: () => void;
  dp?: number;      // amount decimal places (matches the app's fmtSol default)
}) {
  const targetSol = lamports / LAMPORTS;
  const usd = "$" + Math.round(targetSol * SOL_USD).toLocaleString();
  const solscanHref = `https://solscan.io/tx/${sig}`;
  const fmt = (v: number) =>
    v.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });

  const reduce = useMemo(
    () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const [ringOn, setRingOn] = useState(reduce);
  const [checkOn, setCheckOn] = useState(reduce);
  const [display, setDisplay] = useState(reduce ? fmt(targetSol) : fmt(0));
  const raf = useRef<number>();

  // Particle burst — 14 ◎ glyphs on evenly spaced angles with distance jitter, colors
  // cycling accent-blue / teal / success-green. Generated once (matches the reference).
  const particles = useMemo(() => {
    const N = 14;
    return Array.from({ length: N }, (_, i) => {
      const angle = (i / N) * Math.PI * 2;
      const dist = 90 + Math.sin(i * 13.7) * 40 + 40;
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 20,
        delay: 300 + ((i * 37) % 260),
        size: 12 + (i % 4) * 3,
        color: i % 3 === 0 ? "#2C6ADB" : i % 3 === 1 ? "#2FA6A6" : "#2E9B6B",
      };
    });
  }, []);

  useEffect(() => {
    if (reduce) return; // show the final state immediately, no motion
    const t1 = setTimeout(() => setRingOn(true), 60);
    const t2 = setTimeout(() => {
      setCheckOn(true);
      // count up in sync with the checkmark draw: 0 → target, 900ms, ease-out-cubic
      const dur = 900;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(fmt(targetSol * eased));
        if (t < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }, 380);
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ringCircleStyle: React.CSSProperties = ringOn
    ? { animation: "cs-ringdraw .6s cubic-bezier(.3,.7,.3,1) both" }
    : { strokeDashoffset: 220 };
  const checkStyle: React.CSSProperties = checkOn
    ? { animation: "cs-checkdraw .35s ease-out both" }
    : { strokeDashoffset: 46 };

  // Rows fade up in sequence via cs-rise + staggered inline delays.
  const rise = (delay: string): React.CSSProperties => ({ animationDelay: delay });

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Claim successful"
      onClick={onClose}
      className="cs-fade fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(25,26,29,.45)", backdropFilter: "blur(2px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cs-cardin relative overflow-hidden"
        style={{
          width: 420, maxWidth: "92vw", background: "#FFFFFF",
          border: "1px solid rgba(20,20,20,.08)", borderRadius: 20,
          boxShadow: "0 24px 60px rgba(20,20,20,.16)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <button
          onClick={onClose} aria-label="Close"
          className="absolute z-[2] flex items-center justify-center"
          style={{
            top: 16, right: 16, width: 32, height: 32, borderRadius: "50%",
            border: "1px solid rgba(20,20,20,.10)", background: "#F3F3F0", color: "#5C5D63",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        <div className="relative flex flex-col items-center text-center"
          style={{ padding: "44px 32px 28px" }}>

          {/* green glow behind the check */}
          <div className="cs-glow absolute pointer-events-none" style={{
            top: 18, width: 180, height: 180, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(46,155,107,.28) 0%, rgba(46,155,107,0) 70%)",
          }} />

          {/* particle burst origin */}
          <div className="absolute" style={{ top: 78, left: "50%", width: 0, height: 0 }}>
            {checkOn && particles.map((p, i) => (
              <span key={i} aria-hidden style={{
                position: "absolute", left: 0, top: 0, fontWeight: 600,
                color: p.color, fontSize: p.size, pointerEvents: "none",
                willChange: "transform, opacity",
                // @ts-expect-error CSS custom properties
                "--dx": `${p.dx}px`, "--dy": `${p.dy}px`,
                animation: `cs-particle 1100ms cubic-bezier(.16,.8,.4,1) ${p.delay}ms both`,
              }}>◎</span>
            ))}
          </div>

          {/* check ring */}
          <div className="cs-pop relative" style={{ width: 88, height: 88 }}>
            <svg width="88" height="88" viewBox="0 0 88 88" style={{ position: "relative", zIndex: 1 }}>
              <circle cx="44" cy="44" r="38" fill="#FFFFFF" stroke="rgba(46,155,107,.18)" strokeWidth="4" />
              <circle cx="44" cy="44" r="38" fill="none" stroke="#2E9B6B" strokeWidth="4"
                strokeLinecap="round" strokeDasharray="240" transform="rotate(-90 44 44)"
                style={ringCircleStyle} />
              <path d="M28 45l11 11 21-23" fill="none" stroke="#2E9B6B" strokeWidth="4.5"
                strokeLinecap="round" strokeLinejoin="round" strokeDasharray="46" style={checkStyle} />
            </svg>
          </div>

          <div className="cs-rise" style={{
            ...rise(".35s"), fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
            letterSpacing: "0.14em", textTransform: "uppercase", color: "#2E9B6B",
            fontWeight: 600, marginTop: 22,
          }}>
            Claim successful
          </div>

          <div className="cs-rise" style={{
            ...rise(".4s"), fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
            fontSize: 40, color: "#191A1D", marginTop: 10, letterSpacing: "-0.01em",
          }}>
            ◎ {display}
          </div>
          <div className="cs-rise" style={{ ...rise(".45s"), fontSize: 14, color: "#5C5D63", marginTop: 4 }}>
            ≈ {usd} sent to your wallet
          </div>

          <div className="cs-rise" style={{
            ...rise(".5s"), width: "100%", height: 1, background: "rgba(20,20,20,.08)", margin: "26px 0 20px",
          }} />

          <div className="cs-rise" style={{
            ...rise(".55s"), width: "100%", display: "flex", alignItems: "center",
            justifyContent: "space-between", fontSize: 13,
          }}>
            <span style={{ color: "#8A8B91" }}>Transaction</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#191A1D" }}>{shorten(sig)}</span>
          </div>

          <div className="cs-rise" style={{ ...rise(".6s"), display: "flex", gap: 10, width: "100%", marginTop: 24 }}>
            <a href={solscanHref} target="_blank" rel="noopener noreferrer" style={{
              flex: 1, textDecoration: "none", fontWeight: 700, fontSize: 14.5, color: "#191A1D",
              border: "1px solid rgba(20,20,20,.14)", borderRadius: 12, padding: "13px 0", textAlign: "center",
            }}>
              View transaction ↗
            </a>
            <button onClick={onClose} style={{
              flex: 1, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14.5,
              color: "#FFFFFF", background: "linear-gradient(97deg,#2C6ADB 0%,#2FA6A6 100%)",
              border: "none", borderRadius: 12, padding: "13px 0", cursor: "pointer",
            }}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
