import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../worker/index.js';

const records = JSON.parse(fs.readFileSync(new URL('../data/official_base.json', import.meta.url)));
const env = { LINER_API_KEY: 'test-only', DB: { prepare: () => ({ bind: market => ({ all: async () => ({ results: records.filter(x => x.market === market).map(x => ({ ...x, note: '시연 승인 · 내용 미검증', source_type: 'approved' })) }) }) }) } };
const calls = [];
let fail = false;
globalThis.fetch = async (url, options) => {
  calls.push(String(url));
  if (fail) return new Response('{}', { status: 503 });
  if (String(url).endsWith('/chat/completions')) {
    const isSummary = JSON.parse(options.body).messages[0].content.includes('summary, regulations');
    return Response.json({ choices: [{ message: { content: JSON.stringify(isSummary ? { summary: [{ text: '근거를 확인하세요.', source_indexes: [1, 999], basis: 'source' }], regulations: [{ text: '적용 범위를 확인하세요.', source_indexes: [1], basis: 'source' }], considerations: [{ text: '사용 조건을 확인하세요.', source_indexes: [2], basis: 'source' }], documents: [{ text: '제품 사양서를 준비해 보세요.', source_indexes: [], basis: 'suggestion' }] } : { concept_ids: ['paper', 'food', 'hot', 'unknown'], missing: ['코팅 재질'] }) } }] });
  }
  const docs = JSON.parse(options.body).documents;
  return Response.json({ results: docs.map((_, index) => ({ index })).reverse() });
};
async function search(material, market = 'European Union') {
  const req = new Request('https://local/api/internal-search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ market, material, usecase: '', topic: 'all applicable packaging and food contact regulations', mode: 'advice' }) });
  const response = await worker.fetch(req, env);
  assert.equal(response.status, 200);
  return response.json();
}
const enhanced = await search('따뜻한 음식을 담는 종이 용기');
assert(enhanced.analysis.includes('식품 접촉'));
assert(enhanced.analysis.includes('고온·뜨거운 음식'));
assert.match(enhanced.criteria, /Liner 입력 분석 · Liner 관련도 재정렬/);
assert(enhanced.warnings.some(x => x.includes('코팅 재질')));
assert.deepEqual(enhanced.brief[0].source_indexes, [1]);
assert.equal(enhanced.guidance.regulations[0].basis, 'source');
assert.equal(enhanced.guidance.documents[0].basis, 'suggestion');
assert.equal(enhanced.sufficient, false);
assert(enhanced.warnings.some(x => x.includes('서류 근거')));
assert(calls.every(x => x.endsWith('/chat/completions') || x.endsWith('/rerank')));
assert(enhanced.results.every(x => x.source_type === 'approved'));
const unspecified = await search('SB54 플라스틱 포장 생산자책임', 'California, United States');
assert(!unspecified.analysis.includes('식품 접촉'));
assert(!unspecified.analysis.includes('고온·뜨거운 음식'));
fail = true;
const fallback = await search('뜨거운 음식용 종이 용기');
assert.match(fallback.criteria, /규칙 기반 · 규칙 기반/);
assert(fallback.results.length > 0);
assert(fallback.warnings.some(x => x.includes('기본 규칙')));
assert(fallback.guidance.regulations.length > 0);
assert(fallback.guidance.considerations.length > 0);
assert(fallback.guidance.regulations.every(x => x.source_indexes.length));
const mismatch = await search('SB54');
assert.equal(mismatch.results.length, 0);
assert.equal(mismatch.sufficient, false);
console.log('Intelligent analysis, rerank, fallback, approved-only and jurisdiction checks passed.');
