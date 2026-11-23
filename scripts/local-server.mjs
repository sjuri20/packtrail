import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import worker from '../worker/index.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const dataDir = path.join(root, 'var');
mkdirSync(dataDir, { recursive: true });
const databasePath = process.env.PACKTRAIL_DB_PATH || path.join(dataDir, 'packtrail.sqlite');
const fresh = !existsSync(databasePath);
const sqlite = new DatabaseSync(databasePath);
sqlite.exec('PRAGMA foreign_keys = ON');
if (fresh) {
  for (const file of ['0000_scheduled_search.sql', '0001_official_base.sql', '0002_review_and_discovery.sql']) {
    sqlite.exec(readFileSync(path.join(root, 'drizzle', file), 'utf8'));
  }
}
class Statement {
  constructor(sql, args = []) { this.sql = sql; this.args = args; }
  bind(...args) { return new Statement(this.sql, args); }
  async all() { return { results: sqlite.prepare(this.sql).all(...this.args) }; }
  async first() { return sqlite.prepare(this.sql).get(...this.args) || null; }
  async run() { const result = sqlite.prepare(this.sql).run(...this.args); return { meta: { changes: Number(result.changes) } }; }
}
const DB = {
  prepare: sql => new Statement(sql),
  async batch(statements) {
    sqlite.exec('BEGIN');
    try { const results = []; for (const s of statements) results.push(await s.run()); sqlite.exec('COMMIT'); return results; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  }
};
const env = { DB, LINER_API_KEY: process.env.LINER_API_KEY || '' };
if (fresh) {
  await worker.fetch(new Request('http://localhost/api/official-sources/import', { method: 'POST' }), env);
  const seeded = await worker.fetch(new Request('http://localhost/api/reviews/bulk-demo', { method: 'POST', headers: { 'content-type': 'application/json', 'oai-authenticated-user-id': 'local-demo' }, body: JSON.stringify({}) }), env);
  if (!seeded.ok) throw new Error('시연용 자료 초기화 실패');
}
const port = Number(process.env.PORT || 8787);
http.createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const headers = new Headers(req.headers);
    headers.set('oai-authenticated-user-id', 'local-demo');
    const request = new Request(`http://127.0.0.1:${port}${req.url}`, {
      method: req.method, headers,
      ...(['GET', 'HEAD'].includes(req.method) ? {} : { body })
    });
    const response = await worker.fetch(request, env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error(error); res.writeHead(500); res.end('Internal server error'); }
}).listen(port, '127.0.0.1', () => console.log(`PackTrail: http://127.0.0.1:${port}`));
