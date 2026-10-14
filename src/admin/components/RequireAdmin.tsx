import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useSession } from '../store/SessionStore';

/**
 * HU43 (escenario 2) · HU48 (escenario 2) — Control de acceso.
 *
 * La consola ya solo abre con una sesión de administrador, y la API rechaza
 * con 403 (y lo audita como access.denied) cualquier ruta /admin de otra
 * cuenta. Esto es la segunda barrera, por sección: si la sesión no es de
 * admin, no se muestra nada.
 */
export function RequireAdmin({
  section,
  children,
}: {
  section: string;
  children: ReactNode;
}) {
  const { user } = useSession();

  if (user?.role === 'ADMIN') return <>{children}</>;

  return (
    <div className="max-w-[560px] mx-auto mt-16 bg-white border border-[#e3ddd9] rounded-[20px] p-8 text-center">
      <ShieldAlert
        className="w-10 h-10 text-[#c42222] mx-auto mb-3"
        aria-hidden
      />
      <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[20px] mb-2">
        Acceso denegado
      </h1>
      <p className="text-[15px] text-[#6b625e] leading-relaxed">
        Tu cuenta no tiene permisos administrativos para ver{' '}
        <strong className="text-[#4a4340]">{section}</strong>.
      </p>
    </div>
  );
}
