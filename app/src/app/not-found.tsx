import Link from "next/link";

/**
 * @description Página 404 de la app.
 * @returns Mensaje not-found con enlace al inicio.
 */
export default function NotFoundPage() {
  return (
    <main>
      <h1>Página no encontrada</h1>
      <p>La ruta solicitada no existe.</p>
      <Link href="/" aria-label="Volver al inicio">
        Volver al inicio
      </Link>
    </main>
  );
}
