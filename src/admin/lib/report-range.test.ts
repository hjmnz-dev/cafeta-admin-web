import { describe, expect, it } from 'vitest';
import { rangeProblem } from './report-range';
import { csvFileName } from './reports-api';

describe('rangeProblem', () => {
  it('acepta un día y exactamente 92 días', () => {
    expect(rangeProblem('2026-09-01', '2026-09-01')).toBeNull();
    expect(rangeProblem('2026-07-01', '2026-09-30')).toBeNull();
  });

  it('rechaza fechas al revés, faltantes y de más de 92 días', () => {
    expect(rangeProblem('2026-09-10', '2026-09-01')).toMatch(/posterior/);
    expect(rangeProblem('', '2026-09-01')).toMatch(/Elige/);
    expect(rangeProblem('2026-07-01', '2026-10-01')).toMatch(/92 días/);
  });
});

describe('csvFileName', () => {
  it('lleva el tipo en español y el rango, igual que la API', () => {
    const range = { from: '2026-09-01', to: '2026-09-30' };
    expect(csvFileName('activity', range)).toBe(
      'cafeta-actividad-2026-09-01-2026-09-30.csv',
    );
    expect(csvFileName('moderation', range)).toBe(
      'cafeta-moderacion-2026-09-01-2026-09-30.csv',
    );
  });
});
