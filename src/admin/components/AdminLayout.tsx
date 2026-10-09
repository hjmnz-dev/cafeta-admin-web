import { NavLink, Outlet } from 'react-router';
import {
  LayoutDashboard,
  Users,
  Flag,
  ScrollText,
  FileBarChart,
  Megaphone,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useDashboardMetrics } from '../store/dashboard-queries';
import { useSession } from '../store/SessionStore';

/**
 * Armazón de la consola: navegación lateral fija y lienzo ancho.
 *
 * Es deliberadamente distinto de la app móvil —aquí se trabaja sentado, con
 * tablas— pero conserva la marca para que se lea como el mismo producto.
 */

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/usuarios', label: 'Usuarios', icon: Users, end: false },
  {
    to: '/reportes',
    label: 'Reportes de la comunidad',
    icon: Flag,
    end: false,
  },
  { to: '/anuncios', label: 'Anuncios', icon: Megaphone, end: false },
  {
    to: '/bitacora',
    label: 'Bitácora de auditoría',
    icon: ScrollText,
    end: false,
  },
  {
    to: '/informes',
    label: 'Informes administrativos',
    icon: FileBarChart,
    end: false,
  },
];

/** Quien tiene la sesión abierta y la salida. */
function SessionBadge() {
  const { user, logout } = useSession();
  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="text-right leading-tight hidden sm:block">
        <p className="text-[13px] font-semibold text-[#171313]">
          {user.profile.displayName}
        </p>
        <p className="text-[12px] text-[#6b625e]">{user.email}</p>
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        className="flex items-center gap-2 rounded-full border border-[#e3ddd9] bg-white px-3 py-1.5 text-[13px] text-[#4a4340] hover:border-[#d62828]"
      >
        <LogOut className="w-4 h-4 text-[#6b625e]" aria-hidden />
        Cerrar sesión
      </button>
    </div>
  );
}

export function AdminLayout() {
  // El contador es el real de la API (el mismo del dashboard, en caché).
  const pending = useDashboardMetrics().data?.pendingReports ?? 0;

  return (
    <div className="min-h-screen flex bg-[#efebe8]">
      {/* Navegación */}
      <aside className="w-[248px] flex-none bg-white border-r border-[#e3ddd9] flex flex-col">
        <div className="px-5 py-5 border-b border-[#e3ddd9]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-[10px] bg-[#d62828] text-white flex items-center justify-center font-bold">
              c
            </span>
            <div className="leading-tight">
              <p className="font-['Space_Grotesk',sans-serif] font-bold text-[17px] lowercase tracking-[-0.03em]">
                cafeta
              </p>
              <p className="text-[11px] text-[#6b625e] uppercase tracking-[0.14em] font-['IBM_Plex_Mono',monospace]">
                Consola admin
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                'flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[14px] transition-colors ' +
                (isActive
                  ? 'bg-[#ffe9e6] text-[#c42222] font-semibold'
                  : 'text-[#4a4340] hover:bg-[#fbf8f7]')
              }
            >
              <Icon className="w-[18px] h-[18px] flex-none" aria-hidden />
              <span className="flex-1">{label}</span>
              {to === '/reportes' && pending > 0 && (
                <span
                  aria-label={`${pending} reportes pendientes`}
                  className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#d62828] text-white text-[11px] font-bold flex items-center justify-center"
                >
                  {pending}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#e3ddd9] flex items-start gap-2 text-[11px] text-[#6b625e] leading-snug">
          <ShieldCheck className="w-4 h-4 flex-none mt-0.5" aria-hidden />
          <p>
            Toda acción ejecutada aquí queda registrada en la bitácora de
            auditoría.
          </p>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[64px] flex-none bg-white border-b border-[#e3ddd9] flex items-center justify-between px-6">
          <p className="text-[13px] text-[#6b625e]">
            Administración y auditoría · FT10
          </p>
          <SessionBadge />
        </header>

        <main className="flex-1 min-w-0 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
