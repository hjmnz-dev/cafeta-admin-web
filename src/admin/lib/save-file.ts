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
  URL.revokeObjectURL(url);
}
