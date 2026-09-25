import type { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import { AdminLayout } from './components/AdminLayout';
import { RequireAdmin } from './components/RequireAdmin';
import { DashboardScreen } from './components/DashboardScreen';
import { UsersScreen } from './components/UsersScreen';
import { ReportsReviewScreen } from './components/ReportsReviewScreen';
import { AuditLogScreen } from './components/AuditLogScreen';
import { AdminReportsScreen } from './components/AdminReportsScreen';

/** Toda sección administrativa pasa por el control de acceso (HU43/HU48). */
const guarded = (section: string, element: ReactNode) => (
  <RequireAdmin section={section}>{element}</RequireAdmin>
);

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AdminLayout,
    children: [
      {
        index: true,
        element: guarded('el dashboard administrativo', <DashboardScreen />),
      },
      {
        path: 'usuarios',
        element: guarded('el listado de usuarios', <UsersScreen />),
      },
      {
        path: 'reportes',
        element: guarded(
          'los reportes de la comunidad',
          <ReportsReviewScreen />,
        ),
      },
      {
        path: 'bitacora',
        element: guarded('la bitácora de auditoría', <AuditLogScreen />),
      },
      {
        path: 'informes',
        element: guarded(
          'los informes administrativos',
          <AdminReportsScreen />,
        ),
      },
    ],
  },
]);
