import { ThemeToggle } from "./ThemeToggle";

const NAV = (
  <nav className="hidden md:flex items-center gap-7 text-sm text-muted">
    <a href="/#how" className="hover:text-ink transition">How it works</a>
    <a href="/#recover" className="hover:text-ink transition">Recover</a>
    <a href="/faq" className="hover:text-ink transition">FAQ</a>
    <a href="/blog" className="hover:text-ink transition">Blog</a>
  </nav>
);

const Logo = (
  <a href="/" className="flex items-center gap-2 font-display font-bold text-lg tracking-tight whitespace-nowrap">
    <img src="/logo.png" alt="UnbrickSOL" className="h-10 w-auto" />
    <span>Unbrick<span className="grad-text">SOL</span></span>
  </a>
);

const shell = "sticky top-0 z-30 backdrop-blur-md bg-bg/85 border-b border-line";
const bar = "max-w-6xl mx-auto px-6 h-16 flex items-center justify-between";

/** Content header (blog, FAQ) - no wallet bundle. Links to the app instead. */
export function Header() {
  return (
    <header className={shell}>
      <div className={bar}>
        {Logo}
        {NAV}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a href="/#recover"
            className="font-display font-semibold text-sm text-white bg-sol-gradient rounded-lg px-4 py-2">
            Open app →
          </a>
        </div>
      </div>
    </header>
  );
}

export { NAV, Logo, shell, bar };
