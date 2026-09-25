import { useState } from 'react';
import { Download, FileBarChart } from 'lucide-react';
import { useAdminState } from '../store/AdminState';
import { buildReport, toCsv, REPORT_KINDS, ReportKind, GeneratedReport } from '../lib/metrics';
import { formatDate, toDateInput, startOfDay, endOfDay } from '../lib/format';

/**
 * HU44 — Informes administrativos.
 *
 * A diferencia del dashboard, que da la foto inmediata, aquí se elige qué y de
 * cuándo, se visualiza el resultado y se descarga en CSV para analizarlo fuera.
 * Un rango sin actividad devuelve un informe vacío, no un error: eso también es
 * información y así lo dice la pantalla.
 */

const DAY = 24 * 60 * 60 * 1000;

export function AdminReportsScreen() {
  const { users, reports, audit, logReportGenerated } = useAdminState();

  const [kind, setKind] = useState<ReportKind>('signups');
  const [from, setFrom] = useState(toDateInput(Date.now() - 30 * DAY));
  const [to, setTo] = useState(toDateInput(Date.now()));
  const [result, setResult] = useState<GeneratedReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = () => {
    if (startOfDay(from) > endOfDay(to)) {
      setError('La fecha inicial no puede ser posterior a la final.');
      setResult(null);
      return;
    }
    setError(null);

    const generated = buildReport(
      { users, reports, audit },
      { kind, from: startOfDay(from), to: endOfDay(to) },
    );
    setResult(generated);
    logReportGenerated(
      `${generated.title}, del ${formatDate(generated.from)} al ${formatDate(generated.to)}: ${generated.rows.length} registros.`,
    );
  };

  const download = () => {
    if (!result) return;
    // Descarga en el navegador: sin servidor, el archivo se arma en memoria.
    const blob = new Blob([`﻿${toCsv(result)}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cafeta-${result.kind}-${toDateInput(result.from)}-${toDateInput(result.to)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const field = 'rounded-[12px] border border-[#e3ddd9] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#d62828]';

  return (
    <section className="max-w-[1180px]">
      <header className="mb-5">
        <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px]">Informes administrativos</h1>
        <p className="text-[14px] text-[#8a807c]">
          Información estructurada y exportable para sustentar decisiones. Cada generación queda en la bitácora.
        </p>
      </header>

      {/* Parámetros del informe */}
      <div className="bg-white border border-[#e3ddd9] rounded-[18px] p-5 mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-[12px] text-[#8a807c] min-w-[240px]">
            Tipo de informe
            <select aria-label="Tipo de informe" value={kind} onChange={(e) => setKind(e.target.value as ReportKind)} className={field}>
              {REPORT_KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-[#8a807c]">
            Desde
            <input type="date" aria-label="Desde" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-[#8a807c]">
            Hasta
            <input type="date" aria-label="Hasta" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
          </label>
          <button
            onClick={generate}
            className="px-5 py-2.5 rounded-full text-[14px] font-semibold bg-[#d62828] text-white hover:bg-[#7e1418] transition-colors"
          >
            Generar informe
          </button>
        </div>
        <p className="text-[13px] text-[#8a807c] mt-3">{REPORT_KINDS.find((k) => k.value === kind)!.description}</p>
        {error && <p role="alert" className="mt-3 text-[14px] text-[#d62828]">{error}</p>}
      </div>

      {/* Resultado */}
      {result && (
        <div className="bg-white border border-[#e3ddd9] rounded-[18px] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[#f0ebe8]">
            <div>
              <h2 className="font-['Space_Grotesk',sans-serif] font-bold text-[17px]">{result.title}</h2>
              <p className="text-[13px] text-[#8a807c]">
                Del {formatDate(result.from)} al {formatDate(result.to)} · {result.rows.length}{' '}
                {result.rows.length === 1 ? 'registro' : 'registros'}
              </p>
            </div>
            <button
              onClick={download}
              disabled={result.rows.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold border border-[#e3ddd9] text-[#4a4340] hover:border-[#d62828] hover:text-[#d62828] transition-colors disabled:opacity-40 disabled:hover:border-[#e3ddd9] disabled:hover:text-[#4a4340]"
            >
              <Download className="w-4 h-4" aria-hidden /> Descargar CSV
            </button>
          </div>

          {result.rows.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FileBarChart className="w-8 h-8 text-[#8a807c] mx-auto mb-2" aria-hidden />
              <p className="text-[15px] font-semibold text-[#4a4340]">No hay datos disponibles para este rango</p>
              <p className="text-[13px] text-[#8a807c] mt-1">
                No se registró actividad de este tipo entre las fechas seleccionadas. Prueba con un rango más amplio.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[14px]">
                <caption className="sr-only">{result.title}</caption>
                <thead>
                  <tr className="bg-[#fbf8f7] text-left text-[12px] uppercase tracking-wide text-[#8a807c]">
                    {result.columns.map((c) => (
                      <th key={c} scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className="border-t border-[#f0ebe8]">
                      {row.map((cell, j) => (
                        <td key={j} className="px-4 py-3 text-[#4a4340]">{cell}</td>
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
