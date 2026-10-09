import { useEffect, useRef } from 'react';

/**
 * Desplazamiento infinito: devuelve una ref para un elemento al final de la
 * lista y llama a `onVisible` cuando entra en pantalla. Donde el navegador no
 * tiene IntersectionObserver no hace nada; el botón "Ver más" sigue sirviendo.
 */
export function useLoadMoreOnVisible(active: boolean, onVisible: () => void) {
  const target = useRef<HTMLDivElement | null>(null);
  const callback = useRef(onVisible);

  useEffect(() => {
    callback.current = onVisible;
  });

  useEffect(() => {
    const node = target.current;
    if (!active || !node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) callback.current();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  return target;
}
