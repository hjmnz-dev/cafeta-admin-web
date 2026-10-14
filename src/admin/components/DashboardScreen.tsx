import React from 'react';
import { Link } from 'react-router';
import { BadgeCheck, CircleDashed, FileText, Flag, Users } from 'lucide-react';
import { userMessageOf } from '../lib/http';
import { useDashboardMetrics } from '../store/dashboard-queries';

/**
 * HU43 — Dashboard administrativo.
 *
 * Da la foto inmediata con cifras reales: la API las cuenta al momento, sin
 * caché. Primero van las que obligan a actuar (reportes pendientes, cuentas por
 * verificar), después el volumen de la plataforma. Cada cifra con trabajo
 * detrás lleva al lugar donde se atiende.
 */

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  to,
  urgent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  hint: string;
  to?: string;
  urgent?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Icon
          className={
            'w-4 h-4 ' + (urgent ? 'text-[#c42222]' : 'text-[#6b625e]')
          }
          aria-hidden
        />
        <span className="text-[13px] text-[#6b625e]">{label}</span>
      </div>
      <p
        className={
          "font-['Space_Grotesk',sans-serif] font-bold text-[30px] leading-none " +
          (urgent ? 'text-[#c42222]' : 'text-[#171313]')
        }
      >
        {value}
      </p>
      <p className="text-[12px] text-[#6b625e] mt-1.5 leading-snug">{hint}</p>
    </>
  );

  const className =
    'bg-white border border-[#e3ddd9] rounded-[18px] p-4 block ' +
    (to ? 'hover:border-[#d62828] transition-colors' : '');

  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

const TIME = new Intl.DateTimeFormat('es-DO', {
  hour: '2-digit',
  minute: '2-digit',
});

export function DashboardScreen() {
  const { data, error, isPending, refetch } = useDashboardMetrics();

  return (
    <section className="max-w-[1180px]">
      <header className="mb-5">
        <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px]">
          Dashboard
        </h1>
        <p className="text-[14px] text-[#6b625e]">
          Estado general de la plataforma y trabajo pendiente de administración.
        </p>
      </header>

      {isPending && (
        <p
          role="status"
          className="flex items-center gap-2 text-[14px] text-[#6b625e]"
        >
          <CircleDashed className="w-4 h-4" aria-hidden />
          Cargando indicadores…
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="bg-white border border-[#e3ddd9] rounded-[18px] p-5 max-w-[520px]"
        >
          <p className="text-[15px] text-[#4a4340] mb-3">
            {userMessageOf(error)}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-full border border-[#e3ddd9] px-4 py-1.5 text-[13px] hover:border-[#d62828]"
          >
            Reintentar
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
            <StatTile
              icon={Flag}
              label="Reportes pendientes"
              value={data.pendingReports}
              hint="Denuncias de la comunidad sin revisar"
              to="/reportes"
              urgent={data.pendingReports > 0}
            />
            <StatTile
              icon={BadgeCheck}
              label="Cuentas por verificar"
              value={data.pendingVerifications}
              hint="Estudiantes sin confirmar como institucionales"
              to="/usuarios"
              urgent={data.pendingVerifications > 0}
            />
            <StatTile
              icon={Users}
              label="Usuarios activos"
              value={data.users.total}
              hint={`${data.users.last7Days} altas en los últimos 7 días`}
              to="/usuarios"
            />
            <StatTile
              icon={FileText}
              label="Publicaciones"
              value={data.posts.total}
              hint={`${data.posts.last7Days} nuevas en los últimos 7 días`}
            />
            <StatTile
              icon={CircleDashed}
              label="Historias vigentes"
              value={data.activeStories}
              hint="Aún no vencen y no están desactivadas"
            />
          </div>
          <p className="text-[12px] text-[#6b625e]">
            Actualizado a las {TIME.format(new Date(data.generatedAt))}
          </p>
        </>
      )}
    </section>
  );
}
