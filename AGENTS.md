# Cafeta-Admin (consola de administración)

## Overview

Consola web de escritorio para FT10 (administración y auditoría): dashboard, usuarios, reportes, bitácora e informes. Nació con datos simulados en `localStorage`; hoy las seis pantallas (dashboard, usuarios, reportes de la comunidad, anuncios, bitácora e informes) leen y escriben la API real, y solo entra quien tiene rol `ADMIN`. Este `AGENTS.md` es un resumen ligero; corre `/audit Cafeta-Admin` para el escaneo completo.

## Stack

- **Language / Runtime**: TypeScript strict (`tsconfig.json`), React 18, Vite 6
- **UI**: Tailwind 4, `lucide-react`, `clsx` + `tailwind-merge` (sin Radix ni MUI, a diferencia de la web)
- **Routing**: React Router 7
- **Datos de la API**: TanStack Query 5, un cliente HTTP único (`src/admin/lib/http.ts`) y tipos generados desde OpenAPI
- **Monitoreo**: Sentry (`@sentry/react`), igual que la web (spec 0007)
- **Pruebas**: Vitest + Testing Library en `jsdom`

## Commands

```bash
npm install
npm run dev          # http://localhost:5173 (5174 si la web ya ocupa el puerto)
npm run lint
npm run format       # o format:check para solo revisar
npm run typecheck
npm run build
npm test
npm run api:types    # regenera los tipos desde OpenAPI; necesita la API en el puerto 3000
```

## Key files

| File                                    | Owns                                                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/admin/routes.tsx`                  | Rutas de la consola                                                                                                          |
| `src/admin/store/SessionStore.tsx`      | Sesión real del admin (`useSession()`); `QueryProvider.tsx` es el cliente de TanStack Query                                  |
| `src/admin/store/*-queries.ts`          | Hooks por pantalla: `dashboard`, `users`, `review` (reportes de la comunidad), `announcements`, `audit`, `report` (informes) |
| `src/admin/components/RequireAdmin.tsx` | Control de acceso: solo pasa un usuario con rol `ADMIN`                                                                      |
| `src/admin/lib/http.ts`                 | Cliente HTTP único: agrega el Bearer y traduce el `code` con `error-messages.ts`                                             |
| `src/admin/lib/*-api.ts`                | Llamadas a `/admin/*` por dominio, con tipos de `api-types.ts` (generado, no se edita a mano)                                |
| `src/admin/lib/monitoring.ts`           | Borde con Sentry: sin `VITE_SENTRY_DSN` no inicia nada                                                                       |
| `deploy/server.mjs`                     | Servidor estático de producción en App Service; es el mismo archivo que en `Cafeta` y un cambio va en los dos                |
| `src/admin/lib/`                        | Lógica pura (métricas, formato, filtros) con sus pruebas                                                                     |

## Conventions

- Una pantalla por archivo en `components/`, lógica pura en `lib/`, estado en `store/`.
- Alias `@/` apunta a `src/`.
- Al conectarse a la API, usa el mismo cliente HTTP común que la web (traduce el `code` de error) y los tipos generados desde OpenAPI.
- Diseño y accesibilidad: los tokens son una copia de los de la web (`Cafeta/design.md`); el texto tenue es `#6b625e` y el rojo de texto `#c42222` (AA sobre los fondos claros), el foco visible es global en `src/styles/index.css`, y todo campo lleva `<label htmlFor>` o `aria-label` y todo botón de solo ícono, `aria-label`. Un cambio de token va en los dos repos.

## Gotchas

- `ADMIN_ORIGIN` de la API espera `http://localhost:5174`; si arrancas el admin solo, Vite usa 5173 y CORS lo rechaza. Arranca primero la web o fija el puerto.
- La URL de la API sale de `VITE_API_URL`; sin ella usa `http://localhost:3000/api/v1`. En producción la fija el workflow desde el ambiente `production`; sin esa variable, la consola apuntaba a `localhost`.
- Producción: https://cafeta-admin-hj01.azurewebsites.net (`/version.txt` muestra el commit publicado). Un cambio que toca el contrato se despliega después del de la API.

## Agent skills

- [vercel-react-best-practices](../.claude/skills/vercel-react-best-practices/): `vercel-labs/agent-skills`, patrones y rendimiento en componentes React

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
