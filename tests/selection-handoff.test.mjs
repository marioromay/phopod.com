import test from 'node:test';import assert from 'node:assert/strict';import {File} from 'node:buffer';
import {stageSelection,consumeSelection,discardSelection,validateSelection} from '../selection-handoff.mjs';
import {renamePlan} from '../rename-engine.mjs';import {makeZIP} from '../zip-engine.mjs';
const records=new Map(),tickets=new Map();let fail=false,failTicket=false;
globalThis.sessionStorage={setItem(k,v){if(failTicket)throw Error('Session storage blocked');tickets.set(k,v);},getItem:k=>tickets.get(k)||null,removeItem:k=>tickets.delete(k)};
// Emulate asynchronous IDB request/transaction completion, keeping File objects.
globalThis.indexedDB={open(){const request={};queueMicrotask(()=>{if(fail){request.onerror();return;}request.result={close(){},transaction(){const tx={};let pending=0;function schedule(fn){pending++;setTimeout(()=>{fn();if(--pending===0)tx.oncomplete?.();},0);}tx.objectStore=()=>({put(v,k){schedule(()=>records.set(k,v));},delete(k){schedule(()=>records.delete(k));},get(k){const req={};schedule(()=>{req.result=records.get(k);req.onsuccess?.();});return req;},openCursor(){const req={},entries=[...records];let i=0;function advance(){schedule(()=>{const entry=entries[i++];req.result=entry?{key:entry[0],value:entry[1],delete(){records.delete(entry[0]);},continue:advance}:null;req.onsuccess?.();});}advance();return req;}});return tx;}};request.onsuccess();});return request;}};
const originals=[new File([new Uint8Array([255,216,7,9,0,255])],'z.JPG',{type:'image/jpeg'}),new File(['RAW bytes and private metadata'],'a.ARW')];
test('ordered original files transfer once, preserve bytes through rename ZIP, and consume storage',async()=>{
 await stageSelection(originals);const files=await consumeSelection('/batch-rename/');assert.deepEqual(files.map(f=>f.name),['z.JPG','a.ARW']);assert.equal(records.size,0);assert.equal(tickets.size,0);assert.equal(await consumeSelection('/batch-rename/'),null);
 const plan=renamePlan(files.map((file,index)=>({file,name:file.name,index})),{prefix:'walk',order:'added'});assert.deepEqual(plan.map(p=>p.newName),['walk-001.JPG','walk-002.ARW']);
 const zip=new Uint8Array(await makeZIP(await Promise.all(plan.map(async p=>({name:p.newName,bytes:new Uint8Array(await p.file.arrayBuffer())})))).arrayBuffer());let offset=0;
 for(const p of plan){const view=new DataView(zip.buffer),size=view.getUint32(offset+18,true),nameLength=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true),start=offset+30+nameLength+extra;assert.equal(new TextDecoder().decode(zip.slice(offset+30,offset+30+nameLength)),p.newName);assert.deepEqual(zip.slice(start,start+size),new Uint8Array(await p.file.arrayBuffer()));offset=start+size;}
});
test('expiry, wrong destination, replacement and cancellation delete temporary originals',async()=>{
 await stageSelection(originals);[...records.values()][0].expires=Date.now()-1;assert.equal(await consumeSelection('/batch-rename/'),null);assert.equal(records.size,0);
 await stageSelection(originals);assert.equal(await consumeSelection('/contact-sheet/'),null);assert.equal(records.size,0);
 await stageSelection(originals);const ticket=await stageSelection([originals[1]]);assert.equal(records.size,1);await discardSelection(ticket);assert.equal(records.size,0);assert.equal(tickets.size,0);
});
test('abandoned expiry cleanup respects unrelated single-photo transfers and active other-tab selections',async()=>{
 records.set('current',{file:originals[0],expires:0});records.set('selection:old',{files:originals,expires:0});records.set('selection:other-tab',{files:originals,expires:Date.now()+120000});
 assert.equal(await consumeSelection('/batch-rename/'),null);assert.ok(records.has('current'));assert.ok(!records.has('selection:old'));assert.ok(records.has('selection:other-tab'));records.clear();
});
test('storage and ticket failures are recoverable without leaving a newly staged selection',async()=>{
 fail=true;await assert.rejects(()=>stageSelection(originals),/storage is unavailable/);fail=false;
 failTicket=true;await assert.rejects(()=>stageSelection(originals),/Session storage blocked/);failTicket=false;assert.equal(records.size,0);
});
test('handoff enforces the receiving tool count, size and supported formats',()=>{
 assert.throws(()=>validateSelection([]),/300/);assert.throws(()=>validateSelection(Array(301).fill(originals[0])),/300/);assert.throws(()=>validateSelection([{name:'huge.jpg',size:501*1024*1024,arrayBuffer(){}}]),/500 MB/);assert.throws(()=>validateSelection([new File(['bad'],'x.exe')]),/cannot use/);
});
test('receiving Batch Rename loads the transfer in order, waits for explicit export and clears normally',async()=>{
 const elements=new Map();function element(){return {value:'',checked:false,hidden:true,disabled:false,children:[],files:[],append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},classList:{toggle(){},add(){},remove(){}},removeAttribute(k){delete this[k];},click(){}};}
 globalThis.document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element};globalThis.window={addEventListener(){}};
 const $=id=>document.getElementById(id);$('prefix').value='photo';$('start').value='1';$('padding').value='3';$('rename-order').value='filename';
 const outputs=new Map();let serial=0;globalThis.URL={createObjectURL(blob){const url='blob:'+ ++serial;outputs.set(url,blob);return url;},revokeObjectURL(){}};
 await stageSelection([originals[1],originals[0]]);await import('../rename-app.mjs');
 for(let i=0;i<30&&$('rename-list').children.length!==2;i++)await new Promise(r=>setTimeout(r,5));
 assert.equal($('rename-order').value,'added');assert.deepEqual($('rename-list').children.map(row=>row.children[0].textContent),['a.ARW','z.JPG']);assert.equal(records.size,0);assert.equal($('rename-empty').hidden,true);assert.equal(outputs.size,0);assert.equal($('download').hidden,true);
 $('prefix').value='arranged';$('prefix').oninput();await $('generate').onclick();assert.equal($('download').hidden,false);assert.equal(outputs.size,1);$('clear').onclick();assert.equal($('rename-list').children.length,0);assert.equal($('rename-empty').hidden,false);
});
