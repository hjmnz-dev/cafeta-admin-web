import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Aísla cada prueba: desmonta el árbol y limpia el estado persistido
// (localStorage) que usa AdminState, para que no se filtre entre tests.
afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    /* jsdom sin storage: ignorar */
  }
});
