/**
 * Live "brick scanner" - an animated visualization of a bricked mint account.
 * A scan line sweeps continuously across a grid of bricks; the leading bricks pulse
 * as "recoverable" excess, while a trailing segment stays muted as the rent-exempt
 * floor that always stays locked. Pure CSS animation, decorative but on-brand.
 */
const COLS = 20;
const ROWS = 3;
const LOCKED_COLS = 2; // trailing columns = rent floor (stays locked)

export function BrickScanner() {
  const bricks = Array.from({ length: COLS * ROWS });
  const step = 45; // ms per column - bricks load left -> right

  return (
    <div className="brick-scanner">
      <div className="brick-grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {bricks.map((_, i) => {
          const col = i % COLS;
          const locked = col >= COLS - LOCKED_COLS;
          return (
            <span
              key={i}
              className={`brick ${locked ? "brick-locked" : "brick-live"}`}
              style={{ animationDelay: `${col * step}ms` }}
            />
          );
        })}
      </div>
      <span className="scan-line" />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
        <span className="inline-flex items-center gap-1.5">
          <i className="w-2 h-2 rounded-[2px] bg-sol inline-block" /> recoverable excess
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-2 h-2 rounded-[2px] inline-block bg-faint/35" /> rent floor · stays locked
        </span>
      </div>
    </div>
  );
}
