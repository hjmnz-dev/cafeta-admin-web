import { useState } from 'react';
import { isValidReason, REASON_MAX, REASON_MIN } from '../lib/users';
import { actionTitle, siblingsWarning, targetTitle } from '../lib/review';
import type { ResolveAction, ReviewReport } from '../lib/review-api';

/**
 * Confirmación al resolver un reporte (HU51, HU52). Sancionar (al objetivo o,
 * desde una publicación, a la cuenta de su autor) exige la nota que queda en la
 * bitácora; desestimar la deja opcional.
 */

function consequence(report: ReviewReport, action: ResolveAction): string {
  if (action === 'DISMISS') {
    return 'El reporte se cierra sin aplicar ninguna restricción. Quien lo envió podrá reportar de nuevo si hace falta.';
  }
  if (action === 'DEACTIVATE_AUTHOR') {
    return `La cuenta de ${report.target.displayName ?? 'su autor'} quedará desactivada: no podrá entrar y sus publicaciones dejarán de verse. También se cierran los reportes pendientes contra esa cuenta. La acción queda en la bitácora con tu nota.`;
  }
  return `${targetTitle(report)} quedará desactivado y su dueño no podrá usarlo. La acción queda en la bitácora con tu nota.`;
}
export function ReportResolveDialog({
  report,
  action,
  pending,
  onCancel,
  onConfirm,
}: {
  report: ReviewReport;
  action: ResolveAction;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  const sanction = action !== 'DISMISS';
  const title = actionTitle(report, action);
  const canSend = !pending && (!sanction || isValidReason(note));

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-resolve-title"
    >
      <div className="bg-white w-full max-w-[480px] p-6 rounded-[20px] shadow-2xl">
        <h2
          id="report-resolve-title"
          className="font-['Space_Grotesk',sans-serif] font-bold text-[18px] mb-2"
        >
          {title}
        </h2>
        <p className="text-[14px] text-[#8a807c] leading-relaxed mb-3">
          {consequence(report, action)}
        </p>
        {sanction && report.otherPending > 0 && (
          <p className="text-[13px] mb-3 px-3 py-2 rounded-[12px] bg-[#fdf3e2] text-[#b7791f]">
            {siblingsWarning(report.otherPending)}
          </p>
        )}
        <label
          htmlFor="report-resolve-note"
          className="block text-[13px] font-semibold mb-1.5"
        >
          {sanction ? 'Nota de la sanción' : 'Nota (opcional)'}
        </label>
        <textarea
          id="report-resolve-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={REASON_MAX}
          rows={3}
          placeholder={
            sanction ? `Entre ${REASON_MIN} y ${REASON_MAX} caracteres` : ''
          }
          className="w-full px-3.5 py-2.5 rounded-[14px] border border-[#e3ddd9] text-[14px] outline-none focus:border-[#d62828] resize-none mb-5"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={pending}
            className="px-4 py-2.5 rounded-full text-[14px] font-semibold text-[#8a807c] bg-[#f1ece9] hover:bg-[#e3ddd9] transition-colors disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(note.trim())}
            disabled={!canSend}
            className="px-4 py-2.5 rounded-full text-[14px] font-semibold text-white bg-[#d62828] hover:bg-[#7e1418] transition-colors disabled:opacity-50"
          >
            {pending ? 'Guardando…' : title}
          </button>
        </div>
      </div>
    </div>
  );
}
