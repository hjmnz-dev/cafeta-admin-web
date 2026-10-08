import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { authApi, type AuthResponse } from '../lib/auth-api';
import { readStoredSession } from '../lib/http';
import { SessionProvider, useSession } from './SessionStore';

vi.mock('../lib/auth-api', () => ({
  authApi: { login: vi.fn(), logout: vi.fn(), me: vi.fn() },
}));

const login = vi.mocked(authApi.login);
const logout = vi.mocked(authApi.logout);

const response = (role: 'ADMIN' | 'STUDENT'): AuthResponse => ({
  accessToken: 'token-de-prueba',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: {
    id: 'u1',
    email: 'persona@intec.edu.do',
    role,
    verificationStatus: 'VERIFIED',
    createdAt: new Date().toISOString(),
    profile: { careerId: null, handle: 'persona', displayName: 'Persona' },
  },
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

describe('SessionStore (HU43: solo entra un administrador)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    logout.mockResolvedValue(undefined);
  });

  it('un administrador queda autenticado y su sesión se guarda en la pestaña', async () => {
    login.mockResolvedValue(response('ADMIN'));
    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current.status).toBe('anonymous');

    await act(() => result.current.login('a@intec.edu.do', 'clave-larga-2026'));

    expect(result.current.status).toBe('authenticated');
    expect(result.current.user?.role).toBe('ADMIN');
    expect(readStoredSession()?.accessToken).toBe('token-de-prueba');
  });

  it('un estudiante recibe FORBIDDEN, la sesión se cierra y no queda nada guardado', async () => {
    login.mockResolvedValue(response('STUDENT'));
    const { result } = renderHook(() => useSession(), { wrapper });

    let failure: unknown;
    await act(async () => {
      try {
        await result.current.login('e@est.intec.edu.do', 'clave-larga-2026');
      } catch (error) {
        failure = error;
      }
    });

    expect(failure).toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      userMessage: 'No tienes acceso a la consola.',
    });
    expect(logout).toHaveBeenCalledOnce();
    expect(result.current.status).toBe('anonymous');
    expect(readStoredSession()).toBeNull();
  });

  it('cerrar sesión borra la sesión local aunque la API falle', async () => {
    login.mockResolvedValue(response('ADMIN'));
    logout.mockRejectedValue(new Error('sin red'));
    const { result } = renderHook(() => useSession(), { wrapper });
    await act(() => result.current.login('a@intec.edu.do', 'clave-larga-2026'));

    await act(() => result.current.logout());

    await waitFor(() => expect(result.current.status).toBe('anonymous'));
    expect(readStoredSession()).toBeNull();
  });
});
