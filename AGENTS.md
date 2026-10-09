# Cafeta-Admin (consola de administración)

## Overview

Consola web de escritorio para FT10 (administración y auditoría): dashboard, usuarios, reportes, bitácora e informes. Hoy funciona con datos simulados en `localStorage`; se conecta a la API en el slice 10 del scope. Este `AGENTS.md` es un resumen ligero; corre `/audit Cafeta-Admin` para el escaneo completo antes de conectarla.

## Stack

- **Language / Runtime**: TypeScript strict (`tsconfig.json`), React 18, Vite 6
- **UI**: Tailwind 4, `lucide-react`, `clsx` + `tailwind-merge` (sin Radix ni MUI, a diferencia de la web)
- **Routing**: React Router 7
- **Pruebas**: Vitest + Testing Library en `jsdom`

## Commands

```bash
npm install
npm run dev          # http://localhost:5173 (5174 si la web ya ocupa el puerto)
npm run typecheck
npm run build
npm test
```

## Key files

| File                                    | Owns                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/admin/routes.tsx`                  | Rutas de la consola                                                                   |
| `src/admin/store/AdminState.tsx`        | Estado simulado y registro de auditoría (HU46), en `localStorage` (`cafeta.admin.v1`) |
| `src/admin/components/RequireAdmin.tsx` | Control de acceso a la consola                                                        |
| `src/admin/lib/`                        | Cálculo de métricas y formato, con pruebas                                            |

## Conventions

- Una pantalla por archivo en `components/`, lógica pura en `lib/`, estado en `store/`.
- Alias `@/` apunta a `src/`.
- Al conectarse a la API, usa el mismo cliente HTTP común que la web (traduce el `code` de error) y los tipos generados desde OpenAPI.
- Diseño y accesibilidad: los tokens son una copia de los de la web (`Cafeta/design.md`); el texto tenue es `#6b625e` y el rojo de texto `#c42222` (AA sobre los fondos claros), el foco visible es global en `src/styles/index.css`, y todo campo lleva `<label htmlFor>` o `aria-label` y todo botón de solo ícono, `aria-label`. Un cambio de token va en los dos repos.

## Gotchas

- `ADMIN_ORIGIN` de la API espera `http://localhost:5174`; si arrancas el admin solo, Vite usa 5173 y CORS lo rechaza. Arranca primero la web o fija el puerto.
- Sin lint ni formato todavía: `/develop herramientas` agrega oxlint y Prettier.

## Agent skills

- [vercel-react-best-practices](../.claude/skills/vercel-react-best-practices/): `vercel-labs/agent-skills`, patrones y rendimiento en componentes React

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
