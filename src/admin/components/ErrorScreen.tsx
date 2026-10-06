/**
 * Pantalla de error (spec 0007). Componente puro: no usa el router, así sirve
 * dentro y fuera de él, y trae su propio contenedor porque reemplaza a
 * AdminLayout.
 */
interface ErrorScreenProps {
  variant: 'crash' | 'not-found';
  eventId?: string;
}

export function ErrorScreen({ variant, eventId }: ErrorScreenProps) {
  const title =
    variant === 'crash' ? 'Algo salió mal' : 'No encontramos esta página';
  const detail =
    variant === 'crash'
      ? 'Ocurrió un error inesperado. Puedes recargar la página o volver al inicio.'
      : 'La dirección no existe o ya no está disponible.';

  return (
    <main
      role="alert"
      className="min-h-screen w-full bg-[var(--brand-sand)] flex flex-col items-center justify-center gap-6 px-8 text-center"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-[26px] font-bold text-[var(--brand-ink)] leading-tight">
          {title}
        </h1>
        <p className="text-[var(--brand-muted)] text-[15px] leading-relaxed">
          {detail}
        </p>
        {variant === 'crash' && eventId && (
          <p className="font-mono text-[13px] text-[var(--brand-muted)]">
            Código del error: {eventId.slice(0, 8)}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-3 w-full max-w-[320px]">
        {variant === 'crash' && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full h-12 bg-[var(--brand-red)] text-white rounded-[16px] font-semibold text-[15px] hover:opacity-90 transition-opacity"
          >
            Recargar
          </button>
        )}
        <a
          href="/"
          className="w-full h-12 flex items-center justify-center rounded-[16px] font-semibold text-[15px] text-[var(--brand-red)] border border-[var(--brand-red)]"
        >
          Ir al inicio
        </a>
      </div>
    </main>
  );
}
