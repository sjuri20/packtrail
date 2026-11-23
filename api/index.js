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
const storeUrl = process.env.SUPABASE_URL;
const storeKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function cacheRequest(path, options = {}) {
  if (!storeUrl || !storeKey) throw new Error('영구 저장소 설정이 필요합니다.');
  const auth = storeKey.startsWith('sb_secret_') ? { apikey: storeKey } : { apikey: storeKey, Authorization: `Bearer ${storeKey}` };
  const response = await fetch(`${storeUrl}/rest/v1/${path}`, { ...options, headers: { ...auth, 'content-type': 'application/json', ...options.headers } });
  if (!response.ok) throw new Error('영구 저장소 연결에 실패했습니다.');
  return response.status === 204 ? null : response.json();
}
async function loadSaved(market) {
  const rows = await cacheRequest('packtrail_discoveries?market=eq.' + encodeURIComponent(market) + '&select=market,url,title,description,published_date,last_seen_at&order=last_seen_at.desc&limit=2000');
  for (const r of rows) {
    sqlite.prepare('INSERT INTO live_sources(id,market,title,url,description,published_date,first_seen_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(market,url) DO UPDATE SET title=excluded.title,description=excluded.description,published_date=excluded.published_date,last_seen_at=excluded.last_seen_at').run(r.market+'|'+r.url,r.market,r.title,r.url,r.description,r.published_date,r.last_seen_at,r.last_seen_at);
  }
}
async function saveReferences(market, references) {
  const now = new Date().toISOString();
  const rows = [...new Map(references.filter(r => r && typeof r.url === 'string' && /^https?:\/\//i.test(r.url) && r.url.length <= 3500).slice(0,100).map(r => [r.url,{market,url:r.url,title:String(r.title||r.url).slice(0,1000),description:String(r.description||'').slice(0,4000),published_date:String(r.date||'').slice(0,100),last_seen_at:now}])).values()];
  if (rows.length) await cacheRequest('packtrail_discoveries?on_conflict=market,url', { method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows) });
  return rows.length;
}
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
    let input = {};
    if (body !== undefined) { try { input = JSON.parse(String(body)); } catch {} }
    let cacheError = false;
    if (target === '/api/internal-search') { sqlite.exec('DELETE FROM live_sources'); try { await loadSaved(input.market); } catch { cacheError = true; } }
    const response = await worker.fetch(new Request('https://packtrail.invalid' + target, { method: req.method, headers, ...(body === undefined ? {} : { body }) }), env);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (target === '/' && response.ok) {
      const html = await response.text();
      const message=storeUrl&&storeKey?'수집 자료는 내용 미검증입니다. 정기 검색은 아직 연결되지 않았습니다.':'영구 저장소 연결이 필요합니다. 정기 검색은 아직 연결되지 않았습니다.';
      return res.end(html.replace('<body>', '<body><div style="padding:10px;text-align:center;background:#fff4d6;color:#573900;font-size:14px">'+message+' Liner API는 본인 키를 입력해 사용하세요.</div>'));
    }
    if (target === '/api/internal-search' && response.ok) { const data=await response.json(); if(cacheError)data.warnings.push('영구 저장소에 연결되지 않아 기본 자료만 검색했습니다.'); return res.end(JSON.stringify(data)); }
    if ((target === '/api/search'||target === '/api/advice') && response.ok) {
      const data=await response.json();
      try { data.saved={count:await saveReferences(input.market,Array.isArray(data.references)?data.references:[]),error:false}; }
      catch { data.saved={count:0,error:true}; }
      return res.end(JSON.stringify(data));
    }
    return res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.statusCode = 500; res.end('시연 앱을 실행하지 못했습니다.'); }
}
