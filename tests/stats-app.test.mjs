globalThis.processingProgress={start:()=>1,update(){},finish(){},paint:async()=>{}};
import test from 'node:test';
import assert from 'node:assert/strict';
// Lightweight DOM harness for batch controls; visual browser QA is separate.
function element(){return {textContent:'',value:'',hidden:true,disabled:false,open:false,showModal(){this.open=true;},close(){this.open=false;},focus(){this.focused=true;},scrollIntoView(){this.scrolled=true;},style:{},children:[],handlers:{},classList:{toggle(){},add(){},remove(){}},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},setAttribute(){},addEventListener(type,fn){this.handlers[type]=fn;},click(){},remove(){}};}
const elements=new Map();
globalThis.document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element,createElementNS:element,body:element()};
await import('../stats-app.mjs');
const $=id=>document.getElementById(id);
const jpeg=new Uint8Array([255,216,255,192,0,11,8,0,100,0,200,1,1,17,0,255,217]);
const file=(name='photo.jpg')=>({name,type:'image/jpeg',size:jpeg.length,arrayBuffer:async()=>jpeg.buffer});
test('Batch continues after invalid file; clear resets results',async()=>{
  $('files').files=[file(),{name:'broken.jpg',type:'image/jpeg',size:10,arrayBuffer:async()=>new ArrayBuffer(10)}];
  await $('files').onchange();assert.equal($('count').textContent,'1');assert.equal($('skipped').textContent,'1');assert.equal($('no-exif').textContent,'1');assert.equal($('choose').disabled,false);assert.equal($('export').disabled,false);assert.equal($('issues').hidden,false);
  $('clear').onclick();assert.equal($('results').hidden,true);
});
test('Stop during a read excludes unfinished photograph and re-enables controls',async()=>{
  const pending={...file(),arrayBuffer:async()=>{$('cancel').onclick();return jpeg.buffer;}};
  $('files').files=[pending,file()];await $('files').onchange();assert.equal($('count').textContent,'0');assert.equal($('collection-label').textContent,'Partial collection / Stopped');assert.equal($('choose').disabled,false);assert.equal($('export').disabled,true);assert.match($('message').textContent,/Stopped/);
});
test('Oversized collection is rejected before any file read',async()=>{
  $('files').files=Array(2001).fill(file());await $('files').onchange();assert.match($('message').textContent,/up to 2,000/);assert.equal($('count').textContent,'0');
});
test('sample charts are labeled and cannot be mistaken for an exported collection',()=>{
 $('sample').onclick();assert.equal($('count').textContent,'120');assert.match($('collection-label').textContent,/Sample/);assert.match($('message').textContent,/illustrative values/);assert.equal($('export').disabled,true);assert.equal($('stats-insights').children.length,4);assert.equal($('charts').children.length,9);$('clear').onclick();assert.equal($('results').hidden,true);
});
test('a chart value shows matching photos; missing values, paging and cleanup keep counts consistent',async()=>{
 $('files').files=Array.from({length:25},(_,i)=>file('frame-'+i+'.jpg'));await $('files').onchange();
 assert.equal($('matching-photos').hidden,true);assert.equal($('matching-grid').children.length,0);const initialChart=$('charts').children[6],initialGraph=initialChart.children.find(n=>n.className==='rank-chart');initialGraph.children[0].onclick();assert.equal($('matching-photos').hidden,false);assert.equal($('matching-grid').children.length,24);assert.match($('matching-count').textContent,/25 matching/);
 $('matching-next').onclick();assert.equal($('matching-grid').children.length,1);assert.match($('matching-page').textContent,/2 of 2/);
 $('photo-metric').value='focal';$('photo-metric').onchange();$('photo-value').value='missing';$('photo-value').onchange();assert.match($('matching-count').textContent,/25 matching/);
 // Orientation is known even when EXIF is absent. The seventh chart is orientation.
 const chart=$('charts').children[6],graph=chart.children.find(n=>n.className==='rank-chart');assert.ok(graph);graph.children[0].onclick();assert.equal($('photo-metric').value,'orientation');assert.equal($('photo-value').value,'Landscape');assert.equal($('matching-grid').children.length,24);assert.equal($('count').textContent,'25');
 $('clear').onclick();assert.equal($('matching-photos').hidden,true);assert.equal($('matching-grid').children.length,0);
 $('sample').onclick();assert.equal($('matching-photos').hidden,true);assert.match($('chart-help').textContent,/no associated photographs/);$('clear').onclick();
});
test('Photo Stats HTML exposes real gallery hooks and the shared upload class',async()=>{
 const {readFile}=await import('node:fs/promises');const html=await readFile(new URL('../photo-stats/index.html',import.meta.url),'utf8');
 for(const id of ['matching-photos','photo-metric','photo-value','matching-grid','matching-count','matching-prev','matching-next','matching-page'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/id="dropzone" class="drop"/);assert.match(html,/class="cross"/);assert.ok(html.indexOf('id="charts"')<html.indexOf('id="matching-photos"'));assert.ok(html.includes('id="back-to-charts"'));
});
test('thumbnail previews are released on clear and unfinished previews cannot reappear',async()=>{
 const nativeCreate=URL.createObjectURL,nativeRevoke=URL.revokeObjectURL,create=document.createElement,active=new Set();let finish;
 URL.createObjectURL=value=>{const url=nativeCreate(value);active.add(url);return url;};URL.revokeObjectURL=url=>{active.delete(url);nativeRevoke(url);};
 globalThis.Image=class{naturalWidth=200;naturalHeight=100;decode(){return Promise.resolve();}};
 document.createElement=tag=>tag==='canvas'?{getContext(){return {drawImage(){}};},toBlob(cb){finish=cb;}}:element();
 try{
  $('files').files=[new File([jpeg],'preview.jpg',{type:'image/jpeg'})];await $('files').onchange();const chart=$('charts').children[6];chart.children.find(n=>n.className==='rank-chart').children[0].onclick();
  for(let i=0;i<10&&!finish;i++)await new Promise(r=>setTimeout(r,0));assert.ok(finish);assert.equal(active.size,1);
  $('clear').onclick();finish(new Blob(['thumbnail'],{type:'image/jpeg'}));await new Promise(r=>setTimeout(r,0));assert.equal(active.size,0);assert.equal($('matching-grid').children.length,0);
 }finally{URL.createObjectURL=nativeCreate;URL.revokeObjectURL=nativeRevoke;document.createElement=create;delete globalThis.Image;}
});

test('charts remain the main view; matching photos open on a result click and close without removing charts',async()=>{
 $('files').files=[file('one.jpg')];await $('files').onchange();assert.equal($('charts').children.length,9);assert.equal($('matching-photos').hidden,true);assert.equal($('matching-grid').children.length,0);
 const chart=$('charts').children[6],graph=chart.children.find(n=>n.className==='rank-chart');graph.children[0].onclick();assert.equal($('matching-photos').hidden,false);assert.equal($('charts').children.length,9);assert.equal($('matching-grid').children.length,1);
 $('back-to-charts').onclick();assert.equal($('matching-photos').hidden,true);assert.equal($('matching-grid').children.length,0);assert.equal($('charts').children.length,9);$('clear').onclick();
});

test('analysis brings compact results into focus; Add keeps the collection and Replace starts a new one',async()=>{
 $('clear').onclick();$('files').files=[file('one.jpg')];await $('files').onchange();assert.equal($('stats-upload').hidden,true);assert.equal($('stats-sample').hidden,true);assert.equal($('stats-results-heading').focused,true);assert.equal($('results').scrolled,true);assert.match($('collection-summary').textContent,/1 photograph analyzed/);
 $('stats-add').onclick();$('files').files=[file('two.jpg')];await $('files').onchange();assert.equal($('count').textContent,'2');
 $('stats-replace').onclick();$('files').files=[file('three.jpg')];await $('files').onchange();assert.equal($('count').textContent,'1');
 const graph=$('charts').children[6].children.find(n=>n.className==='rank-chart');graph.children[0].onclick();assert.equal($('matching-photos').open,true);$('back-to-charts').onclick();assert.equal($('matching-photos').open,false);assert.equal($('matching-grid').children.length,0);
 $('clear').onclick();assert.equal($('stats-upload').hidden,false);assert.equal($('stats-sample').hidden,false);
});

test('hybrid puts camera and lens shares first and retains ordered settings bars',()=>{
 $('sample').onclick();const charts=$('charts').children;for(const i of [0,1]){const graph=charts[i].children.find(n=>n.className==='donut-chart');assert.ok(graph);assert.ok(graph.children[1].children.length>0);assert.ok(graph.children[1].children.every(n=>n.disabled));}assert.ok(charts[2].children.some(n=>n.className==='rank-chart'));assert.ok(charts[5].children.some(n=>n.className==='column-chart hourly-chart'));$('clear').onclick();
});

test('inspection report uses the real HTML controls, rejects sample exports and invalidates on collection changes',async()=>{
 const {readFile}=await import('node:fs/promises');const html=await readFile(new URL('../photo-stats/index.html',import.meta.url),'utf8');for(const id of ['inspection-report','inspection-heading','open-report','report-facts','report-pattern','report-title','report-author','report-paper','report-download','report-close','report-message','report-status'])assert.ok(html.includes('id="'+id+'"'));
 $('sample').onclick();assert.equal($('open-report').disabled,true);$('open-report').onclick();assert.equal($('inspection-report').open,false);
 $('stats-replace').onclick();$('files').files=[file('repeated.jpg'),file('repeated.jpg')];await $('files').onchange();assert.equal($('open-report').disabled,false);$('open-report').onclick();assert.equal($('inspection-report').open,true);assert.equal($('report-facts').children[7].children[1].textContent,'1 names / 1 extra occurrences');$('stats-add').onclick();$('files').files=[file('other.jpg')];await $('files').onchange();assert.equal($('inspection-report').open,false);$('open-report').onclick();assert.match($('report-facts').children[0].children[1].textContent,/3/);$('clear').onclick();assert.equal($('inspection-report').open,false);
});

test('PDF downloads locally; collection replacement during logo preparation cannot download a stale report',async()=>{
 const create=document.createElement,active=new Set(),nativeCreate=URL.createObjectURL,nativeRevoke=URL.revokeObjectURL;let downloads=0,pending=null;
 URL.createObjectURL=value=>{const url=nativeCreate(value);active.add(url);return url;};URL.revokeObjectURL=url=>{active.delete(url);nativeRevoke(url);};
 globalThis.Image=class{naturalWidth=240;naturalHeight=240;decode(){return pending?new Promise(r=>{pending=r;}):Promise.resolve();}};
 document.createElement=tag=>tag==='canvas'?{getContext(){return {fillRect(){},drawImage(){}};},toBlob(cb){cb(new Blob(['logo'],{type:'image/jpeg'}));}}:tag==='a'?{...element(),click(){downloads++;}}:element();
 try{
  $('files').files=[file()];await $('files').onchange();$('report-paper').value='letter';$('open-report').onclick();await $('report-download').onclick();assert.equal(downloads,1);assert.equal(active.size,1);assert.match($('report-message').textContent,/PDF download requested/);
  pending=true;const task=$('report-download').onclick();assert.equal(typeof pending,'function');const resume=pending;$('clear').onclick();resume();await task;assert.equal(downloads,1);assert.equal(active.size,0);assert.equal($('inspection-report').open,false);
 }finally{URL.createObjectURL=nativeCreate;URL.revokeObjectURL=nativeRevoke;document.createElement=create;delete globalThis.Image;}
});
