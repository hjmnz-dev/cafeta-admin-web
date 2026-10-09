import { useState } from 'react';
import { Download, FileBarChart } from 'lucide-react';
import { userMessageOf } from '../lib/http';
import { rangeProblem } from '../lib/report-range';
import { REPORT_KINDS, type ReportKind } from '../lib/reports-api';
import { toDateInput } from '../lib/format';
import { useDownloadReport, useGenerateReport } from '../store/report-queries';

/**
 * HU44 — Informes administrativos.
 *
 * A diferencia del dashboard, que da la foto inmediata, aquí se elige qué y de
 * cuándo, se visualiza el resultado y se descarga en CSV para analizarlo fuera.
 * La API calcula el informe con datos reales y lo audita. Un rango sin actividad
 * no es un error: la pantalla lo dice y no ofrece la descarga.
 */

const DAY = 24 * 60 * 60 * 1000;

export function AdminReportsScreen() {
  const [kind, setKind] = useState<ReportKind>('activity');
  const [from, setFrom] = useState(toDateInput(Date.now() - 30 * DAY));
  const [to, setTo] = useState(toDateInput(Date.now()));
  const [problem, setProblem] = useState<string | null>(null);

  const generate = useGenerateReport();
  const download = useDownloadReport();
  const result = generate.data;

  const onGenerate = () => {
    const found = rangeProblem(from, to);
    setProblem(found);
    download.reset();
    if (found) {
      generate.reset();
      return;
    }
    generate.mutate({ kind, from, to });
  };

  // El CSV es el del informe que se ve, aunque el formulario ya haya cambiado.
  const onDownload = () => {
    if (!result) return;
    download.mutate({ kind: result.kind, from: result.from, to: result.to });
  };

  const alert = problem
    ? problem
    : generate.isError
      ? userMessageOf(generate.error)
      : download.isError
        ? userMessageOf(download.error)
        : null;

  const field =
    'rounded-[12px] border border-[#e3ddd9] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#d62828]';

  return (
    <section className="max-w-[1180px]">
      <header className="mb-5">
        <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px]">
          Informes administrativos
        </h1>
        <p className="text-[14px] text-[#6b625e]">
          Información estructurada y exportable para sustentar decisiones. Cada
          generación queda en la bitácora.
        </p>
      </header>

      {/* Parámetros del informe */}
      <div className="bg-white border border-[#e3ddd9] rounded-[18px] p-5 mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-[12px] text-[#6b625e] min-w-[240px]">
            Tipo de informe
            <select
              aria-label="Tipo de informe"
              value={kind}
              onChange={(e) => setKind(e.target.value as ReportKind)}
              className={field}
            >
              {REPORT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-[#6b625e]">
            Desde
            <input
              type="date"
              aria-label="Desde"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-[#6b625e]">
            Hasta
            <input
              type="date"
              aria-label="Hasta"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={field}
            />
          </label>
          <button
            onClick={onGenerate}
            disabled={generate.isPending}
            className="px-5 py-2.5 rounded-full text-[14px] font-semibold bg-[#d62828] text-white hover:bg-[#7e1418] transition-colors disabled:opacity-60"
          >
            {generate.isPending ? 'Generando…' : 'Generar informe'}
          </button>
        </div>
        <p className="text-[13px] text-[#6b625e] mt-3">
          {REPORT_KINDS.find((k) => k.value === kind)!.description} Hasta 92
          días, en hora de Santo Domingo.
        </p>
        {alert && (
          <p role="alert" className="mt-3 text-[14px] text-[#c42222]">
            {alert}
          </p>
        )}
      </div>

      {/* Resultado */}
      {result && (
        <div className="bg-white border border-[#e3ddd9] rounded-[18px] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[#f0ebe8]">
            <div>
              <h2 className="font-['Space_Grotesk',sans-serif] font-bold text-[17px]">
                {result.title}
              </h2>
              <p className="text-[13px] text-[#6b625e]">
                Del {result.from} al {result.to}
              </p>
            </div>
            <button
              onClick={onDownload}
              disabled={result.isEmpty || download.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold border border-[#e3ddd9] text-[#4a4340] hover:border-[#d62828] hover:text-[#c42222] transition-colors disabled:opacity-40 disabled:hover:border-[#e3ddd9] disabled:hover:text-[#4a4340]"
            >
              <Download className="w-4 h-4" aria-hidden />
              {download.isPending ? 'Descargando…' : 'Descargar CSV'}
            </button>
          </div>

          {result.isEmpty ? (
            <div className="px-5 py-12 text-center">
              <FileBarChart
                className="w-8 h-8 text-[#6b625e] mx-auto mb-2"
                aria-hidden
              />
              <p className="text-[15px] font-semibold text-[#4a4340]">
                No hay datos disponibles para este rango
              </p>
              <p className="text-[13px] text-[#6b625e] mt-1">
                No se registró actividad de este tipo entre las fechas
                seleccionadas. Prueba con un rango más amplio.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[14px]">
                <caption className="sr-only">{result.title}</caption>
                <thead>
                  <tr className="bg-[#fbf8f7] text-left text-[12px] uppercase tracking-wide text-[#6b625e]">
                    {result.columns.map((c) => (
                      <th
                        key={c}
                        scope="col"
                        className="px-4 py-3 font-semibold whitespace-nowrap"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr
                      key={String(row[0])}
                      className="border-t border-[#f0ebe8]"
                    >
                      {row.map((cell, j) => (
                        <td key={j} className="px-4 py-3 text-[#4a4340]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
