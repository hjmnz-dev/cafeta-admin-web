/** Llamadas de sesión. Los tipos salen del contrato OpenAPI (api-types.ts). */
import type { components } from './api-types';
import { apiRequest } from './http';

type Schemas = components['schemas'];
export type AuthResponse = Schemas['AuthResponseDto'];
export type CurrentUser = Schemas['CurrentUserDto'];

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password, remember: false },
    }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
  me: () => apiRequest<CurrentUser>('/auth/me'),
};
