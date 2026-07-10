import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ThemeToggle } from "./ThemeToggle";
import { NAV, Logo, shell, bar } from "./Header";

/** App header (home, affiliate) - includes the wallet button. Lives in the interactive
 *  route chunks so blog/FAQ pages never ship the wallet bundle. */
export function AppHeader() {
  return (
    <header className={shell}>
      <div className={bar}>
        {Logo}
        {NAV}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
