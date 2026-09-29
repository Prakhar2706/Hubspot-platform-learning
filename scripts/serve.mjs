import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../site/index.html', import.meta.url));
const port = Number(process.env.PORT || 4173);
http.createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (request.method !== 'GET' || !(pathname.endsWith('/') || pathname.endsWith('/index.html'))) {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
    return;
  }
  try {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(503, { 'Content-Type': 'text/plain' });
    response.end('Build first: node scripts/build.mjs');
  }
}).listen(port, '127.0.0.1', () => console.log(`Preview at http://127.0.0.1:${port}/ (local access only)`));