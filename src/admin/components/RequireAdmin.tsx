import { useEffect, useRef, type ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAdminState } from '../store/AdminState';

/**
 * HU43 (escenario 2) · HU48 (escenario 2) — Control de acceso.
 *
 * Sin permisos administrativos no se muestra la sección, y el intento se anota
 * en la bitácora (HU46, escenario 2): un acceso denegado que no deja rastro no
 * sirve para investigar nada después.
 */
export function RequireAdmin({
  section,
  children,
}: {
  section: string;
  children: ReactNode;
}) {
  const { isAdmin, logAccessDenied } = useAdminState();
  const logged = useRef(false);

  useEffect(() => {
    // Una sola anotación por visita denegada, no una por repintado.
    if (!isAdmin && !logged.current) {
      logged.current = true;
      logAccessDenied(section);
    }
    if (isAdmin) logged.current = false;
  }, [isAdmin, section, logAccessDenied]);

  if (isAdmin) return <>{children}</>;

  return (
    <div className="max-w-[560px] mx-auto mt-16 bg-white border border-[#e3ddd9] rounded-[20px] p-8 text-center">
      <ShieldAlert
        className="w-10 h-10 text-[#d62828] mx-auto mb-3"
        aria-hidden
      />
      <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[20px] mb-2">
        Acceso denegado
      </h1>
      <p className="text-[15px] text-[#8a807c] leading-relaxed">
        Tu cuenta no tiene permisos administrativos para ver{' '}
        <strong className="text-[#4a4340]">{section}</strong>. El intento quedó
        registrado en la bitácora de auditoría.
      </p>
    </div>
  );
}
