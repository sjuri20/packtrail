import assert from 'node:assert/strict';
process.env.SUPABASE_URL='https://db.test';process.env.SUPABASE_SERVICE_ROLE_KEY='test-secret';
let stored=[],linerCalls=0;
const original=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const u=String(url);
 if(u.startsWith('https://db.test/')) {
  if(options.method==='POST'){stored=JSON.parse(options.body);return new Response(null,{status:201})}
  return Response.json(stored);
 }
 if(u.startsWith('https://platform.liner.com/')){linerCalls++;return Response.json({results:[{url:'https://example.org/ppwr',title:'PPWR 테스트 자료',description:'PPWR 포장재 기준'}]})}
 throw Error('Unexpected external call: '+u);
};
const {default:handler}=await import('../api/index.js');
async function call(path,body){let result='',status=200;const req={url:'/?__path='+encodeURIComponent(path.slice(1)),method:'POST',headers:{'content-type':'application/json','x-packtrail-liner-key':'fake'},body};const res={set statusCode(v){status=v},get statusCode(){return status},setHeader(){},end(s){result=String(s)}};await handler(req,res);return {status,data:JSON.parse(result)}}
try {
 const input={market:'European Union',material:'PPWR',topic:'전체 규제',usecase:'포장'};
 const found=await call('/api/search',input);assert.equal(found.status,200);assert.equal(found.data.saved.count,1);assert.equal(stored.length,1);assert.equal(linerCalls,1);
 const search=await call('/api/internal-search',input);assert.equal(search.status,200);assert.equal(linerCalls,1);assert.ok(search.data.results.some(r=>r.url==='https://example.org/ppwr'&&r.source_type==='saved'));
 console.log('Persistent cache: Liner result saved and reused without another AI request.');
}finally{globalThis.fetch=original}
