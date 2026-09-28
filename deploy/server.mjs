// Servidor estático de producción (spec 0006): sirve la carpeta dist/ que está
// a su lado, con fallback a index.html para las rutas del cliente. Solo usa
// módulos de Node. En el paquete de despliegue queda en la raíz, junto a dist/.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { pipeline } from 'node:stream';
import { createGzip } from 'node:zlib';

const DIST = path.join(import.meta.dirname, 'dist');
const INDEX = path.join(DIST, 'index.html');
const PORT = Number(process.env.PORT) || 8080;

// Un Map y no un objeto: una extensión como `.constructor` no debe coincidir.
const TYPES = new Map([
  ['html', 'text/html; charset=utf-8'],
  ['js', 'text/javascript; charset=utf-8'],
  ['mjs', 'text/javascript; charset=utf-8'],
  ['css', 'text/css; charset=utf-8'],
  ['svg', 'image/svg+xml'],
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['webp', 'image/webp'],
  ['avif', 'image/avif'],
  ['gif', 'image/gif'],
  ['ico', 'image/x-icon'],
  ['json', 'application/json; charset=utf-8'],
  ['webmanifest', 'application/manifest+json'],
  ['txt', 'text/plain; charset=utf-8'],
  ['csv', 'text/csv; charset=utf-8'],
  ['map', 'application/json; charset=utf-8'],
  ['woff', 'font/woff'],
  ['woff2', 'font/woff2'],
  ['ttf', 'font/ttf'],
  ['otf', 'font/otf'],
]);
const COMPRESSIBLE = new Set([
  'html',
  'js',
  'mjs',
  'css',
  'svg',
  'json',
  'webmanifest',
  'txt',
  'csv',
  'map',
]);
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
const TEXTS = new Map([
  [400, 'Solicitud inválida'],
  [404, 'No encontrado'],
  [405, 'Método no permitido'],
  [500, 'Error del servidor'],
]);

const extensionOf = (file) => path.extname(file).slice(1).toLowerCase();

// Pasos 2 y 3 del spec: método permitido y ruta decodificada dentro de dist/.
function resolveRequest(method, url, dist) {
  if (method !== 'GET' && method !== 'HEAD') return { status: 405 };
  let pathname;
  try {
    pathname = decodeURIComponent(url.split('?')[0]);
  } catch {
    return { status: 400 };
  }
  if (pathname.includes('\0')) return { status: 400 };
  const file = path.resolve(dist, '.' + pathname);
  const relative = path.relative(dist, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return { status: 404 };
  }
  return { pathname, file };
}

// Pasos 4 a 6: el archivo pedido, un 404 de archivo estático o el index.html.
function chooseFile(pathname, file, isFile, index) {
  const underAssets = pathname.startsWith('/assets/');
  if (isFile) return { status: 200, file, immutable: underAssets };
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
  if (underAssets || TYPES.has(extensionOf(lastSegment))) {
    return { status: 404 };
  }
  return { status: 200, file: index, immutable: false };
}

function sendText(res, method, status) {
  const body = TEXTS.get(status);
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-cache',
    ...(status === 405 ? { Allow: 'GET, HEAD' } : {}),
  });
  res.end(method === 'HEAD' ? undefined : body);
}

async function isRegularFile(file) {
  const stats = await stat(file).catch(() => null);
  return stats?.isFile() ?? false;
}

async function handle(req, res) {
  const request = resolveRequest(req.method, req.url ?? '/', DIST);
  if (request.status) return sendText(res, req.method, request.status);
  const { pathname, file } = request;
  const choice = chooseFile(pathname, file, await isRegularFile(file), INDEX);
  if (choice.status !== 200) return sendText(res, req.method, choice.status);

  const extension = extensionOf(choice.file);
  const compressible = COMPRESSIBLE.has(extension);
  const gzip =
    compressible && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
  const headers = {
    ...SECURITY_HEADERS,
    'Content-Type': TYPES.get(extension) ?? 'application/octet-stream',
    'Cache-Control': choice.immutable
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
    ...(compressible ? { Vary: 'Accept-Encoding' } : {}),
  };
  // Comprimido va por partes, sin Content-Length.
  if (gzip) headers['Content-Encoding'] = 'gzip';
  else headers['Content-Length'] = (await stat(choice.file)).size;

  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  const source = createReadStream(choice.file);
  const onEnd = (error) => error && res.destroy(error);
  if (gzip) pipeline(source, createGzip(), res, onEnd);
  else pipeline(source, res, onEnd);
}

createServer((req, res) => {
  handle(req, res).catch(() => {
    if (res.headersSent) res.destroy();
    else sendText(res, req.method, 500);
  });
}).listen(PORT, () => {
  console.log(`Sirviendo ${DIST} en el puerto ${PORT}`);
});
