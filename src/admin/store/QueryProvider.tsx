/**
 * Caché de datos de la API con TanStack Query. El cliente se crea dentro del
 * componente (nada a nivel de módulo) y se vacía al cerrar sesión, para no
 * mostrarle a otra cuenta los datos de la anterior.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../lib/http';
import { useSession } from './SessionStore';

const MAX_RETRIES = 2;

/** Reintenta fallas de red o del servidor; nunca un 4xx (401 y 403 incluidos). */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < MAX_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  const { status } = useSession();

  useEffect(() => {
    if (status === 'anonymous') client.clear();
  }, [status, client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
