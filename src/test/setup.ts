import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Aísla cada prueba: desmonta el árbol y limpia el almacenamiento local para
// que no se filtre entre tests.
afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    /* jsdom sin storage: ignorar */
  }
});
