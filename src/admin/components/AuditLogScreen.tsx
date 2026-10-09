import { useState } from 'react';
import { Search, CheckCircle2, XCircle } from 'lucide-react';
import {
  actionLabel,
  describeMetadata,
  isReversedRange,
  roleLabel,
  targetLabel,
} from '../lib/audit';
import { NO_AUDIT_FILTERS, type AuditFilters } from '../lib/audit-api';
import { formatDateTime } from '../lib/format';
import { userMessageOf } from '../lib/http';
import { useAuditActions, useAuditLogs } from '../store/audit-queries';
import { useDebouncedValue } from '../store/useDebouncedValue';
import { useLoadMoreOnVisible } from '../store/useLoadMoreOnVisible';

/**
 * HU45 — Bitácora de auditoría.
 *
 * Muestra el historial real que la API registra sola (HU46), con lo mínimo que
 * hace útil un registro: quién, qué, sobre qué, cuándo y si prosperó. Los
 * intentos rechazados se muestran igual que los ejecutados, marcados como
 * tales: son justamente los que se buscan al investigar un incidente. La
 * pantalla solo lee; la bitácora no se puede escribir desde aquí.
 */

const SEARCH_DELAY_MS = 300;

const FIELD =
  'rounded-[12px] border border-[#e3ddd9] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#d62828]';

const RESULTS: { value: AuditFilters['result']; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'succeeded', label: 'Ejecutadas' },
  { value: 'rejected', label: 'Rechazadas' },
];

export function AuditLogScreen() {
  const [filters, setFilters] = useState<AuditFilters>(NO_AUDIT_FILTERS);
  const change = (patch: Partial<AuditFilters>) =>
    setFilters((current) => ({ ...current, ...patch }));

  const actor = useDebouncedValue(filters.actor, SEARCH_DELAY_MS);
  const applied: AuditFilters = { ...filters, actor };
  const reversed = isReversedRange(filters.from, filters.to);

  const logs = useAuditLogs(applied, !reversed);
  const actions = useAuditActions();

  const rows = logs.data?.pages.flatMap((page) => page.items) ?? [];
  const loadMore = () => {
    if (logs.hasNextPage && !logs.isFetchingNextPage) void logs.fetchNextPage();
  };
  const sentinel = useLoadMoreOnVisible(Boolean(logs.hasNextPage), loadMore);

  const filtering =
    JSON.stringify(filters) !== JSON.stringify(NO_AUDIT_FILTERS);

  return (
    <section className="max-w-[1180px]">
      <header className="mb-5">
        <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px]">
          Bitácora de auditoría
        </h1>
        <p className="text-[14px] text-[#8a807c]">
          El sistema anota cada acción relevante, ejecutada o rechazada. Solo se
          puede consultar.
        </p>
      </header>

      {/* Filtros por usuario, acción, resultado y rango de fechas (HU45, escenario 2) */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#8a807c]"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Buscar por responsable"
            placeholder="Buscar por correo o usuario..."
            value={filters.actor}
            onChange={(e) => change({ actor: e.target.value })}
            className={`w-full pl-11 ${FIELD}`}
          />
        </div>
        <label className="flex flex-col gap-1 text-[12px] text-[#8a807c]">
          Acción
          <select
            aria-label="Filtrar por acción"
            value={filters.action}
            onChange={(e) => change({ action: e.target.value })}
            className={FIELD}
          >
            <option value="">Todas</option>
            {(actions.data?.actions ?? []).map((a) => (
              <option key={a} value={a}>
                {actionLabel(a)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-[#8a807c]">
          Resultado
          <select
            aria-label="Filtrar por resultado"
            value={filters.result}
            onChange={(e) =>
              change({ result: e.target.value as AuditFilters['result'] })
            }
            className={FIELD}
          >
            {RESULTS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-[#8a807c]">
          Desde
          <input
            type="date"
            aria-label="Desde"
            value={filters.from}
            onChange={(e) => change({ from: e.target.value })}
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-[#8a807c]">
          Hasta
          <input
            type="date"
            aria-label="Hasta"
            value={filters.to}
            onChange={(e) => change({ to: e.target.value })}
            className={FIELD}
          />
        </label>
        {filtering && (
          <button
            onClick={() => setFilters(NO_AUDIT_FILTERS)}
            className="px-4 py-2 rounded-full text-[13px] font-semibold border border-[#e3ddd9] text-[#4a4340] hover:border-[#d62828] hover:text-[#d62828] transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {reversed && (
        <p
          role="alert"
          className="mb-4 px-4 py-3 rounded-[14px] text-[14px] border bg-[#fdf3e2] border-[#efdcb8] text-[#b7791f]"
        >
          La fecha “Desde” no puede ser posterior a “Hasta”.
        </p>
      )}

      {logs.isError && (
        <p
          role="alert"
          className="mb-4 px-4 py-3 rounded-[14px] text-[14px] border bg-[#fdf3e2] border-[#efdcb8] text-[#b7791f]"
        >
          {userMessageOf(logs.error)}{' '}
          <button
            className="underline font-semibold"
            onClick={() => logs.refetch()}
          >
            Reintentar
          </button>
        </p>
      )}

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
              {logs.isPending && !reversed && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[#8a807c]"
                  >
                    Cargando registros…
                  </td>
                </tr>
              )}
              {logs.isSuccess && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[#8a807c]"
                  >
                    Ningún registro coincide con los filtros aplicados.
                  </td>
                </tr>
              )}

              {rows.map((e) => (
                <tr key={e.id} className="border-t border-[#f0ebe8] align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-[#4a4340]">
                    {formatDateTime(Date.parse(e.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    {e.actor ? (
                      <>
                        <p className="text-[#171313]">{e.actor.email}</p>
                        <p className="text-[12px] text-[#8a807c]">
                          {e.actor.handle ? `@${e.actor.handle} · ` : ''}
                          {roleLabel(e.actor.role)}
                        </p>
                      </>
                    ) : (
                      <p className="text-[#8a807c]">Sin sesión</p>
                    )}
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
                      {actionLabel(e.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#4a4340]">{targetLabel(e)}</td>
                  <td className="px-4 py-3 text-[#8a807c] max-w-[380px] break-words">
                    {describeMetadata(e.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {logs.hasNextPage && (
        <div ref={sentinel} className="flex justify-center mt-4">
          <button
            onClick={loadMore}
            disabled={logs.isFetchingNextPage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold border border-[#e3ddd9] text-[#4a4340] hover:border-[#d62828] hover:text-[#d62828] transition-colors disabled:opacity-50"
          >
            {logs.isFetchingNextPage ? 'Cargando…' : 'Ver más registros'}
          </button>
        </div>
      )}
    </section>
  );
}
