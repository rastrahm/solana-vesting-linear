"use client";

import dynamic from "next/dynamic";

/**
 * @description Botón de conexión de wallet (SSR desactivado por APIs del browser).
 * @returns MultiButton del wallet-adapter o null mientras carga.
 */
const WalletMultiButtonDynamic = dynamic(
  async () => {
    const mod = await import("@solana/wallet-adapter-react-ui");
    return mod.WalletMultiButton;
  },
  {
    ssr: false,
    loading: () => (
      <button type="button" disabled aria-label="Cargando wallet">
        Cargando wallet…
      </button>
    ),
  }
);

/**
 * @description Wrapper accesible del conector de wallet Solana.
 * @returns Contenedor con el MultiButton.
 */
export function WalletButton() {
  return (
    <div aria-label="Conexión de wallet">
      <WalletMultiButtonDynamic />
    </div>
  );
}
