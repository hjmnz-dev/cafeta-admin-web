import type { AdminUserView } from '../lib/users-api';

export function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ' +
        (active ? 'bg-[#e8f3ec] text-[#2f7d4f]' : 'bg-[#f1ece9] text-[#6b625e]')
      }
    >
      <span
        className={
          'w-1.5 h-1.5 rounded-full ' +
          (active ? 'bg-[#2f7d4f]' : 'bg-[#6b625e]')
        }
      />
      {active ? 'Activa' : 'Inactiva'}
    </span>
  );
}

const VERIFICATION: Record<
  AdminUserView['verificationStatus'],
  { label: string; className: string }
> = {
  VERIFIED: { label: 'Verificada', className: 'bg-[#ffe9e6] text-[#c42222]' },
  PENDING: { label: 'Pendiente', className: 'bg-[#fdf3e2] text-[#b7791f]' },
  REJECTED: { label: 'Rechazada', className: 'bg-[#f1ece9] text-[#6b625e]' },
};

export function VerificationPill({
  status,
}: {
  status: AdminUserView['verificationStatus'];
}) {
  const { label, className } = VERIFICATION[status];
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-[12px] font-semibold ${className}`}
    >
      {label}
    </span>
  );
}
