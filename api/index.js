import { DatabaseSync } from 'node:sqlite';
import schema from './schema.js';
import worker from '../worker/index.js';

// The public Vercel demo deliberately has no persistent data store or shared API key.
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(schema);
class Statement {
  constructor(sql, args = []) { this.sql = sql; this.args = args; }
  bind(...args) { return new Statement(this.sql, args); }
  async all() { return { results: sqlite.prepare(this.sql).all(...this.args) }; }
  async first() { return sqlite.prepare(this.sql).get(...this.args) || null; }
  async run() { return { meta: { changes: Number(sqlite.prepare(this.sql).run(...this.args).changes) } }; }
}
const DB = {
  prepare: sql => new Statement(sql),
  async batch(statements) {
    sqlite.exec('BEGIN');
    try { const out = []; for (const statement of statements) out.push(await statement.run()); sqlite.exec('COMMIT'); return out; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  }
};
const env = { DB, LINER_API_KEY: '' };
const initialized = (async () => {
  const first = await worker.fetch(new Request('http://localhost/api/official-sources/import', { method: 'POST' }), env);
  if (!first.ok) throw new Error('기초자료 초기화 실패');
  const approved = await worker.fetch(new Request('http://localhost/api/reviews/bulk-demo', { method: 'POST', headers: { 'oai-authenticated-user-id': 'bootstrap' } }), env);
  if (!approved.ok) throw new Error('시연 자료 초기화 실패');
})();
export default async function handler(req, res) {
  try {
    await initialized;
    const incoming = new URL(req.url, 'https://packtrail.invalid');
    const target = '/' + (incoming.searchParams.get('__path') || '');
    if (target.startsWith('/api/schedule') || target.startsWith('/api/reviews') || target === '/api/official-sources/import' || target === '/mcp') {
      res.statusCode = 503;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: '공개 시연에서는 자료 저장과 정기 검색을 사용할 수 없습니다.' }));
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (value !== undefined && !['host', 'content-length', 'oai-authenticated-user-id'].includes(key.toLowerCase())) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    let body;
    if (!['GET', 'HEAD'].includes(req.method)) {
      if (req.body !== undefined) body = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body);
      else { const chunks = []; for await (const chunk of req) chunks.push(chunk); body = Buffer.concat(chunks); }
    }
    const response = await worker.fetch(new Request('https://packtrail.invalid' + target, { method: req.method, headers, ...(body === undefined ? {} : { body }) }), env);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (target === '/' && response.ok) {
      const html = await response.text();
      return res.end(html.replace('<body>', '<body><div style="padding:10px;text-align:center;background:#fff4d6;color:#573900;font-size:14px">공개 시연: 기초자료는 내용 미검증이며, 자료 저장·정기 검색은 지원하지 않습니다. Liner API는 본인 키를 입력해 사용하세요.</div>'));
    }
    return res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.statusCode = 500; res.end('시연 앱을 실행하지 못했습니다.'); }
}
