"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * @description Modal de ayuda: Cliff, Linear Unlock Rate y Revocability.
 * @param props.open Si el diálogo está visible.
 * @param props.onClose Cierra el modal.
 * @returns Dialog accesible o null.
 */
export function HelpModal({ open, onClose }: HelpModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id={titleId}>Ayuda: conceptos de vesting</h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Cerrar ayuda"
            onClick={onClose}
          >
            Cerrar
          </button>
        </header>
        <HelpTerm title="Cliff Period">
          Intervalo hasta <code>cliff_time</code>. Antes de ese instante no hay
          tokens claimables (vested = 0), aunque el unlock lineal use{" "}
          <code>start_time</code> como base.
        </HelpTerm>
        <HelpTerm title="Linear Unlock Rate">
          Tras el cliff y antes de <code>end_time</code>, los tokens se liberan
          de forma proporcional al tiempo:{" "}
          <code>vested = total × (now − start) / (end − start)</code>, usando el
          Clock del cluster (no el reloj del navegador).
        </HelpTerm>
        <HelpTerm title="Revocability">
          Si el vesting es <strong>cancelable</strong>, el sender puede revocar:
          la parte ya vestida va al beneficiary y lo no vestido vuelve al
          sender; vault y cuenta de estado se cierran.
        </HelpTerm>
      </div>
    </div>
  );
}

interface HelpTermProps {
  title: string;
  children: ReactNode;
}

/**
 * @description Bloque de término dentro del Help modal.
 * @param props.title Título del concepto.
 * @param props.children Explicación.
 * @returns Artículo semántico.
 */
function HelpTerm({ title, children }: HelpTermProps) {
  return (
    <article className="help-term">
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}
