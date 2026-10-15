import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeToTarget,targetFileBytes} from '../resize-engine.mjs';
const dimensions={width:2400,height:1600};
const run=(encode,limit=100000,format='jpeg',cancel=()=>false)=>encodeToTarget({},dimensions,85,()=>{}, {x:10,y:20,width:3000,height:2000},format,'#ffffff',limit,cancel,encode);
const blob=size=>new Blob([new Uint8Array(size)]);
test('decimal file-size limits are validated in explicit units',()=>{
 assert.equal(targetFileBytes(2,'MB'),2000000);assert.equal(targetFileBytes(500,'KB'),500000);
 for(const [v,u] of [[0,'MB'],['no','KB'],[Infinity,'MB'],[51,'MB'],[1,'GB'],[9,'KB']])assert.throws(()=>targetFileBytes(v,u));
});
test('already fitting export keeps requested quality and dimensions',async()=>{
 let calls=0;const r=await run(async()=>{calls++;return blob(99999);});assert.equal(calls,1);assert.equal(r.quality,85);assert.deepEqual(r.dimensions,dimensions);
});
test('quality search returns a measured fitting result without resizing',async()=>{
 const r=await run(async(_i,d,q)=>blob(q*1500));assert.equal(r.quality,66);assert.ok(r.blob.size<=100000);assert.deepEqual(r.dimensions,dimensions);
});
test('oversized exports shrink from the same original crop and never upscale',async()=>{
 const calls=[];const r=await run(async(_i,d,q,_c,crop)=>{calls.push({d:{...d},q,crop});return blob(Math.round(d.width*d.height*q/100));});
 assert.ok(r.blob.size<=100000);assert.ok(r.dimensions.width<2400);assert.ok(r.dimensions.height<1600);
 assert.ok(calls.every(c=>c.crop.x===10&&c.crop.width===3000));assert.ok(Math.abs(r.dimensions.width/r.dimensions.height-1.5)<.01);
});
test('PNG remains lossless and shrinks dimensions; impossible limits fail',async()=>{
 const r=await run(async(_i,d)=>blob(d.width*d.height),100000,'png');assert.equal(r.quality,null);assert.ok(r.blob.size<=100000);
 await assert.rejects(run(async()=>blob(100001)),/could not meet/);
});
test('cancel between attempts prevents further encodes or returning a result',async()=>{
 let cancelled=false,calls=0;await assert.rejects(run(async()=>{calls++;cancelled=true;return blob(10);},100000,'jpeg',()=>cancelled),/cancelled/);assert.equal(calls,1);
});
