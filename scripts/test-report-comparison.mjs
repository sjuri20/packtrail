import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from '../worker/index.js';

const html=await (await worker.fetch(new Request('https://local/'),{})).text();
const start=html.indexOf('function compareConfirmedValues('),end=html.indexOf('async function runRealReport',start);
assert(start>=0&&end>start);
function element(tag){return {tag,children:[],style:{},value:'',checked:false,textContent:'',append(...x){this.children.push(...x)},setAttribute(){},addEventListener(){}}}
const context={URL,document:{createElement:element,createTextNode:text=>({text})},link:(title,url)=>({title,url})};vm.createContext(context);vm.runInContext(html.slice(start,end),context);
assert.equal(context.compareConfirmedValues('100','100','le'),true);assert.equal(context.compareConfirmedValues('100','100','lt'),false);assert.equal(context.compareConfirmedValues('100.000000000001','100','le'),false);assert.equal(context.compareConfirmedValues('<1','100','le'),null);assert.equal(context.compareConfirmedValues('1e2','100','le'),null);
function run(quote,value,unit,limitUnit,checked=true){const panel=context.createComparisonControls({quote});const labels=panel.children.filter(x=>x.tag==='label');const inputs=labels.slice(0,5).map(x=>x.children[0]);inputs[0].value=value;inputs[1].value=unit;inputs[2].value='100';inputs[3].value=limitUnit;inputs[4].value='https://example.org/rule';const rel=labels[5].children[0];rel.value='le';labels[6].children[0].checked=checked;const btn=panel.children.find(x=>x.tag==='button');btn.onclick();return panel.children.at(-1).textContent}
assert.match(run('Result 3.4 mg/kg','3.4','mg/kg','mg/kg'),/항목 적합/);
assert.match(run('Result 104 mg/kg','104','mg/kg','mg/kg'),/항목 부적합/);
assert.match(run('Result < 3.4 mg/kg','3.4','mg/kg','mg/kg'),/판정 보류/);
assert.match(run('Result -3.4 mg/kg','3.4','mg/kg','mg/kg'),/판정 보류/);
assert.match(run('Result less than 3.4 mg/kg','3.4','mg/kg','mg/kg'),/판정 보류/);
assert.match(run('Result 3.4 mg/kg','3.4','mg/kg','ppm'),/판정 보류/);
assert.match(run('Result 3.4 mg/kg','3.4','mg/kg','mg/kg',false),/판정 보류/);
assert.match(run('Result 13.4 mg/kg','3.4','mg/kg','mg/kg'),/판정 보류/);
const prefill=context.createComparisonControls({quote:'Overall migration 3.4 mg/dm²'});const prefilled=prefill.children.filter(x=>x.tag==='label').slice(0,2).map(x=>x.children[0].value);assert.deepEqual(prefilled,['3.4','mg/dm²']);
const negative=context.createComparisonControls({quote:'Result -3.4 mg/kg'});assert.equal(negative.children.filter(x=>x.tag==='label')[0].children[0].value,'');
console.log('Item comparison, equality, precision, qualifiers, unit and confirmation checks passed.');
