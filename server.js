import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const allowedIntervals = new Set(['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w']);
const mimeTypes = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

export function validateCandleRequest(searchParams) {
  const symbol = (searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
  const interval = searchParams.get('interval') || '15m';
  const requestedLimit = Number(searchParams.get('limit') || 300);
  if (!/^[A-Z0-9]{5,20}$/.test(symbol)) throw new Error('Symbol must contain 5–20 uppercase letters or numbers.');
  if (!allowedIntervals.has(interval)) throw new Error('Unsupported candle interval.');
  if (!Number.isInteger(requestedLimit) || requestedLimit < 50 || requestedLimit > 1_000) throw new Error('Limit must be an integer between 50 and 1000.');
  return { symbol, interval, limit: requestedLimit };
}

export function normalizeKlines(rows) {
  return rows.map((row) => ({ time: row[0], open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: Number(row[5]) }));
}

async function candles(request, response, url) {
  let query;
  try { query = validateCandleRequest(url.searchParams); } catch (error) { sendJson(response, 400, { error: error.message }); return; }
  try {
    const upstream = await fetch(`https://api.binance.com/api/v3/klines?symbol=${query.symbol}&interval=${query.interval}&limit=${query.limit}`, { signal: AbortSignal.timeout(10_000) });
    if (!upstream.ok) throw new Error(`Market-data provider returned ${upstream.status}.`);
    const rows = await upstream.json();
    sendJson(response, 200, { source: 'Binance Spot REST API', ...query, candles: normalizeKlines(rows) });
  } catch (error) {
    sendJson(response, 502, { error: 'Unable to fetch live market data.', detail: error.message });
  }
}

async function staticFile(request, response, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = normalize(join(root, 'public', relative));
  if (!filePath.startsWith(join(root, 'public'))) { response.writeHead(403); response.end(); return; }
  try {
    const content = await readFile(filePath);
    response.writeHead(200, { 'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
    response.end(content);
  } catch { response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); response.end('Not found'); }
}

export const app = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'GET' && url.pathname === '/api/candles') return candles(request, response, url);
  if (request.method === 'GET') return staticFile(request, response, url.pathname);
  response.writeHead(405); response.end();
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`SMC Paper Trader listening on http://localhost:${port}`));
}
