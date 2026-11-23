import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../worker/index.js';

const rows=JSON.parse(fs.readFileSync(new URL('../data/official_base.json',import.meta.url)));
const env={LINER_API_KEY:'server-test',DB:{prepare:()=>({bind:market=>({all:async()=>({results:rows.filter(r=>r.market===market).map(r=>({...r,source_type:'approved'}))})})})}};
let seenKey;let upstreamStatus=200;
globalThis.fetch=async (url,opts)=>{
 assert.equal(url,'https://platform.liner.com/api/v1/chat/completions');seenKey=opts.headers['x-api-key'];
 if(upstreamStatus!==200)return Response.json({}, {status:upstreamStatus});
 return Response.json({choices:[{message:{content:JSON.stringify({findings:[{label:'검출 결과',page:1,quote:'PFAS 12 ppm',checks:'시험 방법을 확인하세요.',source_indexes:[1,999]},{label:'없는 수치',page:1,quote:'PFAS 999 ppm',checks:'확인',source_indexes:[1]}],missing:['시험 조건']})}}]});
};
const base={market:'European Union',material:'식품용 종이 용기',topic:'food contact material requirements',usecase:'뜨거운 음식',pages:[{page:1,text:'PFAS 12 ppm ISO 시험법'},{page:2,text:''}]};
async function review(body,key='session-test'){
 return worker.fetch(new Request('https://local/api/report/review',{method:'POST',headers:{'content-type':'application/json','x-packtrail-liner-key':key},body:JSON.stringify(body)}),env);
}
let response=await review(base);assert.equal(response.status,200);let data=await response.json();assert.equal(seenKey,'session-test');assert.equal(data.findings.length,1);assert.deepEqual(data.findings[0].source_indexes,[1]);assert.deepEqual(data.unreadable_pages,[2]);assert(!JSON.stringify(data).includes('PFAS 999 ppm'));assert(!JSON.stringify(data).includes('session-test'));
response=await review({...base,pages:[{page:1,text:''}]});assert.equal(response.status,400);
response=await review({...base,pages:Array.from({length:26},(_,i)=>({page:i+1,text:'x'}))});assert.equal(response.status,400);
response=await review({...base,pages:[{page:1,text:'x'.repeat(50001)}]});assert.equal(response.status,400);
upstreamStatus=503;response=await review(base);assert.equal(response.status,502);
console.log('Report evidence, page limits, scanned pages, session key and API failure checks passed.');
