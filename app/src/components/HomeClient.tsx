"use client";

import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletButton } from "@/components/WalletButton";
import { TxStatusBanner } from "@/components/TxStatusBanner";
import { HelpModal } from "@/components/HelpModal";
import { CreateVestingForm } from "@/components/CreateVestingForm";
import { ManageVestingPanel } from "@/components/ManageVestingPanel";
import { useTxStatus } from "@/hooks/useTxStatus";
import { getSolanaClusterConfig } from "@/lib/cluster";

/**
 * @description Shell cliente Fase 7: create/claim/cancel + Help + progreso.
 * @returns Home interactiva de vesting.
 */
export function HomeClient() {
  const { status, message, signature, setPending, setSuccess, setFailed } =
    useTxStatus();
  const { cluster, rpcUrl } = getSolanaClusterConfig();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <header className="topbar">
        <div className="brand">solana-vesting-linear</div>
        <div className="actions">
          <button
            type="button"
            aria-label="Abrir ayuda de vesting"
            onClick={() => setHelpOpen(true)}
          >
            Help
          </button>
          <ThemeToggle />
          <WalletButton />
        </div>
      </header>

      <section className="hero" aria-labelledby="home-title">
        <h1 id="home-title">Vesting lineal on-chain</h1>
        <p>
          Creá schedules con cliff, reclamá tokens según el Clock del cluster y
          cancelá si el vesting es revocable.
        </p>
        <span className="cluster-pill" aria-label={`Cluster ${cluster}`}>
          Cluster: {cluster} · {rpcUrl}
        </span>
      </section>

      <TxStatusBanner
        status={status}
        message={message}
        signature={signature}
      />

      <div className="workspace">
        <CreateVestingForm
          onPending={setPending}
          onSuccess={setSuccess}
          onFailed={setFailed}
        />
        <ManageVestingPanel
          onPending={setPending}
          onSuccess={setSuccess}
          onFailed={setFailed}
        />
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
