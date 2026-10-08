import { useState } from 'react';
import { Flag } from 'lucide-react';
import { userMessageOf } from '../lib/http';
import { resolvedNotice } from '../lib/review';
import type {
  ResolveAction,
  ReviewFilters,
  ReviewReport,
} from '../lib/review-api';
import { useReportQueue, useResolveReport } from '../store/review-queries';
import { ReportCard } from './ReportCard';
import { ReportResolveDialog } from './ReportResolveDialog';

/**
 * HU51/HU52 — Revisión de los reportes levantados por la comunidad.
 *
 * La cola es la real de la API: los pendientes del más antiguo al más nuevo y
 * los resueltos del más reciente. Cada reporte muestra lo denunciado a la
 * vista. Sancionar desactiva al objetivo y cierra de una vez todos los
 * pendientes sobre él; ambas resoluciones quedan en la bitácora.
 */

type Tab = 'PENDING' | 'RESOLVED';
type TypeFilter = ReviewFilters['targetType'];

const TYPES: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'USER', label: 'Usuarios' },
  { value: 'POST', label: 'Publicaciones' },
];

// "Resueltos" junta sancionados y desestimados: la API filtra por uno, así que
// la pestaña pide los dos y los mezcla por fecha de resolución.
const RESOLVED_STATUSES = ['SANCTIONED', 'DISMISSED'] as const;

type Notice = { tone: 'ok' | 'warn'; text: string };

const chipClass = (active: boolean) =>
  'px-4 py-2 rounded-full text-[13px] font-semibold border transition-colors ' +
  (active
    ? 'bg-[#d62828] text-white border-[#d62828]'
    : 'bg-white text-[#4a4340] border-[#e3ddd9] hover:border-[#d62828]');

function ReportList({
  filters,
  empty,
  onResolve,
}: {
  filters: ReviewFilters;
  empty: { title: string; hint: string };
  onResolve: (report: ReviewReport, action: ResolveAction) => void;
}) {
  const queue = useReportQueue(filters);
  const items = queue.data?.pages.flatMap((page) => page.items) ?? [];

  if (queue.isPending) {
    return <p className="text-[14px] text-[#8a807c]">Cargando reportes…</p>;
  }
  if (queue.isError) {
    return (
      <p
        role="alert"
        className="px-4 py-3 rounded-[14px] text-[14px] border bg-[#fdf3e2] border-[#efdcb8] text-[#b7791f]"
      >
        {userMessageOf(queue.error)}{' '}
        <button
          className="underline font-semibold"
          onClick={() => queue.refetch()}
        >
          Reintentar
        </button>
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <div className="bg-white border border-[#e3ddd9] rounded-[18px] p-10 text-center">
        <Flag className="w-8 h-8 text-[#8a807c] mx-auto mb-2" aria-hidden />
        <p className="text-[15px] text-[#4a4340] font-semibold">
          {empty.title}
        </p>
        <p className="text-[13px] text-[#8a807c] mt-1">{empty.hint}</p>
      </div>
    );
  }
  return (
    <>
      <ul className="flex flex-col gap-4">
        {items.map((report) => (
          <ReportCard key={report.id} report={report} onResolve={onResolve} />
        ))}
      </ul>
      {queue.hasNextPage && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => queue.fetchNextPage()}
            disabled={queue.isFetchingNextPage}
            className={chipClass(false)}
          >
            {queue.isFetchingNextPage ? 'Cargando…' : 'Ver más reportes'}
          </button>
        </div>
      )}
    </>
  );
}

export function ReportsReviewScreen() {
  const [tab, setTab] = useState<Tab>('PENDING');
  const [targetType, setTargetType] = useState<TypeFilter>('all');
  const [resolvedStatus, setResolvedStatus] =
    useState<(typeof RESOLVED_STATUSES)[number]>('SANCTIONED');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [resolving, setResolving] = useState<{
    report: ReviewReport;
    action: ResolveAction;
  } | null>(null);
  const resolve = useResolveReport();

  const filters: ReviewFilters = {
    status: tab === 'PENDING' ? 'PENDING' : resolvedStatus,
    targetType,
  };

  const confirm = (note: string) => {
    if (!resolving) return;
    const { report, action } = resolving;
    resolve.mutate(
      { id: report.id, action, note: note || undefined },
      {
        onSuccess: () =>
          setNotice({ tone: 'ok', text: resolvedNotice(report, action) }),
        onError: (error) =>
          setNotice({ tone: 'warn', text: userMessageOf(error) }),
        onSettled: () => setResolving(null),
      },
    );
  };

  return (
    <section className="max-w-[1000px]">
      <header className="mb-5">
        <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px]">
          Reportes de la comunidad
        </h1>
        <p className="text-[14px] text-[#8a807c]">
          Denuncias enviadas por estudiantes desde la app. Sancionar desactiva
          el objetivo y cierra todos los reportes pendientes sobre él.
        </p>
      </header>

      {notice && (
        <p
          role="status"
          className={
            'mb-4 px-4 py-3 rounded-[14px] text-[14px] border ' +
            (notice.tone === 'ok'
              ? 'bg-[#e8f3ec] border-[#c9e2d3] text-[#2f7d4f]'
              : 'bg-[#fdf3e2] border-[#efdcb8] text-[#b7791f]')
          }
        >
          {notice.text}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-2" role="tablist">
          {(
            [
              ['PENDING', 'Pendientes'],
              ['RESOLVED', 'Resueltos'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={chipClass(tab === value)}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'RESOLVED' && (
          <div className="flex gap-2" role="group" aria-label="Resolución">
            {(
              [
                ['SANCTIONED', 'Sancionados'],
                ['DISMISSED', 'Desestimados'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                aria-pressed={resolvedStatus === value}
                onClick={() => setResolvedStatus(value)}
                className={chipClass(resolvedStatus === value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div
          className="flex gap-2 ml-auto"
          role="group"
          aria-label="Tipo de objetivo"
        >
          {TYPES.map((t) => (
            <button
              key={t.value}
              aria-pressed={targetType === t.value}
              onClick={() => setTargetType(t.value)}
              className={chipClass(targetType === t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <ReportList
        key={`${filters.status}-${filters.targetType}`}
        filters={filters}
        empty={
          tab === 'PENDING'
            ? {
                title: 'No hay reportes pendientes',
                hint: 'Cuando la comunidad denuncie una cuenta o publicación, aparecerá aquí.',
              }
            : {
                title: 'Todavía no hay reportes resueltos',
                hint: 'Las resoluciones que tomes quedarán listadas en esta pestaña.',
              }
        }
        onResolve={(report, action) => setResolving({ report, action })}
      />

      {resolving && (
        <ReportResolveDialog
          report={resolving.report}
          action={resolving.action}
          pending={resolve.isPending}
          onCancel={() => setResolving(null)}
          onConfirm={confirm}
        />
      )}
    </section>
  );
}
