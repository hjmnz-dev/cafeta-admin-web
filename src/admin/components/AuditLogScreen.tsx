import { useMemo, useState } from 'react';
import { Search, CheckCircle2, XCircle } from 'lucide-react';
import {
  useAdminState,
  AUDIT_ACTION_LABELS,
  AuditAction,
} from '../store/AdminState';
import { formatDateTime, startOfDay, endOfDay } from '../lib/format';

/**
 * HU45 — Bitácora de auditoría.
 *
 * Muestra el historial que el sistema registra solo (HU46), con lo mínimo que
 * hace útil un registro: quién, qué, sobre qué, cuándo y si prosperó. Los
 * intentos rechazados se muestran igual que los ejecutados, marcados como
 * tales: son justamente los que se buscan al investigar un incidente.
 */
export function AuditLogScreen() {
  const { audit } = useAdminState();

  const [query, setQuery] = useState('');
  const [action, setAction] = useState<AuditAction | 'all'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const desde = from ? startOfDay(from) : -Infinity;
    const hasta = to ? endOfDay(to) : Infinity;

    return audit.filter((e) => {
      const matchesQuery =
        !q ||
        e.actor.toLowerCase().includes(q) ||
        e.target.toLowerCase().includes(q);
      const matchesAction = action === 'all' || e.action === action;
      return matchesQuery && matchesAction && e.at >= desde && e.at <= hasta;
    });
  }, [audit, query, action, from, to]);

  const field =
    'rounded-[12px] border border-[#e3ddd9] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#d62828]';

  return (
    <section className="max-w-[1180px]">
      <header className="mb-5">
        <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px]">
          Bitácora de auditoría
        </h1>
        <p className="text-[14px] text-[#8a807c]">
          {audit.length} registros · el sistema anota cada acción relevante,
          ejecutada o rechazada.
        </p>
      </header>

      {/* Filtros por usuario, acción y rango de fechas (HU45, escenario 2) */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#8a807c]"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Buscar por responsable u objetivo"
            placeholder="Buscar por responsable u objetivo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`w-full pl-11 ${field}`}
          />
        </div>
        <label className="flex flex-col gap-1 text-[12px] text-[#8a807c]">
          Acción
          <select
            aria-label="Filtrar por acción"
            value={action}
            onChange={(e) => setAction(e.target.value as AuditAction | 'all')}
            className={field}
          >
            <option value="all">Todas</option>
            {(Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]).map((a) => (
              <option key={a} value={a}>
                {AUDIT_ACTION_LABELS[a]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-[#8a807c]">
          Desde
          <input
            type="date"
            aria-label="Desde"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-[#8a807c]">
          Hasta
          <input
            type="date"
            aria-label="Hasta"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={field}
          />
        </label>
        {(query || action !== 'all' || from || to) && (
          <button
            onClick={() => {
              setQuery('');
              setAction('all');
              setFrom('');
              setTo('');
            }}
            className="px-4 py-2 rounded-full text-[13px] font-semibold border border-[#e3ddd9] text-[#4a4340] hover:border-[#d62828] hover:text-[#d62828] transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="bg-white border border-[#e3ddd9] rounded-[18px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <caption className="sr-only">
              Historial de acciones registradas por el sistema
            </caption>
            <thead>
              <tr className="bg-[#fbf8f7] text-left text-[12px] uppercase tracking-wide text-[#8a807c]">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Fecha y hora
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Responsable
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Acción
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Objetivo
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[#8a807c]"
                  >
                    Ningún registro coincide con los filtros aplicados.
                  </td>
                </tr>
              )}

              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-[#f0ebe8] align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-[#4a4340]">
                    {formatDateTime(e.at)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[#171313]">{e.actor}</p>
                    <p className="text-[12px] text-[#8a807c]">
                      {e.actorRole === 'admin' ? 'Administrador' : 'Estudiante'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[#171313]">
                      {e.succeeded ? (
                        <CheckCircle2
                          className="w-4 h-4 text-[#2f7d4f] flex-none"
                          aria-label="Ejecutada"
                        />
                      ) : (
                        <XCircle
                          className="w-4 h-4 text-[#d62828] flex-none"
                          aria-label="Rechazada"
                        />
                      )}
                      {AUDIT_ACTION_LABELS[e.action]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#4a4340]">{e.target}</td>
                  <td className="px-4 py-3 text-[#8a807c] max-w-[380px]">
                    {e.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
