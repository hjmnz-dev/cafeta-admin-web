# Cafeta · Consola de administración

Aplicación web de escritorio para **FT10 – Administración y auditoría**, el defecto **DEF-11** del Informe de Inspección de Fagan. Se separa de la app móvil (`Cafeta(antiguamente UniConnect)`) a propósito: el trabajo administrativo es de pantalla ancha y tablas, y sus permisos no tienen nada que ver con los de un estudiante.

## Historias cubiertas

| HU          | Qué hace                                                                        | Dónde                                |
| ----------- | ------------------------------------------------------------------------------- | ------------------------------------ |
| HU43        | Dashboard con indicadores de uso y actividad                                    | `components/DashboardScreen.tsx`     |
| HU44        | Informes administrativos con rango de fechas y descarga CSV                     | `components/AdminReportsScreen.tsx`  |
| HU45        | Bitácora de auditoría con filtros por responsable, acción y fechas              | `components/AuditLogScreen.tsx`      |
| HU46        | Registro automático de cada acción relevante, incluidos los intentos rechazados | `store/AdminState.tsx`               |
| HU47        | Listado de cuentas con búsqueda por nombre o correo                             | `components/UsersScreen.tsx`         |
| HU48 · HU49 | Desactivar y reactivar cuentas, con confirmación                                | `components/UsersScreen.tsx`         |
| HU50        | Verificar o rechazar la verificación institucional                              | `components/UsersScreen.tsx`         |
| HU51 · HU52 | Revisar denuncias de usuarios y publicaciones: sancionar o desestimar           | `components/ReportsReviewScreen.tsx` |

El control de acceso (HU43/HU48, escenario 2) vive en `components/RequireAdmin.tsx`: sin permisos no se muestra la sección y el intento queda en la bitácora.

## Cómo correrlo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 29 pruebas
npm run typecheck  # TypeScript sin emitir
npm run build      # bundle de producción en dist/
```

## Estado del proyecto

- **Sin backend.** Igual que la app móvil, los datos son de demostración y se persisten en `localStorage` (`cafeta.admin.v1`). Los setters de `AdminState` son exactamente lo que se sustituye por llamadas a la API cuando exista servidor.
- **Sin autenticación real.** El selector de rol de la cabecera cambia entre administrador y estudiante para poder comprobar los permisos; en producción ese rol lo entrega el backend.
- **Datos compartidos con la app móvil de forma manual.** Las denuncias que aquí se revisan son las que un estudiante levanta desde la app (HU55/HU56). Mientras no haya backend, cada aplicación tiene su propia copia de los datos de ejemplo.

## Estructura

```
src/
  admin/
    App.tsx            Provider + router
    routes.tsx         Rutas, todas bajo RequireAdmin
    store/AdminState   Estado, acciones administrativas y bitácora
    lib/metrics.ts     Indicadores del dashboard y armado de informes
    lib/format.ts      Formatos de fecha y rangos
    components/        Una pantalla por archivo
  styles/index.css     Tokens de marca Cafeta y base de Tailwind
  test/                setup de Vitest y utilidades de render
```

## Decisiones que conviene no perder

- **Toda acción pasa por `adminAction`**, que comprueba el permiso, aplica el cambio y escribe la bitácora en un solo lugar. Un camino que no pase por ahí sería una acción sin traza.
- **Sancionar resuelve y restringe a la vez**: al sancionar un reporte se desactiva la cuenta o la publicación denunciada y se cierra el reporte, porque es una sola decisión.
- **La baja es lógica, nunca borrado**: una cuenta desactivada conserva su registro, como pide HU48.
- **Los gráficos son de una sola serie**, así que el color no codifica identidad: rojo de marca sobre blanco, texto en sus propios tonos, y la misma información disponible en tabla para lectura no visual.
