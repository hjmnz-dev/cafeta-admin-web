import * as Sentry from '@sentry/react';
import { RouterProvider } from 'react-router';
import { ErrorScreen } from './components/ErrorScreen';
import { router } from './routes';
import { AdminStateProvider } from './store/AdminState';

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

export default function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ eventId }) => <CrashFallback eventId={eventId} />}
    >
      <AdminStateProvider>
        <RouterProvider router={router} />
      </AdminStateProvider>
    </Sentry.ErrorBoundary>
  );
}
