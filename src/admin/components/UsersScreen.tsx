import { useState } from 'react';
import { Search, UserX, UserCheck, BadgeCheck, BadgeX } from 'lucide-react';
import { userMessageOf } from '../lib/http';
import { formatDate } from '../lib/format';
import { hasActions, userActions, type UserActionKind } from '../lib/users';
import {
  NO_FILTERS,
  type AdminUserView,
  type UserFilters,
  type VerificationDecision,
} from '../lib/users-api';
import { useSession } from '../store/SessionStore';
import { useDebouncedValue } from '../store/useDebouncedValue';
import {
  useAdminUsers,
  useDeactivateUser,
  useDecideVerification,
  useReactivateUser,
} from '../store/users-queries';
import { StatusPill, VerificationPill } from './UserPills';
import { UserActionDialog } from './UserActionDialog';

/**
 * HU47-HU50 — Listado de cuentas y acciones administrativas sobre ellas.
 *
 * Los datos son los reales de la API. El listado muestra de un vistazo lo que
 * decide una acción: estado, verificación y antigüedad. Desactivar y reactivar
 * confirman y piden el motivo; verificar o rechazar se decide una sola vez por
 * cuenta. Cuando una acción no procedía (p. ej. reactivar una cuenta ya
 * activa, HU49) la pantalla lo explica y la fila se corrige sola.
 */

type Chip = 'all' | 'active' | 'inactive' | 'pending';

const CHIPS: { value: Chip; label: string; filters: Partial<UserFilters> }[] = [
  { value: 'all', label: 'Todas', filters: {} },
  { value: 'active', label: 'Activas', filters: { status: 'active' } },
  { value: 'inactive', label: 'Inactivas', filters: { status: 'inactive' } },
  {
    value: 'pending',
    label: 'Verificación pendiente',
    filters: { verification: 'PENDING' },
  },
];

const SEARCH_DELAY_MS = 300;

type Notice = { tone: 'ok' | 'warn'; text: string };

const ACTION_BUTTON =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold border border-[#e3ddd9] text-[#4a4340] hover:border-[#d62828] hover:text-[#c42222] transition-colors disabled:opacity-50';

export function UsersScreen() {
  const { user: session } = useSession();
  const selfId = session?.id ?? null;

  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<Chip>('all');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirming, setConfirming] = useState<{
    user: AdminUserView;
    kind: UserActionKind;
  } | null>(null);

  const search = useDebouncedValue(query, SEARCH_DELAY_MS);
  const filters: UserFilters = {
    ...NO_FILTERS,
    search,
    ...CHIPS.find((c) => c.value === chip)?.filters,
  };

  const users = useAdminUsers(filters);
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const decide = useDecideVerification();

  const rows = users.data?.pages.flatMap((page) => page.items) ?? [];

  const report = (text: string) => setNotice({ tone: 'ok', text });
  const fail = (error: unknown) =>
    setNotice({ tone: 'warn', text: userMessageOf(error) });

  const confirmAction = (reason: string) => {
    if (!confirming) return;
    const { user, kind } = confirming;
    const mutation = kind === 'deactivate' ? deactivate : reactivate;
    mutation.mutate(
      { id: user.id, reason },
      {
        onSuccess: () =>
          report(
            kind === 'deactivate'
              ? `Cuenta de ${user.displayName} desactivada.`
              : `Cuenta de ${user.displayName} reactivada.`,
          ),
        onError: fail,
        onSettled: () => setConfirming(null),
      },
    );
  };

  const decideVerification = (
    user: AdminUserView,
    decision: VerificationDecision,
  ) =>
    decide.mutate(
      { id: user.id, decision },
      {
        onSuccess: () =>
          report(
            decision === 'VERIFIED'
              ? `Cuenta de ${user.displayName} verificada como institucional.`
              : `Verificación de ${user.displayName} rechazada; la cuenta sigue sin verificar.`,
          ),
        onError: fail,
      },
    );

  return (
    <section className="max-w-[1180px]">
      <header className="mb-5">
        <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px]">
          Usuarios
        </h1>
        <p className="text-[14px] text-[#6b625e]">
          Gestión de estado y verificación institucional.
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

      {/* Búsqueda y filtros del listado (HU47, escenario 2) */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#6b625e]"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Buscar por nombre, usuario o correo"
            placeholder="Buscar por nombre, usuario o correo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-[14px] border border-[#e3ddd9] bg-white text-[14px] outline-none focus:border-[#d62828]"
          />
        </div>
        <div className="flex gap-2" role="group" aria-label="Filtrar cuentas">
          {CHIPS.map((c) => (
            <button
              key={c.value}
              onClick={() => setChip(c.value)}
              aria-pressed={chip === c.value}
              className={
                'px-3.5 py-2 rounded-full text-[13px] font-semibold border transition-colors ' +
                (chip === c.value
                  ? 'bg-[#d62828] text-white border-[#d62828]'
                  : 'bg-white text-[#4a4340] border-[#e3ddd9] hover:border-[#d62828]')
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {users.isError && (
        <p
          role="alert"
          className="mb-4 px-4 py-3 rounded-[14px] text-[14px] border bg-[#fdf3e2] border-[#efdcb8] text-[#b7791f]"
        >
          {userMessageOf(users.error)}{' '}
          <button
            className="underline font-semibold"
            onClick={() => users.refetch()}
          >
            Reintentar
          </button>
        </p>
      )}

      <div className="bg-white border border-[#e3ddd9] rounded-[18px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <caption className="sr-only">
              Cuentas registradas en la plataforma
            </caption>
            <thead>
              <tr className="bg-[#fbf8f7] text-left text-[12px] uppercase tracking-wide text-[#6b625e]">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Cuenta
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Carrera
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Alta
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Verificación
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {users.isPending && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-[#6b625e]"
                  >
                    Cargando cuentas…
                  </td>
                </tr>
              )}
              {users.isSuccess && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-[#6b625e]"
                  >
                    Ninguna cuenta coincide con la búsqueda.
                  </td>
                </tr>
              )}

              {rows.map((u) => {
                const actions = userActions(u, selfId);
                return (
                  <tr
                    key={u.id}
                    className="border-t border-[#f0ebe8] align-middle"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#171313]">
                        {u.displayName}
                        {u.role === 'ADMIN' && (
                          <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-[#6b625e]">
                            Admin
                          </span>
                        )}
                      </p>
                      <p className="text-[13px] text-[#6b625e]">
                        @{u.handle} · {u.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#4a4340]">
                      {u.career ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[#4a4340] whitespace-nowrap">
                      {formatDate(Date.parse(u.createdAt))}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill active={u.active} />
                    </td>
                    <td className="px-4 py-3">
                      <VerificationPill status={u.verificationStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 flex-wrap">
                        {!hasActions(actions) && (
                          <span className="text-[13px] text-[#6b625e]">—</span>
                        )}
                        {actions.decide && (
                          <>
                            <button
                              onClick={() => decideVerification(u, 'VERIFIED')}
                              disabled={decide.isPending}
                              aria-label={`Verificar cuenta de ${u.displayName}`}
                              className={ACTION_BUTTON}
                            >
                              <BadgeCheck className="w-4 h-4" aria-hidden />{' '}
                              Verificar
                            </button>
                            <button
                              onClick={() => decideVerification(u, 'REJECTED')}
                              disabled={decide.isPending}
                              aria-label={`Rechazar verificación de ${u.displayName}`}
                              className={ACTION_BUTTON}
                            >
                              <BadgeX className="w-4 h-4" aria-hidden />{' '}
                              Rechazar
                            </button>
                          </>
                        )}
                        {actions.deactivate && (
                          <button
                            onClick={() =>
                              setConfirming({ user: u, kind: 'deactivate' })
                            }
                            aria-label={`Desactivar cuenta de ${u.displayName}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold bg-[#d62828] text-white hover:bg-[#7e1418] transition-colors"
                          >
                            <UserX className="w-4 h-4" aria-hidden /> Desactivar
                          </button>
                        )}
                        {actions.reactivate && (
                          <button
                            onClick={() =>
                              setConfirming({ user: u, kind: 'reactivate' })
                            }
                            aria-label={`Reactivar cuenta de ${u.displayName}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold border-2 border-[#d62828] text-[#c42222] hover:bg-[#ffe9e6] transition-colors"
                          >
                            <UserCheck className="w-4 h-4" aria-hidden />{' '}
                            Reactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {users.hasNextPage && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => users.fetchNextPage()}
            disabled={users.isFetchingNextPage}
            className={ACTION_BUTTON}
          >
            {users.isFetchingNextPage ? 'Cargando…' : 'Ver más cuentas'}
          </button>
        </div>
      )}

      {confirming && (
        <UserActionDialog
          user={confirming.user}
          kind={confirming.kind}
          pending={deactivate.isPending || reactivate.isPending}
          onCancel={() => setConfirming(null)}
          onConfirm={confirmAction}
        />
      )}
    </section>
  );
}
