# solana-vesting-linear

Linear token vesting on Solana (Anchor + SPL Token / Token-2022) with cliff, revocation and a Next.js UI.  
Vesting lineal de tokens en Solana (Anchor + SPL Token / Token-2022) con cliff, revocación y UI Next.js.

## Choose your language / Elige tu idioma

- 🇬🇧 **English:** [README-EN.md](README-EN.md)
- 🇪🇸 **Español:** [README-ES.md](README-ES.md)

## Documentation index / Índice de documentación

| Document / Documento | English | Español |
|----------------------|---------|---------|
| Planning / Planificación (phases 0–8) | [PLANIFICACION-EN.md](doc/PLANIFICACION-EN.md) | [PLANIFICACION-ES.md](doc/PLANIFICACION-ES.md) |
| E2E happy path / Flujo E2E feliz | [E2E-EN.md](doc/E2E-EN.md) | [E2E-ES.md](doc/E2E-ES.md) |
| Security + a11y checklist / Checklist seguridad + a11y | [CHECKLIST-EN.md](doc/CHECKLIST-EN.md) | [CHECKLIST-ES.md](doc/CHECKLIST-ES.md) |
| Sealevel mitigations / Mitigaciones Sealevel | [SEALEVEL_MITIGATIONS-EN.md](doc/SEALEVEL_MITIGATIONS-EN.md) | [SEALEVEL_MITIGATIONS-ES.md](doc/SEALEVEL_MITIGATIONS-ES.md) |
| Class diagram / Diagrama de clases | [diagrama-clases-EN.md](doc/diagrama-clases-EN.md) | [diagrama-clases-ES.md](doc/diagrama-clases-ES.md) |
| Flow diagram / Diagrama de flujo | [diagrama-flujo-EN.md](doc/diagrama-flujo-EN.md) | [diagrama-flujo-ES.md](doc/diagrama-flujo-ES.md) |
| Process flowchart / Flujograma | [flujograma-EN.md](doc/flujograma-EN.md) | [flujograma-ES.md](doc/flujograma-ES.md) |

Frontend: [app/README.md](app/README.md)

## Quick start / Inicio rápido

```bash
npm install && npm test                      # on-chain build + tests
solana-test-validator --reset                # other terminal / otra terminal
bash scripts/localnet-deploy.sh              # deploy + IDL sync
cd app && cp .env.example .env.local && npm install && npm run dev   # http://localhost:3000
```

Localnet Program ID: `33KBw8PDvX4nSyhZHBg8xMZmpUvuHpxN7UhbsAyz7sba`
