import { useState } from 'react';
import { FileText, Gavel, ShieldOff, User, UserX } from 'lucide-react';
import { formatDateTime } from '../lib/format';
import { userMessageOf } from '../lib/http';
import {
  canDeactivateAuthor,
  postTexts,
  REASON_LABEL,
  sanctionLabel,
  STATUS_LABEL,
  stateNote,
  targetTitle,
} from '../lib/review';
import type { ResolveAction, ReviewReport } from '../lib/review-api';
import { useReportDetail } from '../store/review-queries';

const STATUS_STYLE: Record<ReviewReport['status'], string> = {
  PENDING: 'bg-[#fdf3e2] text-[#b7791f]',
  SANCTIONED: 'bg-[#ffe9e6] text-[#c42222]',
  DISMISSED: 'bg-[#f1ece9] text-[#6b625e]',
};

const ACTION_BUTTON =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors';

/** Lo denunciado, a la vista: decidir una sanción sin verlo sería firmar a ciegas. */
function ReportedContent({ report }: { report: ReviewReport }) {
  const { target } = report;
  const note = stateNote(report);
  if (report.targetType === 'USER') {
    return (
      <p>
        {target.displayName ? (
          <>
            @{target.handle}
            {note && <em className="text-[#6b625e]"> · {note}</em>}
          </>
        ) : (
          <span className="text-[#6b625e]">Esta cuenta ya no existe.</span>
        )}
      </p>
    );
  }
  const { current, snapshot } = postTexts(target);
  return (
    <div className="flex flex-col gap-2">
      {current ? (
        <p>“{current}”</p>
      ) : (
        <p className="text-[#6b625e]">
          {target.postState === 'DELETED'
            ? 'La publicación fue borrada por su autor.'
            : 'Sin texto (la publicación solo tiene archivos).'}
        </p>
      )}
      {snapshot && (
        <p className="text-[13px] text-[#6b625e]">
          Al momento del reporte decía: “{snapshot}”
        </p>
      )}
      {note && <em className="text-[13px] text-[#6b625e]">{note}</em>}
    </div>
  );
}

/** Los otros reportes pendientes sobre el mismo objetivo, bajo demanda. */
function RelatedReports({ id }: { id: string }) {
  const detail = useReportDetail(id, true);
  if (detail.isPending) {
    return <p className="text-[13px] text-[#6b625e]">Cargando detalle…</p>;
  }
  if (detail.isError) {
    return (
      <p role="alert" className="text-[13px] text-[#b7791f]">
        {userMessageOf(detail.error)}
      </p>
    );
  }
  if (detail.data.related.length === 0) {
    return (
      <p className="text-[13px] text-[#6b625e]">
        No hay otros reportes pendientes sobre esto.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1 text-[13px] text-[#4a4340]">
      {detail.data.related.map((r) => (
        <li key={r.id}>
          {REASON_LABEL[r.reason]} · @{r.reporter.handle} ·{' '}
          {formatDateTime(Date.parse(r.createdAt))}
          {r.details && <span className="text-[#6b625e]"> · {r.details}</span>}
        </li>
      ))}
    </ul>
  );
}

export function ReportCard({
  report,
  onResolve,
}: {
  report: ReviewReport;
  onResolve: (report: ReviewReport, action: ResolveAction) => void;
}) {
  const [showRelated, setShowRelated] = useState(false);
  const title = targetTitle(report);
  const Icon = report.targetType === 'USER' ? User : FileText;

  return (
    <li
      className="bg-white border border-[#e3ddd9] rounded-[18px] p-5"
      data-testid={`report-${report.id}`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-9 h-9 rounded-[12px] bg-[#ffe9e6] text-[#c42222] flex items-center justify-center flex-none">
            <Icon className="w-[18px] h-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-[15px] text-[#171313]">{title}</p>
            <p className="text-[13px] text-[#6b625e]">
              {REASON_LABEL[report.reason]} · reportado por @
              {report.reporter.handle} ·{' '}
              {formatDateTime(Date.parse(report.createdAt))}
            </p>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[12px] font-semibold flex-none ${STATUS_STYLE[report.status]}`}
        >
          {STATUS_LABEL[report.status]}
        </span>
      </div>

      {report.details && (
        <p className="text-[13px] text-[#4a4340] mb-3">
          Detalle del reporte: “{report.details}”
        </p>
      )}

      <div className="bg-[#fbf8f7] border border-[#f0ebe8] rounded-[14px] px-4 py-3 text-[14px] text-[#4a4340] mb-3">
        <ReportedContent report={report} />
      </div>

      {report.status === 'PENDING' ? (
        <>
          {report.otherPending > 0 && (
            <div className="mb-3 text-[13px] text-[#b7791f]">
              <button
                onClick={() => setShowRelated((v) => !v)}
                aria-expanded={showRelated}
                className="underline font-semibold"
              >
                {report.otherPending === 1
                  ? '1 reporte más sobre lo mismo'
                  : `${report.otherPending} reportes más sobre lo mismo`}
              </button>
              {showRelated && (
                <div className="mt-2">
                  <RelatedReports id={report.id} />
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => onResolve(report, 'DISMISS')}
              aria-label={`Desestimar reporte contra ${title}`}
              className={`${ACTION_BUTTON} border border-[#e3ddd9] text-[#4a4340] hover:border-[#d62828] hover:text-[#c42222]`}
            >
              <ShieldOff className="w-4 h-4" aria-hidden /> Desestimar
            </button>
            <button
              onClick={() => onResolve(report, 'DEACTIVATE_TARGET')}
              aria-label={`${sanctionLabel(report)}: reporte contra ${title}`}
              className={`${ACTION_BUTTON} bg-[#d62828] text-white hover:bg-[#7e1418]`}
            >
              <Gavel className="w-4 h-4" aria-hidden /> {sanctionLabel(report)}
            </button>
            {canDeactivateAuthor(report) && (
              <button
                onClick={() => onResolve(report, 'DEACTIVATE_AUTHOR')}
                aria-label={`Desactivar la cuenta de ${report.target.displayName}: reporte contra ${title}`}
                className={`${ACTION_BUTTON} bg-[#7e1418] text-white hover:bg-[#5c0e11]`}
              >
                <UserX className="w-4 h-4" aria-hidden /> Desactivar cuenta
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="text-[13px] text-[#6b625e] text-right">
          <p>
            Resuelto por {report.resolvedBy?.displayName ?? 'un administrador'}
            {report.resolvedAt &&
              ` · ${formatDateTime(Date.parse(report.resolvedAt))}`}
          </p>
          {report.resolutionNote && <p>Nota: {report.resolutionNote}</p>}
        </div>
      )}
    </li>
  );
}
