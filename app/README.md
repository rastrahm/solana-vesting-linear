# Frontend (Next.js) — reservado

Esta carpeta alojará la app **Next.js (App Router)** a partir de la **Fase 6**.

En Fase 0 no se implementa UI. Estructura prevista:

```text
app/
  package.json          # workspace o app independiente
  src/app/              # App Router
    layout.tsx
    page.tsx
    error.tsx
    not-found.tsx
  src/components/       # Theme, Help, Progress, forms
  src/lib/              # client del programa, Zod schemas
  src/hooks/
```

Stack previsto: TypeScript estricto, Zod, Vitest + RTL, wallet adapter Solana, tema light/dark + Help modal.
