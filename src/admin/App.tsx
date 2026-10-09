import * as Sentry from '@sentry/react';
import { RouterProvider } from 'react-router';
import { ErrorScreen } from './components/ErrorScreen';
import { router } from './routes';
import { LoginScreen } from './components/LoginScreen';
import { QueryProvider } from './store/QueryProvider';
import { SessionProvider, useSession } from './store/SessionStore';

// Errores fuera del router (providers): la misma pantalla, con el código del
// evento solo si el monitoreo está activo (spec 0007).
function CrashFallback({ eventId }: { eventId: string }) {
  return (
    <ErrorScreen
      variant="crash"
      eventId={Sentry.getClient() ? eventId : undefined}
    />
  );
}

// Sin sesión de administrador no se dibuja ninguna pantalla de la consola.
function Console() {
  const { status, user } = useSession();

  if (status === 'loading') {
    return (
      <div
        role="status"
        className="min-h-screen flex items-center justify-center bg-[#efebe8] text-[14px] text-[#8a807c]"
      >
        Cargando…
      </div>
    );
  }
  if (!user) return <LoginScreen />;
  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ eventId }) => <CrashFallback eventId={eventId} />}
    >
      <SessionProvider>
        <QueryProvider>
          <Console />
        </QueryProvider>
      </SessionProvider>
    </Sentry.ErrorBoundary>
  );
}
