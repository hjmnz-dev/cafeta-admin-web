const REVOKE_DELAY_MS = 30_000;

/**
 * Entrega un archivo al navegador como descarga. Es el borde con el DOM: las
 * pantallas llaman a esta función y no tocan el enlace temporal.
 */
export function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Firefox y Safari empiezan la descarga después del click: revocar al instante
  // la cancela sin avisar.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
