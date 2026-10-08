import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { authApi } from '../lib/auth-api';
import { ApiError } from '../lib/http';
import { SessionProvider } from '../store/SessionStore';
import { LoginScreen } from './LoginScreen';

vi.mock('../lib/auth-api', () => ({
  authApi: { login: vi.fn(), logout: vi.fn(), me: vi.fn() },
}));

const login = vi.mocked(authApi.login);

async function submit(email: string) {
  const user = userEvent.setup();
  render(
    <SessionProvider>
      <LoginScreen />
    </SessionProvider>,
  );
  await user.type(screen.getByLabelText('Correo'), email);
  await user.type(screen.getByLabelText('Contraseña'), 'clave-larga-2026');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('HU43, escenario 2 — acceso denegado a quien no es administrador', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.mocked(authApi.logout).mockResolvedValue(undefined);
  });

  it('una cuenta de estudiante ve "No tienes acceso a la consola"', async () => {
    login.mockResolvedValue({
      accessToken: 't',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: {
        id: 'u2',
        email: 'e@est.intec.edu.do',
        role: 'STUDENT',
        verificationStatus: 'VERIFIED',
        createdAt: new Date().toISOString(),
        profile: { careerId: null, handle: 'e', displayName: 'Estudiante' },
      },
    });

    await submit('e@est.intec.edu.do');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tienes acceso a la consola.',
    );
  });

  it('credenciales malas muestran el mensaje traducido, no el crudo de la API', async () => {
    login.mockRejectedValue(
      new ApiError(
        401,
        'INVALID_CREDENTIALS',
        'Correo o contraseña incorrectos.',
      ),
    );

    await submit('a@intec.edu.do');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Correo o contraseña incorrectos.',
    );
  });
});
