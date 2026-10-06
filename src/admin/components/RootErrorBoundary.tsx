/**
 * Error de la ruta raíz (spec 0007): reemplaza la pantalla por defecto de
 * React Router. Un 404 muestra "No encontramos esta página" sin reportar;
 * cualquier otro error se reporta y muestra su código cuando llega.
 */
import { useEffect, useState } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { reportError } from '../lib/monitoring';
import { ErrorScreen } from './ErrorScreen';

export function RootErrorBoundary() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const [eventId, setEventId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!notFound) setEventId(reportError(error));
  }, [error, notFound]);

  return notFound ? (
    <ErrorScreen variant="not-found" />
  ) : (
    <ErrorScreen variant="crash" eventId={eventId} />
  );
}

/** Ruta oculta /__prueba-error (AC-11): falla al dibujarse. */
export function ThrowOnRender(): never {
  throw new Error('Prueba de monitoreo forzada desde la ruta oculta');
}
