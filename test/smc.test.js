import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCandleRequest, normalizeKlines } from '../server.js';
import { analyzeSmc, findSwings } from '../public/smc.js';

test('validates and normalizes a market-data request', () => {
  const request = validateCandleRequest(new URLSearchParams('symbol=btcusdt&interval=15m&limit=100'));
  assert.deepEqual(request, { symbol: 'BTCUSDT', interval: '15m', limit: 100 });
  assert.throws(() => validateCandleRequest(new URLSearchParams('symbol=BTC-USDT')));
  assert.deepEqual(normalizeKlines([[1, '10', '12', '9', '11', '42']]), [{ time: 1, open: 10, high: 12, low: 9, close: 11, volume: 42 }]);
});

test('detects swing points and bullish fair value gaps', () => {
  const candles = [
    { high: 10, low: 7, close: 8 }, { high: 12, low: 8, close: 11 }, { high: 11, low: 9, close: 10 },
    { high: 10, low: 8, close: 9 }, { high: 13, low: 11, close: 12 }, { high: 14, low: 12, close: 13 }, { high: 12, low: 10, close: 11 }
  ];
  assert.ok(findSwings(candles, 1).some((s) => s.type === 'high' && s.index === 1));
  assert.ok(analyzeSmc(candles, 1).events.some((e) => e.type === 'Bullish FVG'));
});

test('marks equal highs as buy-side liquidity and creates an order block after BOS', () => {
  const candles = [
    { open: 9, high: 10, low: 8, close: 9 }, { open: 10, high: 12, low: 9, close: 11 }, { open: 11, high: 10, low: 8, close: 9 },
    { open: 9, high: 12.1, low: 9, close: 10 }, { open: 10, high: 11, low: 9, close: 10 }, { open: 10, high: 14, low: 11, close: 13 }
  ];
  const events = analyzeSmc(candles, 1).events;
  assert.ok(events.some((event) => event.type === 'Equal Highs (BSL)'));
  assert.ok(events.some((event) => event.type === 'Bullish order block'));
});
