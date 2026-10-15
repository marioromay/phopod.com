import test from 'node:test';import assert from 'node:assert/strict';
import {orderPhotos,movePhoto,captureDate} from '../photo-order.mjs';
import {renamePlan} from '../rename-engine.mjs';import {makeZIP} from '../zip-engine.mjs';
const photos=[{name:'frame10.HEIC',index:0,capture:null},{name:'frame2.jpg',index:1,capture:'2026-10-10T12-00-00'},{name:'frame1.PNG',index:2,capture:'2026-10-09T10-00-00'}];
test('sorting and manual moves keep selection order recoverable and missing dates last',()=>{
 assert.deepEqual(orderPhotos(photos,'filename').map(p=>p.index),[2,1,0]);assert.deepEqual(orderPhotos(photos,'date').map(p=>p.index),[2,1,0]);
 const moved=movePhoto(photos,2,0);assert.deepEqual(moved.map(p=>p.index),[2,0,1]);assert.deepEqual(orderPhotos(moved,'added').map(p=>p.index),[0,1,2]);assert.deepEqual(photos.map(p=>p.index),[0,1,2]);assert.deepEqual(movePhoto(photos,-1,0),photos);
});
test('names preserve extensions, sanitize unsafe paths and report missing dates explicitly',()=>{
 const plan=renamePlan(photos,{prefix:'Chicago / walk',start:8,padding:3,date:true,order:'date'});
 assert.deepEqual(plan.map(p=>p.newName),['2026-10-09-Chicago - walk-008.PNG','2026-10-10-Chicago - walk-009.jpg','undated-Chicago - walk-010.HEIC']);
 assert.throws(()=>renamePlan(photos,{start:1.5}),/Starting number/);assert.throws(()=>renamePlan(photos,{padding:0}),/padding/);
 assert.equal(renamePlan(photos,{prefix:'',start:0,padding:1})[0].newName,'photo-0.HEIC');
});
test('rename ZIP stores the original bytes under the planned names',async()=>{
 const original=new Uint8Array([255,216,0,12,45,255,217]),name='Chicago-001.HEIC',blob=makeZIP([{name,bytes:original}]),bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer),length=view.getUint16(26,true);
 assert.equal(new TextDecoder().decode(bytes.slice(30,30+length)),name);assert.deepEqual(bytes.slice(30+length,30+length+original.length),original);
});
test('capture dates never fall back to filesystem times or assume HEIC metadata support',async()=>{
 assert.equal(await captureDate({name:'frame.heic',lastModified:123,arrayBuffer(){throw Error('must not read');}}),null);
 assert.equal(await captureDate({name:'bad.jpg',arrayBuffer:async()=>new ArrayBuffer(2)}),null);
});
