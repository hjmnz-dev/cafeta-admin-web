import { useState } from 'react';
import { Flag, FileText, User, Gavel, ShieldOff } from 'lucide-react';
import { useAdminState, AdminReport } from '../store/AdminState';
import { formatDateTime } from '../lib/format';

/**
 * HU51/HU52 — Revisión de los reportes levantados por la comunidad.
 *
 * Cada reporte se muestra con el contenido o la cuenta denunciada a la vista:
 * decidir una sanción sin ver lo denunciado sería firmar a ciegas. Sancionar
 * aplica la restricción que corresponde al objetivo y cierra el reporte; ambas
 * resoluciones quedan en la bitácora.
 */

type Tab = 'pending' | 'resolved';

const STATUS_LABEL: Record<AdminReport['status'], string> = {
  pending: 'Pendiente',
  sanctioned: 'Sancionado',
  dismissed: 'Desestimado',
};

export function ReportsReviewScreen() {
  const { reports, users, posts, sanctionReport, dismissReport } =
    useAdminState();
  const [tab, setTab] = useState<Tab>('pending');
  const [notice, setNotice] = useState<string | null>(null);

  const pending = reports.filter((r) => r.status === 'pending');
  const resolved = reports.filter((r) => r.status !== 'pending');
  const shown = tab === 'pending' ? pending : resolved;

  const targetUser = (r: AdminReport) => users.find((u) => u.id === r.targetId);
  const targetPost = (r: AdminReport) => posts.find((p) => p.id === r.targetId);

  const nameOf = (r: AdminReport) =>
    r.targetType === 'user'
      ? (targetUser(r)?.name ?? r.targetId)
      : `Publicación ${r.targetId}`;

  return (
    <section className="max-w-[1000px]">
      <header className="mb-5">
        <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px]">
          Reportes de la comunidad
        </h1>
        <p className="text-[14px] text-[#8a807c]">
          Denuncias enviadas por estudiantes desde la app. Sancionar aplica la
          restricción y cierra el reporte.
        </p>
      </header>

      {notice && (
        <p
          role="status"
          className="mb-4 px-4 py-3 rounded-[14px] text-[14px] bg-[#e8f3ec] border border-[#c9e2d3] text-[#2f7d4f]"
        >
          {notice}
        </p>
      )}

      <div className="flex gap-2 mb-4" role="tablist">
        {(
          [
            ['pending', 'Pendientes', pending.length],
            ['resolved', 'Resueltos', resolved.length],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={
              'px-4 py-2 rounded-full text-[13px] font-semibold border transition-colors ' +
              (tab === value
                ? 'bg-[#d62828] text-white border-[#d62828]'
                : 'bg-white text-[#4a4340] border-[#e3ddd9] hover:border-[#d62828]')
            }
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bg-white border border-[#e3ddd9] rounded-[18px] p-10 text-center">
          <Flag className="w-8 h-8 text-[#8a807c] mx-auto mb-2" aria-hidden />
          <p className="text-[15px] text-[#4a4340] font-semibold">
            {tab === 'pending'
              ? 'No hay reportes pendientes'
              : 'Todavía no hay reportes resueltos'}
          </p>
          <p className="text-[13px] text-[#8a807c] mt-1">
            {tab === 'pending'
              ? 'Cuando la comunidad denuncie una cuenta o publicación, aparecerá aquí.'
              : 'Las resoluciones que tomes quedarán listadas en esta pestaña.'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {shown.map((r) => {
            const user = r.targetType === 'user' ? targetUser(r) : undefined;
            const post = r.targetType === 'post' ? targetPost(r) : undefined;

            return (
              <li
                key={r.id}
                className="bg-white border border-[#e3ddd9] rounded-[18px] p-5"
                data-testid={`report-${r.id}`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-[12px] bg-[#ffe9e6] text-[#d62828] flex items-center justify-center flex-none">
                      {r.targetType === 'user' ? (
                        <User className="w-[18px] h-[18px]" aria-hidden />
                      ) : (
                        <FileText className="w-[18px] h-[18px]" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-[15px] text-[#171313]">
                        {nameOf(r)}
                      </p>
                      <p className="text-[13px] text-[#8a807c]">
                        {r.reason} · reportado por {r.reportedBy} ·{' '}
                        {formatDateTime(r.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={
                      'px-2.5 py-1 rounded-full text-[12px] font-semibold flex-none ' +
                      (r.status === 'pending'
                        ? 'bg-[#fdf3e2] text-[#b7791f]'
                        : r.status === 'sanctioned'
                          ? 'bg-[#ffe9e6] text-[#d62828]'
                          : 'bg-[#f1ece9] text-[#8a807c]')
                    }
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>

                {/* Lo denunciado, a la vista */}
                <div className="bg-[#fbf8f7] border border-[#f0ebe8] rounded-[14px] px-4 py-3 text-[14px] text-[#4a4340] mb-3">
                  {post && (
                    <p>
                      “{post.content}”
                      {!post.active && (
                        <em className="text-[#8a807c]">
                          {' '}
                          · publicación desactivada
                        </em>
                      )}
                    </p>
                  )}
                  {user && (
                    <p>
                      {user.email} · {user.career} · {user.posts} publicaciones
                      {user.status === 'inactive' && (
                        <em className="text-[#8a807c]"> · cuenta inactiva</em>
                      )}
                    </p>
                  )}
                  {!post && !user && (
                    <p className="text-[#8a807c]">
                      El contenido denunciado ya no está disponible.
                    </p>
                  )}
                </div>

                {r.status === 'pending' ? (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        dismissReport(r.id);
                        setNotice(
                          `Reporte contra ${nameOf(r)} desestimado: se cerró sin aplicar restricciones.`,
                        );
                      }}
                      aria-label={`Desestimar reporte contra ${nameOf(r)}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold border border-[#e3ddd9] text-[#4a4340] hover:border-[#d62828] hover:text-[#d62828] transition-colors"
                    >
                      <ShieldOff className="w-4 h-4" aria-hidden /> Desestimar
                    </button>
                    <button
                      onClick={() => {
                        sanctionReport(r.id);
                        setNotice(
                          r.targetType === 'user'
                            ? `Reporte resuelto con sanción: la cuenta de ${nameOf(r)} quedó desactivada.`
                            : `Reporte resuelto con sanción: la ${nameOf(r).toLowerCase()} quedó desactivada.`,
                        );
                      }}
                      aria-label={`Sancionar reporte contra ${nameOf(r)}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-[#d62828] text-white hover:bg-[#7e1418] transition-colors"
                    >
                      <Gavel className="w-4 h-4" aria-hidden />
                      {r.targetType === 'user'
                        ? 'Sancionar y desactivar cuenta'
                        : 'Sancionar y desactivar publicación'}
                    </button>
                  </div>
                ) : (
                  <p className="text-[13px] text-[#8a807c] text-right">
                    Resuelto por {r.resolvedBy} ·{' '}
                    {r.resolvedAt ? formatDateTime(r.resolvedAt) : ''}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
