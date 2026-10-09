import { useState } from 'react';
import {
  isValidReason,
  REASON_MAX,
  REASON_MIN,
  type UserActionKind,
} from '../lib/users';
import type { AdminUserView } from '../lib/users-api';

const COPY: Record<
  UserActionKind,
  { title: string; body: (name: string) => string }
> = {
  deactivate: {
    title: 'Desactivar cuenta',
    body: (name) =>
      `${name} perderá el acceso a la plataforma y sus sesiones se cerrarán. Su historial se conserva y la acción queda en la bitácora con el motivo.`,
  },
  reactivate: {
    title: 'Reactivar cuenta',
    body: (name) =>
      `${name} recuperará el acceso con su historial. Tendrá que iniciar sesión de nuevo y la acción queda en la bitácora con el motivo.`,
  },
};

/**
 * Confirmación de una sanción: no se aplica de un clic y pide el motivo que
 * queda en la bitácora (HU48, HU49).
 */
export function UserActionDialog({
  user,
  kind,
  pending,
  onCancel,
  onConfirm,
}: {
  user: AdminUserView;
  kind: UserActionKind;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const { title, body } = COPY[kind];
  const name = user.displayName;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-action-title"
    >
      <div className="bg-white w-full max-w-[460px] p-6 rounded-[20px] shadow-2xl">
        <h2
          id="user-action-title"
          className="font-['Space_Grotesk',sans-serif] font-bold text-[18px] mb-2"
        >
          {title}
        </h2>
        <p className="text-[14px] text-[#8a807c] leading-relaxed mb-4">
          {body(name)}
        </p>
        <label
          htmlFor="user-action-reason"
          className="block text-[13px] font-semibold mb-1.5"
        >
          Motivo
        </label>
        <textarea
          id="user-action-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={REASON_MAX}
          rows={3}
          placeholder={`Entre ${REASON_MIN} y ${REASON_MAX} caracteres`}
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
            onClick={() => onConfirm(reason.trim())}
            disabled={pending || !isValidReason(reason)}
            className="px-4 py-2.5 rounded-full text-[14px] font-semibold text-white bg-[#d62828] hover:bg-[#7e1418] transition-colors disabled:opacity-50"
          >
            {pending ? 'Guardando…' : title}
          </button>
        </div>
      </div>
    </div>
  );
}
