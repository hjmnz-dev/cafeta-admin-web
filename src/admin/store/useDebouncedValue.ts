import { useEffect, useState } from 'react';

/** El valor que dejó de cambiar durante `delayMs`: evita pedir a la API en cada tecla. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
