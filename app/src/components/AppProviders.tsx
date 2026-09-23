"use client";

import { useMemo, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { ThemeProvider } from "@/hooks/useTheme";
import { getSolanaClusterConfig } from "@/lib/cluster";

import "@solana/wallet-adapter-react-ui/styles.css";

export interface AppProvidersProps {
  children: ReactNode;
}

/**
 * @description Providers de tema + wallet/connection para la app cliente.
 * @param props.children Contenido de la aplicación.
 * @returns Árbol con ThemeProvider y wallet adapters (localnet/devnet vía env).
 */
export function AppProviders({ children }: AppProvidersProps) {
  const { rpcUrl } = getSolanaClusterConfig();
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ThemeProvider>
      <ConnectionProvider endpoint={rpcUrl}>
        <WalletProvider wallets={wallets} autoConnect={false}>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ThemeProvider>
  );
}
