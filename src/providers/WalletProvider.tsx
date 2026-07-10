import { ReactNode, useMemo, useState, FC, PropsWithChildren } from "react";
import {
  ConnectionProvider as _ConnectionProvider,
  WalletProvider as _WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalContext } from "@solana/wallet-adapter-react-ui";
import { Adapter } from "@solana/wallet-adapter-base";
import { RPC_URL } from "../lib/solana";
import { WalletConnectModal } from "../components/WalletConnectModal";

// The wallet adapters transitively pull in @types/react@19 (via react-native in the
// mobile adapters), which conflicts with this app's React 18 JSX types. Alias the
// providers to v18-compatible FCs - runtime is identical, this only satisfies tsc.
const ConnectionProvider = _ConnectionProvider as unknown as FC<PropsWithChildren<{ endpoint: string }>>;
const WalletProvider = _WalletProvider as unknown as FC<PropsWithChildren<{ wallets: Adapter[]; autoConnect?: boolean }>>;

// Supply the wallet-adapter modal context (so WalletMultiButton's `useWalletModal`
// keeps working), but render our own "Clean Fintech" modal instead of the stock one.
function WalletModalProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <WalletModalContext.Provider value={{ visible, setVisible }}>
      {children}
      <WalletConnectModal open={visible} onClose={() => setVisible(false)} />
    </WalletModalContext.Provider>
  );
}

export function AppWalletProvider({ children }: { children: ReactNode }) {
  // Register no explicit adapters: Phantom, Solflare, Backpack, etc. all announce
  // themselves via the Wallet Standard, which wallet-adapter-react auto-detects.
  // Passing the legacy SolflareWalletAdapter caused clicks to fall into Solflare's
  // web-wallet popup flow, which hangs on "Connecting…" when the extension is present.
  const wallets = useMemo<Adapter[]>(() => [], []);
  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
