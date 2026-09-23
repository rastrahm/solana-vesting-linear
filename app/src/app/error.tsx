"use client";

import { useEffect } from "react";

export interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * @description Boundary de error de la ruta principal.
 * @param props.error Error capturado por Next.js.
 * @param props.reset Callback para reintentar el render.
 * @returns UI de error con acción de reintento.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main>
      <h1>Algo salió mal</h1>
      <p role="alert">{error.message || "Error inesperado"}</p>
      <button type="button" onClick={reset} aria-label="Reintentar">
        Reintentar
      </button>
    </main>
  );
}
