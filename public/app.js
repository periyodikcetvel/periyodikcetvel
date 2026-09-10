import { analyzeSmc, latestSignal } from './smc.js';

const form = document.querySelector('form');
const status = document.querySelector('#status');
const metrics = document.querySelector('#metrics');
const rows = document.querySelector('#events');
const chart = document.querySelector('#chart');

function price(value) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value); }
function renderChart(candles, analysis) {
  const width = 1000, height = 380, pad = 28, min = Math.min(...candles.map((c) => c.low)), max = Math.max(...candles.map((c) => c.high));
  const x = (i) => pad + i * (width - 2 * pad) / (candles.length - 1);
  const y = (v) => height - pad - (v - min) * (height - 2 * pad) / (max - min || 1);
  const candlesSvg = candles.map((c, i) => { const green = c.close >= c.open; const w = Math.max(1, (width - 2 * pad) / candles.length * .65); return `<line x1="${x(i)}" x2="${x(i)}" y1="${y(c.high)}" y2="${y(c.low)}" stroke="${green ? '#52d6a2' : '#ff7185'}"/><rect x="${x(i)-w/2}" y="${y(Math.max(c.open,c.close))}" width="${w}" height="${Math.max(1,y(Math.min(c.open,c.close))-y(Math.max(c.open,c.close)))}" fill="${green ? '#52d6a2' : '#ff7185'}"/>`; }).join('');
  const marks = analysis.events.slice(-15).map((e) => { const value = e.price ?? (e.top + e.bottom) / 2; return `<text x="${x(e.index)}" y="${y(value)-7}" text-anchor="middle" class="${e.direction}">${e.type}</text>`; }).join('');
  chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Candlestick chart with smart money concept events"><rect width="100%" height="100%" fill="#101827"/>${candlesSvg}${marks}</svg>`;
}
function render(data) {
  const analysis = analyzeSmc(data.candles); const signal = latestSignal(analysis); const last = data.candles.at(-1);
  status.textContent = `${data.source} · Güncelleme: ${new Date(last.time).toLocaleString('tr-TR')}`;
  const direction = { bullish: 'yükseliş', bearish: 'düşüş', neutral: 'nötr' };
  metrics.innerHTML = `<article><span>Son fiyat</span><strong>${price(last.close)}</strong></article><article><span>Piyasa yapısı</span><strong class="${analysis.bias || 'neutral'}">${direction[analysis.bias] || 'nötr'}</strong></article><article><span>Simülasyon sinyali</span><strong class="${signal.direction}">${direction[signal.direction]}</strong><small>${signal.reason}</small></article>`;
  rows.innerHTML = analysis.events.slice(-12).reverse().map((e) => `<tr><td>${new Date(data.candles[e.index].time).toLocaleString('tr-TR')}</td><td class="${e.direction}">${e.type}</td><td>${price(e.price ?? e.top ?? e.bottom)}</td></tr>`).join('') || '<tr><td colspan="3">Bu veri penceresinde SMC olayı bulunamadı.</td></tr>';
  renderChart(data.candles, analysis);
}
async function load() {
  const data = new FormData(form); status.textContent = 'Canlı mum verileri getiriliyor…';
  try { const response = await fetch(`/api/candles?${new URLSearchParams(data)}`); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); render(payload); }
  catch (error) { status.textContent = `Veri hatası: ${error.message}`; }
}
form.addEventListener('submit', (event) => { event.preventDefault(); load(); });
load();
