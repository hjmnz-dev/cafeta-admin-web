/**
 * Sesión real de la consola contra la API (spec 0008, decisión 31).
 *
 * Solo entra un administrador: el login de una cuenta de estudiante se
 * rechaza con FORBIDDEN ("No tienes acceso a la consola") y se cierra la
 * sesión que la API acababa de abrir. La sesión se valida con GET /auth/me al
 * cargar y termina cuando el cliente HTTP avisa de un 401.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi, type CurrentUser } from '../lib/auth-api';
import { messageForCode } from '../lib/error-messages';
import {
  ApiError,
  clearStoredSession,
  readStoredSession,
  SESSION_ENDED_EVENT,
  writeStoredSession,
} from '../lib/http';

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated';

interface SessionValue {
  status: SessionStatus;
  user: CurrentUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

type SessionState =
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: CurrentUser };

const ANONYMOUS: SessionState = { status: 'anonymous', user: null };

const SessionContext = createContext<SessionValue | null>(null);

/** Cierra la sesión que se acaba de abrir: nunca falla para quien la usa. */
async function endSession(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    /* la salida local basta: el token vence solo */
  } finally {
    clearStoredSession();
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(() =>
    readStoredSession() ? { status: 'loading', user: null } : ANONYMOUS,
  );

  // Al cargar con una sesión guardada, se confirma con la API y con el rol.
  useEffect(() => {
    if (state.status !== 'loading') return;
    let active = true;
    authApi
      .me()
      .then((user) => {
        if (!active) return;
        if (user.role === 'ADMIN') setState({ status: 'authenticated', user });
        else void endSession().then(() => active && setState(ANONYMOUS));
      })
      .catch(() => active && setState(ANONYMOUS));
    return () => {
      active = false;
    };
    // Solo al montar: después el estado lo cambian login y logout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cualquier 401 del cliente HTTP termina la sesión en toda la consola.
  useEffect(() => {
    const onEnded = () => setState(ANONYMOUS);
    window.addEventListener(SESSION_ENDED_EVENT, onEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onEnded);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    writeStoredSession({
      accessToken: res.accessToken,
      expiresAt: res.expiresAt,
    });
    if (res.user.role !== 'ADMIN') {
      await endSession();
      throw new ApiError(403, 'FORBIDDEN', messageForCode('FORBIDDEN'));
    }
    setState({ status: 'authenticated', user: res.user });
  }, []);

  const logout = useCallback(async () => {
    await endSession();
    setState(ANONYMOUS);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ status: state.status, user: state.user, login, logout }),
    [state, login, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value)
    throw new Error('useSession debe usarse dentro de SessionProvider');
  return value;
}
