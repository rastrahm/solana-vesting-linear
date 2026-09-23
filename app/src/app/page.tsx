import { HomeClient } from "@/components/HomeClient";

/**
 * @description Página principal (server): monta el shell cliente de Fase 6.
 * @returns Landing mínima con tema + wallet + demo de tx status.
 */
export default function HomePage() {
  return (
    <main>
      <HomeClient />
    </main>
  );
}
