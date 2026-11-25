import assert from 'node:assert/strict';
process.env.LINER_API_KEY='test-server-liner-key';
process.env.SUPABASE_URL='https://db.test';process.env.SUPABASE_SERVICE_ROLE_KEY='test-secret';
let stored=[];
const linerKeys=[];
const original=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const u=String(url);
 if(u.startsWith('https://db.test/')) {
  if(options.method==='POST'){stored=JSON.parse(options.body);return new Response(null,{status:201})}
  return Response.json(stored);
 }
 if(u.startsWith('https://platform.liner.com/')){linerKeys.push(new Headers(options.headers).get('x-api-key'));return Response.json({results:[{url:'https://example.org/ppwr',title:'PPWR 테스트 자료',description:'PPWR 포장재 기준'}]})}
 throw Error('Unexpected external call: '+u);
};
const {default:handler}=await import('../api/index.js');
async function call(path,body,sessionKey){let result='',status=200;const req={url:'/?__path='+encodeURIComponent(path.slice(1)),method:'POST',headers:{'content-type':'application/json',...(sessionKey?{'x-packtrail-liner-key':sessionKey}:{})},body};const res={set statusCode(v){status=v},get statusCode(){return status},setHeader(){},end(s){result=String(s)}};await handler(req,res);return {status,data:JSON.parse(result)}}
try {
 const input={market:'European Union',material:'PPWR',topic:'전체 규제',usecase:'포장'};
 const found=await call('/api/search',input);assert.equal(found.status,200);assert.equal(found.data.saved.count,1);assert.equal(stored.length,1);assert.deepEqual(linerKeys,['test-server-liner-key']);
 const search=await call('/api/internal-search',input);assert.equal(search.status,200);assert.deepEqual(linerKeys,['test-server-liner-key']);assert.ok(search.data.results.some(r=>r.url==='https://example.org/ppwr'&&r.source_type==='saved'));
 const status=await call('/api/liner/balance',{});
 assert.equal(status.status,200);
 assert.deepEqual(status.data,{source:'server',balance_usd:null});
 assert.deepEqual(linerKeys,['test-server-liner-key']);
 const personal=await call('/api/search',input,'test-personal-liner-key');
 assert.equal(personal.status,200);
 assert.deepEqual(linerKeys,['test-server-liner-key','test-personal-liner-key']);
 console.log('Persistent cache: Liner result saved and reused without another AI request.');
}finally{globalThis.fetch=original}
