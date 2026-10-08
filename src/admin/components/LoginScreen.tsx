import { useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { userMessageOf } from '../lib/http';
import { useSession } from '../store/SessionStore';

/**
 * Entrada a la consola (HU43). Solo pasa una cuenta de administrador: si la
 * API acepta la clave pero la cuenta es de estudiante, el aviso es "No tienes
 * acceso a la consola" y la sesión se cierra.
 */
export function LoginScreen() {
  const { login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(userMessageOf(err));
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#efebe8] p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-[400px] bg-white border border-[#e3ddd9] rounded-[20px] p-8"
      >
        <div className="flex items-center gap-2 mb-6">
          <span className="w-8 h-8 rounded-[10px] bg-[#d62828] text-white flex items-center justify-center font-bold">
            c
          </span>
          <div className="leading-tight">
            <p className="font-['Space_Grotesk',sans-serif] font-bold text-[17px] lowercase tracking-[-0.03em]">
              cafeta
            </p>
            <p className="text-[11px] text-[#8a807c] uppercase tracking-[0.14em] font-['IBM_Plex_Mono',monospace]">
              Consola admin
            </p>
          </div>
        </div>

        <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[22px] mb-1">
          Iniciar sesión
        </h1>
        <p className="text-[14px] text-[#8a807c] mb-5">
          Solo para cuentas de administración.
        </p>

        <label
          className="block text-[13px] text-[#4a4340] mb-1"
          htmlFor="email"
        >
          Correo
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-[12px] border border-[#e3ddd9] px-3 py-2.5 text-[15px] outline-none focus:border-[#d62828] mb-4"
        />

        <label
          className="block text-[13px] text-[#4a4340] mb-1"
          htmlFor="password"
        >
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-[12px] border border-[#e3ddd9] px-3 py-2.5 text-[15px] outline-none focus:border-[#d62828] mb-4"
        />

        {error && (
          <p
            role="alert"
            className="text-[14px] text-[#d62828] bg-[#ffe9e6] rounded-[12px] px-3 py-2 mb-4"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-[#d62828] text-white font-semibold py-2.5 text-[15px] disabled:opacity-60"
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="flex items-start gap-2 text-[11px] text-[#8a807c] leading-snug mt-5">
          <ShieldCheck className="w-4 h-4 flex-none" aria-hidden />
          Cada acceso y cada acción queda registrada en la bitácora de
          auditoría.
        </p>
      </form>
    </main>
  );
}
