import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker/index.js';
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE source_reviews (source_key TEXT, title TEXT, url TEXT, description TEXT, market TEXT, tags TEXT, reviewed_at TEXT, source_kind TEXT, version INTEGER, note TEXT, status TEXT); CREATE TABLE live_sources (id TEXT, market TEXT, title TEXT, url TEXT, description TEXT, last_seen_at TEXT);`);
db.prepare('INSERT INTO live_sources VALUES(?,?,?,?,?,?)').run('eu|https://example.org/ppwr','European Union','PPWR 가상 자료','https://example.org/ppwr','PPWR 포장재 정보','2026-11-23');
db.prepare('INSERT INTO live_sources VALUES(?,?,?,?,?,?)').run('bad','European Union','PPWR 제외 자료','https://example.org/rejected','PPWR 정보','2026-11-23');
db.prepare('INSERT INTO source_reviews VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('live:bad','PPWR 제외 자료','https://example.org/rejected','PPWR 정보','European Union','','2026-11-23','수집',1,'','rejected');
class Statement { constructor(sql, args=[]){this.sql=sql;this.args=args} bind(...args){return new Statement(this.sql,args)} async all(){return {results:db.prepare(this.sql).all(...this.args)}} }
const env={DB:{prepare:sql=>new Statement(sql)},LINER_API_KEY:'test-key'};
const oldFetch=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('내부 검색에서 외부 호출 금지')};
try {
 const response=await worker.fetch(new Request('https://test/api/internal-search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({market:'European Union',material:'PPWR',topic:'전체 규제',usecase:'포장',mode:'sources'})}),env);
 const body=await response.json();assert.equal(response.status,200);assert.equal(calls,0);assert.equal(body.results.length,1);assert.equal(body.results[0].source_type,'saved');assert.match(body.results[0].note,/미검증/);assert.match(body.criteria,/AI 호출 없이/);
 console.log('Internal-first: saved reference, rejected reference and zero external calls passed.');
} finally {globalThis.fetch=oldFetch;db.close()}
