import React from 'react';
import { Link } from 'react-router';
import {
  Users,
  UserCheck,
  UserX,
  BadgeCheck,
  Flag,
  FileText,
} from 'lucide-react';
import { useAdminState } from '../store/AdminState';
import { usageIndicators, signupsByDay, usersByCareer } from '../lib/metrics';
import { formatDate } from '../lib/format';

/**
 * HU43 — Dashboard administrativo.
 *
 * Da la foto inmediata: primero las cifras que obligan a actuar (reportes
 * pendientes, verificaciones en cola), después las dos series que explican el
 * movimiento de la plataforma. Los gráficos son de una sola serie, así que el
 * color no codifica identidad: basta el rojo de marca sobre fondo blanco, y el
 * texto conserva sus propios tonos. La consola se define en claro, como la app.
 */

const DAYS = 14;

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
            'w-4 h-4 ' + (urgent ? 'text-[#d62828]' : 'text-[#8a807c]')
          }
          aria-hidden
        />
        <span className="text-[13px] text-[#8a807c]">{label}</span>
      </div>
      <p
        className={
          "font-['Space_Grotesk',sans-serif] font-bold text-[30px] leading-none " +
          (urgent ? 'text-[#d62828]' : 'text-[#171313]')
        }
      >
        {value}
      </p>
      <p className="text-[12px] text-[#8a807c] mt-1.5 leading-snug">{hint}</p>
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

/** Altas por día: una serie, barras finas con extremo redondeado y hueco de 2px. */
function SignupsChart({ data }: { data: { day: number; count: number }[] }) {
  const width = 560;
  const height = 150;
  const padBottom = 22;
  const max = Math.max(1, ...data.map((d) => d.count));
  const slot = width / data.length;
  const barWidth = slot - 6; // el hueco separa las barras sin adelgazarlas

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Altas de cuentas por día en los últimos ${data.length} días. Máximo ${max} en un día.`}
      >
        {/* Línea base recesiva */}
        <line
          x1="0"
          y1={height - padBottom}
          x2={width}
          y2={height - padBottom}
          stroke="#e3ddd9"
          strokeWidth="1"
        />

        {data.map((d, i) => {
          const plot = height - padBottom;
          const h =
            d.count === 0 ? 0 : Math.max(6, (d.count / max) * (plot - 18));
          const x = i * slot + 3;
          return (
            <g key={d.day}>
              {d.count > 0 && (
                <>
                  <rect
                    x={x}
                    y={plot - h}
                    width={barWidth}
                    height={h}
                    rx="4"
                    fill="#d62828"
                  />
                  {/* Etiqueta directa solo donde hay dato: no un número por barra vacía */}
                  <text
                    x={x + barWidth / 2}
                    y={plot - h - 6}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#4a4340"
                  >
                    {d.count}
                  </text>
                </>
              )}
              <title>{`${formatDate(d.day)}: ${d.count} ${d.count === 1 ? 'alta' : 'altas'}`}</title>
            </g>
          );
        })}

        {/* Solo los extremos del eje: el resto se lee al pasar el cursor */}
        <text x="0" y={height - 6} fontSize="11" fill="#8a807c">
          {formatDate(data[0].day)}
        </text>
        <text
          x={width}
          y={height - 6}
          fontSize="11"
          fill="#8a807c"
          textAnchor="end"
        >
          {formatDate(data[data.length - 1].day)}
        </text>
      </svg>

      {/* Misma información en texto, para lectura no visual */}
      <table className="sr-only">
        <caption>Altas de cuentas por día</caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            <th scope="col">Altas</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{formatDate(d.day)}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Distribución por carrera: pocas categorías, barras horizontales etiquetadas. */
function CareerBars({ data }: { data: { career: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <ul className="flex flex-col gap-2.5 m-0 p-0 list-none">
      {data.map((d) => (
        <li key={d.career} className="flex items-center gap-3">
          <span
            className="w-[132px] flex-none text-[13px] text-[#4a4340] truncate"
            title={d.career}
          >
            {d.career}
          </span>
          <span className="flex-1 h-[14px] bg-[#f1ece9] rounded-[4px] overflow-hidden">
            <span
              className="block h-full bg-[#d62828] rounded-[4px]"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </span>
          <span className="w-[28px] flex-none text-right text-[13px] font-semibold text-[#171313]">
            {d.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DashboardScreen() {
  const { users, posts, reports } = useAdminState();

  const indicators = usageIndicators(users, posts, reports);
  const signups = signupsByDay(users, DAYS);
  const careers = usersByCareer(users);

  return (
    <section className="max-w-[1180px]">
      <header className="mb-5">
        <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px]">
          Dashboard
        </h1>
        <p className="text-[14px] text-[#8a807c]">
          Estado general de la plataforma y trabajo pendiente de administración.
        </p>
      </header>

      {/* Indicadores generales de uso */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-6">
        <StatTile
          icon={Users}
          label="Cuentas registradas"
          value={indicators.totalUsers}
          hint={`${indicators.newUsers7d} altas en los últimos 7 días`}
          to="/usuarios"
        />
        <StatTile
          icon={UserCheck}
          label="Cuentas activas"
          value={indicators.activeUsers}
          hint="Con acceso a la plataforma"
          to="/usuarios"
        />
        <StatTile
          icon={UserX}
          label="Cuentas inactivas"
          value={indicators.inactiveUsers}
          hint="Acceso restringido, registro conservado"
          to="/usuarios"
        />
        <StatTile
          icon={BadgeCheck}
          label="Verificaciones pendientes"
          value={indicators.pendingVerification}
          hint="Cuentas por confirmar como institucionales"
          to="/usuarios"
          urgent={indicators.pendingVerification > 0}
        />
        <StatTile
          icon={Flag}
          label="Reportes pendientes"
          value={indicators.pendingReports}
          hint="Denuncias de la comunidad sin revisar"
          to="/reportes"
          urgent={indicators.pendingReports > 0}
        />
        <StatTile
          icon={FileText}
          label="Publicaciones activas"
          value={indicators.activePosts}
          hint="Contenido visible en el feed"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#e3ddd9] rounded-[18px] p-5">
          <h2 className="font-['Space_Grotesk',sans-serif] font-bold text-[16px] mb-1">
            Altas de cuentas por día
          </h2>
          <p className="text-[13px] text-[#8a807c] mb-4">Últimos {DAYS} días</p>
          <SignupsChart data={signups} />
        </div>

        <div className="bg-white border border-[#e3ddd9] rounded-[18px] p-5">
          <h2 className="font-['Space_Grotesk',sans-serif] font-bold text-[16px] mb-1">
            Cuentas por carrera
          </h2>
          <p className="text-[13px] text-[#8a807c] mb-4">
            Distribución del padrón registrado
          </p>
          <CareerBars data={careers} />
        </div>
      </div>
    </section>
  );
}
