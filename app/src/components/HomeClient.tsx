"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletButton } from "@/components/WalletButton";
import { TxStatusBanner } from "@/components/TxStatusBanner";
import { useTxStatus } from "@/hooks/useTxStatus";
import { getSolanaClusterConfig } from "@/lib/cluster";

/**
 * @description Shell cliente de la home: tema, wallet y demo de estados de tx.
 * @returns Contenido principal interactivo (sin formularios de vesting aún).
 */
export function HomeClient() {
  const { status, message, signature, setPending, setSuccess, setFailed, reset } =
    useTxStatus();
  const { cluster, rpcUrl } = getSolanaClusterConfig();

  return (
    <>
      <header className="topbar">
        <div className="brand">solana-vesting-linear</div>
        <div className="actions">
          <ThemeToggle />
          <WalletButton />
        </div>
      </header>

      <section className="hero" aria-labelledby="home-title">
        <h1 id="home-title">Vesting lineal on-chain</h1>
        <p>
          Base de la UI (Fase 6): tema persistente, conexión de wallet y feedback
          de transacciones. Los flujos create / claim / cancel llegan en la Fase
          7.
        </p>
        <span className="cluster-pill" aria-label={`Cluster ${cluster}`}>
          Cluster: {cluster} · {rpcUrl}
        </span>
      </section>

      <section aria-label="Demo de estado de transacción" className="note">
        <p>
          Demo de indicadores (sin enviar txs reales). En Fase 7 se enlazan a las
          instrucciones del programa.
        </p>
        <div className="actions" style={{ marginTop: "0.75rem" }}>
          <button
            type="button"
            aria-label="Simular transacción pendiente"
            onClick={() => setPending()}
          >
            Pending
          </button>
          <button
            type="button"
            aria-label="Simular transacción exitosa"
            onClick={() =>
              setSuccess("11111111111111111111111111111111111111111111")
            }
          >
            Success
          </button>
          <button
            type="button"
            aria-label="Simular transacción fallida"
            onClick={() => setFailed("Error de simulación")}
          >
            Failed
          </button>
          <button type="button" aria-label="Limpiar estado" onClick={reset}>
            Reset
          </button>
        </div>
        <TxStatusBanner
          status={status}
          message={message}
          signature={signature}
        />
      </section>
    </>
  );
}
