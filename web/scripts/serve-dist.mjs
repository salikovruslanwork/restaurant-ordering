import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, request as proxyRequest } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { target } from '../proxy.conf.mjs';

const [app, port] = process.argv.slice(2);
const root = fileURLToPath(new URL(`../dist/${app}/browser`, import.meta.url));

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};
// Build output names carry a content hash, e.g. main-YDR54TNU.js, so they can be cached for good.
const HASHED_FILE = /-[\w-]{8}\.(js|css)$/;
const files = new Map();

function readFile(path) {
  if (!files.has(path)) {
    const body = readFileSync(path);
    files.set(path, { body, gzipped: gzipSync(body, { level: 9 }) });
  }
  return files.get(path);
}

function resolveFile(url) {
  const path = normalize(join(root, decodeURIComponent(url.split('?')[0])));
  const inRoot = path.startsWith(root + sep);
  return inRoot && existsSync(path) && statSync(path).isFile() ? path : join(root, 'index.html');
}

function serveFile(request, response) {
  const path = resolveFile(request.url);
  const { body, gzipped } = readFile(path);
  const useGzip = /\bgzip\b/.test(request.headers['accept-encoding'] ?? '');

  response.writeHead(200, {
    'Content-Type': CONTENT_TYPES[extname(path)] ?? 'application/octet-stream',
    'Cache-Control': HASHED_FILE.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache',
    Vary: 'Accept-Encoding',
    ...(useGzip && { 'Content-Encoding': 'gzip' })
  });
  response.end(useGzip ? gzipped : body);
}

// Ending the response when the backend closes lets EventSource notice and reconnect.
function proxyApi(request, response) {
  const upstream = proxyRequest(
    new URL(request.url, target),
    { method: request.method, headers: request.headers },
    (backendResponse) => {
      response.writeHead(backendResponse.statusCode ?? 502, backendResponse.headers);
      backendResponse.pipe(response);
      backendResponse.on('close', () => {
        if (!response.writableEnded) {
          response.destroy();
        }
      });
    }
  );
  upstream.on('error', () => {
    if (!response.headersSent) {
      response.writeHead(502);
    }
    response.end();
  });
  response.on('close', () => upstream.destroy());
  request.pipe(upstream);
}

createServer((request, response) =>
  request.url.startsWith('/api/') ? proxyApi(request, response) : serveFile(request, response)
).listen(Number(port), () => console.log(`${app}: http://localhost:${port}`));
