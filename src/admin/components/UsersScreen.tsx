import { useMemo, useState } from 'react';
import { Search, UserX, UserCheck, BadgeCheck, BadgeX } from 'lucide-react';
import { useAdminState, AdminUser } from '../store/AdminState';
import { formatDate } from '../lib/format';

/**
 * HU47-HU50 — Listado de cuentas y acciones administrativas sobre ellas.
 *
 * El listado es el punto de partida de la gestión de cuentas, así que muestra
 * de un vistazo lo que decide una acción: estado, verificación y antigüedad.
 * Cada acción confirma antes de ejecutarse y explica en pantalla lo ocurrido,
 * incluido cuando no procedía (p. ej. reactivar una cuenta ya activa, HU49).
 */

type StatusFilter = 'all' | 'active' | 'inactive' | 'pending';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'inactive', label: 'Inactivas' },
  { value: 'pending', label: 'Verificación pendiente' },
];

function StatusPill({ user }: { user: AdminUser }) {
  const active = user.status === 'active';
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ' +
        (active ? 'bg-[#e8f3ec] text-[#2f7d4f]' : 'bg-[#f1ece9] text-[#8a807c]')
      }
    >
      <span className={'w-1.5 h-1.5 rounded-full ' + (active ? 'bg-[#2f7d4f]' : 'bg-[#8a807c]')} />
      {active ? 'Activa' : 'Inactiva'}
    </span>
  );
}

function VerificationPill({ user }: { user: AdminUser }) {
  const map = {
    verified: { label: 'Verificada', className: 'bg-[#ffe9e6] text-[#d62828]' },
    pending: { label: 'Pendiente', className: 'bg-[#fdf3e2] text-[#b7791f]' },
    rejected: { label: 'Rechazada', className: 'bg-[#f1ece9] text-[#8a807c]' },
  }[user.verification];

  return <span className={`inline-flex px-2.5 py-1 rounded-full text-[12px] font-semibold ${map.className}`}>{map.label}</span>;
}

export function UsersScreen() {
  const { users, deactivateAccount, reactivateAccount, verifyAccount, rejectVerification } = useAdminState();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [confirming, setConfirming] = useState<{ user: AdminUser; kind: 'deactivate' | 'reactivate' } | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQuery = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'pending' ? u.verification === 'pending' : u.status === filter);
      return matchesQuery && matchesFilter;
    });
  }, [users, query, filter]);

  /** Ejecuta la acción y traduce su resultado a un aviso en pantalla. */
  const run = (ok: boolean, okText: string, failText: string) =>
    setNotice(ok ? { tone: 'ok', text: okText } : { tone: 'warn', text: failText });

  return (
    <section className="max-w-[1180px]">
      <header className="mb-5">
        <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px]">Usuarios</h1>
        <p className="text-[14px] text-[#8a807c]">
          {users.length} cuentas registradas · gestión de estado y verificación institucional.
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

      {/* Búsqueda dentro del listado (HU47, escenario 2) */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#8a807c]" aria-hidden />
          <input
            type="search"
            aria-label="Buscar por nombre o correo"
            placeholder="Buscar por nombre o correo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-[14px] border border-[#e3ddd9] bg-white text-[14px] outline-none focus:border-[#d62828]"
          />
        </div>
        <div className="flex gap-2" role="group" aria-label="Filtrar cuentas">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={
                'px-3.5 py-2 rounded-full text-[13px] font-semibold border transition-colors ' +
                (filter === f.value
                  ? 'bg-[#d62828] text-white border-[#d62828]'
                  : 'bg-white text-[#4a4340] border-[#e3ddd9] hover:border-[#d62828]')
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#e3ddd9] rounded-[18px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <caption className="sr-only">Cuentas registradas en la plataforma</caption>
            <thead>
              <tr className="bg-[#fbf8f7] text-left text-[12px] uppercase tracking-wide text-[#8a807c]">
                <th scope="col" className="px-4 py-3 font-semibold">Cuenta</th>
                <th scope="col" className="px-4 py-3 font-semibold">Carrera</th>
                <th scope="col" className="px-4 py-3 font-semibold">Alta</th>
                <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                <th scope="col" className="px-4 py-3 font-semibold">Verificación</th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#8a807c]">
                    Ninguna cuenta coincide con la búsqueda.
                  </td>
                </tr>
              )}

              {results.map((u) => (
                <tr key={u.id} className="border-t border-[#f0ebe8] align-middle">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#171313]">{u.name}</p>
                    <p className="text-[13px] text-[#8a807c]">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[#4a4340]">{u.career}</td>
                  <td className="px-4 py-3 text-[#4a4340] whitespace-nowrap">{formatDate(u.joinedAt)}</td>
                  <td className="px-4 py-3"><StatusPill user={u} /></td>
                  <td className="px-4 py-3"><VerificationPill user={u} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2 flex-wrap">
                      {u.verification !== 'verified' && (
                        <button
                          onClick={() =>
                            run(
                              verifyAccount(u.id),
                              `Cuenta de ${u.name} verificada como institucional.`,
                              `No se pudo verificar la cuenta de ${u.name}.`,
                            )
                          }
                          aria-label={`Verificar cuenta de ${u.name}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold border border-[#e3ddd9] text-[#4a4340] hover:border-[#d62828] hover:text-[#d62828] transition-colors"
                        >
                          <BadgeCheck className="w-4 h-4" aria-hidden /> Verificar
                        </button>
                      )}
                      {u.verification === 'pending' && (
                        <button
                          onClick={() =>
                            run(
                              rejectVerification(u.id),
                              `Verificación de ${u.name} rechazada; la cuenta sigue sin verificar.`,
                              `No se pudo rechazar la verificación de ${u.name}.`,
                            )
                          }
                          aria-label={`Rechazar verificación de ${u.name}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold border border-[#e3ddd9] text-[#4a4340] hover:border-[#d62828] hover:text-[#d62828] transition-colors"
                        >
                          <BadgeX className="w-4 h-4" aria-hidden /> Rechazar
                        </button>
                      )}
                      {u.status === 'active' ? (
                        <button
                          onClick={() => setConfirming({ user: u, kind: 'deactivate' })}
                          aria-label={`Desactivar cuenta de ${u.name}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold bg-[#d62828] text-white hover:bg-[#7e1418] transition-colors"
                        >
                          <UserX className="w-4 h-4" aria-hidden /> Desactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirming({ user: u, kind: 'reactivate' })}
                          aria-label={`Reactivar cuenta de ${u.name}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold border-2 border-[#d62828] text-[#d62828] hover:bg-[#ffe9e6] transition-colors"
                        >
                          <UserCheck className="w-4 h-4" aria-hidden /> Reactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmación: una sanción sobre una cuenta no se aplica de un clic */}
      {confirming && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6" role="dialog" aria-modal="true">
          <div className="bg-white w-full max-w-[420px] p-6 rounded-[20px] shadow-2xl">
            <h2 className="font-['Space_Grotesk',sans-serif] font-bold text-[18px] mb-2">
              {confirming.kind === 'deactivate' ? 'Desactivar cuenta' : 'Reactivar cuenta'}
            </h2>
            <p className="text-[14px] text-[#8a807c] leading-relaxed mb-5">
              {confirming.kind === 'deactivate'
                ? `${confirming.user.name} perderá el acceso a la plataforma. Su registro se conserva para auditoría y la acción queda en la bitácora.`
                : `${confirming.user.name} recuperará el acceso a la plataforma. La acción queda en la bitácora.`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirming(null)}
                className="px-4 py-2.5 rounded-full text-[14px] font-semibold text-[#8a807c] bg-[#f1ece9] hover:bg-[#e3ddd9] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const { user, kind } = confirming;
                  if (kind === 'deactivate') {
                    run(
                      deactivateAccount(user.id),
                      `Cuenta de ${user.name} desactivada.`,
                      `La cuenta de ${user.name} ya se encontraba inactiva.`,
                    );
                  } else {
                    run(
                      reactivateAccount(user.id),
                      `Cuenta de ${user.name} reactivada.`,
                      `La cuenta de ${user.name} ya se encuentra activa.`,
                    );
                  }
                  setConfirming(null);
                }}
                className="px-4 py-2.5 rounded-full text-[14px] font-semibold text-white bg-[#d62828] hover:bg-[#7e1418] transition-colors"
              >
                {confirming.kind === 'deactivate' ? 'Desactivar cuenta' : 'Reactivar cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
