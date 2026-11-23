import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from '../worker/index.js';

const html=await (await worker.fetch(new Request('https://local/'),{})).text();
const start=html.indexOf('let ocrLoad;');const end=html.indexOf('async function runRealReport',start);
assert(start>=0&&end>start);
let calls=0,terminated=false,fail=false;
const ocrWorker={recognize:async()=>{calls++;if(fail)throw Error('mock failure');return {data:{text:'시험 결과 12 ppm',confidence:65}}},terminate:async()=>{terminated=true}};
const context={window:{Tesseract:{createWorker:async langs=>{assert.deepEqual(Array.from(langs),['kor','eng']);return ocrWorker}}},document:{createElement:()=>({width:0,height:0,getContext:()=>({})})}};
vm.createContext(context);vm.runInContext(html.slice(start,end),context);
const page=(native)=>({getTextContent:async()=>({items:native?[{str:native}]:[]}),getViewport:({scale})=>({width:600*scale,height:800*scale}),render:()=>({promise:Promise.resolve()})});
const pdf={numPages:2,getPage:async i=>page(i===1?'Native text':'')};
let result=await context.extractReportPages(pdf,{});
assert.equal(calls,2);assert(terminated);assert(result.pages[0].text.includes('Native text'));assert(result.pages[1].text.includes('12 ppm'));assert.deepEqual(Array.from(result.lowConfidence),[1,2]);assert.equal(result.ocrFailures.length,0);
fail=true;terminated=false;result=await context.extractReportPages(pdf,{});assert.deepEqual(Array.from(result.ocrFailures),[1,2]);assert(terminated);assert(result.pages[0].text.includes('Native text'));assert.equal(result.pages[1].text,'');
console.log('Mixed PDF OCR, confidence, fallback and worker cleanup checks passed.');
