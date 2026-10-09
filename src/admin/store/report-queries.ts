import { useMutation } from '@tanstack/react-query';
import {
  csvFileName,
  reportsApi,
  type ReportKind,
  type ReportRange,
} from '../lib/reports-api';
import { saveFile } from '../lib/save-file';

interface ReportParams extends ReportRange {
  kind: ReportKind;
}

/**
 * Generar un informe es una mutación y no una consulta: cada vez queda
 * auditado en la API (`report.generate`), así que nunca se repite solo.
 */
export function useGenerateReport() {
  return useMutation({
    mutationFn: ({ kind, ...range }: ReportParams) =>
      reportsApi.generate(kind, range),
  });
}

/** Descarga el CSV del informe y lo entrega al navegador. */
export function useDownloadReport() {
  return useMutation({
    mutationFn: async ({ kind, ...range }: ReportParams) => {
      const blob = await reportsApi.downloadCsv(kind, range);
      saveFile(blob, csvFileName(kind, range));
    },
  });
}
