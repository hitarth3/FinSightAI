import test from 'node:test';
import assert from 'node:assert/strict';
import { stockAnalysisService } from '../src/services/stockAnalysisService';

const report = (symbol: string) => ({
  symbol, strength_score: 70, recommendation: 'HOLD', trend: 'Bullish',
  confidence: 0, risk_level: 'Medium', sentiment: 'Not evaluated',
  support_levels: [100], resistance_levels: [120], summary: 'Calculated research',
  analysis_generated_at: new Date().toISOString(),
});

Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null } });

test('generation uses backend persistence and maps the report', async () => {
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push(`${init?.method} ${input}`);
    return Response.json({ data: report('TCS') });
  };
  const result = await stockAnalysisService.getAnalysis('TCS', true);
  assert.equal(result.strengthScore, 70);
  assert.equal(result.confidence, 0);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /POST .*analysis\/trigger\/TCS/);
});

test('failed refresh marks historical results stale without caching them as fresh', async () => {
  let generated = 0;
  globalThis.fetch = async (input) => {
    if (String(input).includes('/trigger/')) {
      generated++;
      return Response.json({ detail: 'Provider unavailable' }, { status: 503 });
    }
    return Response.json({ data: { ...report('INFY'), analysis_generated_at: '2020-01-01T00:00:00Z' } });
  };
  const result = await stockAnalysisService.getAnalysis('INFY', true);
  assert.equal(result.stale, true);
  await stockAnalysisService.getAnalysis('INFY');
  assert.equal(generated, 2);
});
