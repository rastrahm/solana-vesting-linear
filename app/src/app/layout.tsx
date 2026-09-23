import type { Metadata } from "next";
import { AppProviders } from "@/components/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "solana-vesting-linear",
  description: "UI de vesting lineal con cliff y revocación en Solana",
};

/**
 * @description Layout raíz App Router: providers de tema y wallet.
 * @param props.children Rutas hijas.
 * @returns HTML con providers cliente.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
