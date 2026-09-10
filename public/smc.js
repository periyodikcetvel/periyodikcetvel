export function findSwings(candles, lookback = 3) {
  const swings = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const window = candles.slice(i - lookback, i + lookback + 1);
    if (window.every((c) => candles[i].high >= c.high) && window.some((c) => candles[i].high > c.high)) swings.push({ index: i, price: candles[i].high, type: 'high' });
    if (window.every((c) => candles[i].low <= c.low) && window.some((c) => candles[i].low < c.low)) swings.push({ index: i, price: candles[i].low, type: 'low' });
  }
  return swings;
}

export function analyzeSmc(candles, lookback = 3) {
  const swings = findSwings(candles, lookback);
  const events = [];
  let lastHigh, lastLow, bias = null;
  for (let i = 0; i < candles.length; i++) {
    for (const swing of swings.filter((s) => s.index === i)) {
      if (swing.type === 'high') lastHigh = swing; else lastLow = swing;
    }
    const candle = candles[i];
    if (lastHigh && candle.close > lastHigh.price && lastHigh.index < i) {
      events.push({ index: i, type: bias === 'bearish' ? 'CHoCH ↑' : 'BOS ↑', direction: 'bullish', price: lastHigh.price });
      bias = 'bullish'; lastHigh = undefined;
    }
    if (lastLow && candle.close < lastLow.price && lastLow.index < i) {
      events.push({ index: i, type: bias === 'bullish' ? 'CHoCH ↓' : 'BOS ↓', direction: 'bearish', price: lastLow.price });
      bias = 'bearish'; lastLow = undefined;
    }
    if (i >= 2 && candles[i].low > candles[i - 2].high) events.push({ index: i, type: 'Bullish FVG', direction: 'bullish', top: candles[i].low, bottom: candles[i - 2].high });
    if (i >= 2 && candles[i].high < candles[i - 2].low) events.push({ index: i, type: 'Bearish FVG', direction: 'bearish', top: candles[i - 2].low, bottom: candles[i].high });
  }
  const tolerance = Math.max(...candles.map((c) => c.high - c.low)) * 0.1;
  let priorSwingHigh; let priorSwingLow;
  for (const current of swings) {
    const previous = current.type === 'high' ? priorSwingHigh : priorSwingLow;
    if (previous && Math.abs(previous.price - current.price) <= tolerance) {
      events.push({ index: current.index, type: current.type === 'high' ? 'Equal Highs (BSL)' : 'Equal Lows (SSL)', direction: current.type === 'high' ? 'bearish' : 'bullish', price: current.price });
    }
    if (current.type === 'high') priorSwingHigh = current; else priorSwingLow = current;
  }
  for (const swing of swings) {
    const next = candles[swing.index + 1];
    if (!next) continue;
    if (swing.type === 'high' && next.high > swing.price && next.close < swing.price) events.push({ index: swing.index + 1, type: 'Buy-side liquidity sweep', direction: 'bearish', price: swing.price });
    if (swing.type === 'low' && next.low < swing.price && next.close > swing.price) events.push({ index: swing.index + 1, type: 'Sell-side liquidity sweep', direction: 'bullish', price: swing.price });
  }
  for (const event of events.filter((item) => item.type.startsWith('BOS') || item.type.startsWith('CHoCH'))) {
    const prior = candles.slice(0, event.index).reverse().find((c) => event.direction === 'bullish' ? c.close < c.open : c.close > c.open);
    if (prior) events.push({ index: event.index, type: event.direction === 'bullish' ? 'Bullish order block' : 'Bearish order block', direction: event.direction, top: prior.high, bottom: prior.low });
  }
  return { swings, events: events.sort((a, b) => a.index - b.index), bias };
}

export function latestSignal(analysis) {
  const structure = [...analysis.events].reverse().find((event) => event.type.startsWith('BOS') || event.type.startsWith('CHoCH'));
  const gap = [...analysis.events].reverse().find((event) => event.type.includes('FVG'));
  if (structure && gap && structure.direction === gap.direction) return { direction: structure.direction, reason: `${structure.type} aligned with ${gap.type}` };
  return { direction: 'neutral', reason: 'Yapı kırılımı ile fair value gap aynı yönü gösterene kadar bekleniyor.' };
}
