import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectJPEG,coordinates} from '../exif-reader.mjs';
function jpeg(little=true, invalid=false){
  const t=new Uint8Array(160),v=new DataView(t.buffer);
  const s16=(p,n)=>v.setUint16(p,n,little),s32=(p,n)=>v.setUint32(p,n,little);
  s16(0,little?0x4949:0x4d4d);s16(2,42);s32(4,8);s16(8,3);
  // Camera model, orientation, and EXIF subdirectory.
  s16(10,272);s16(12,2);s32(14,10);s32(18,invalid?9999:110);
  t.set(new TextEncoder().encode('ILCE-6700\0'),110);
  s16(22,274);s16(24,3);s32(26,1);s16(30,6);
  s16(34,34665);s16(36,4);s32(38,1);s32(42,50);
  s16(50,3);
  s16(52,33434);s16(54,5);s32(56,1);s32(60,122);s32(122,1);s32(126,250);
  s16(64,33437);s16(66,5);s32(68,1);s32(72,130);s32(130,28);s32(134,10);
  s16(76,34855);s16(78,3);s32(80,1);s16(84,800);
  const prefix=new Uint8Array([255,216,255,225,0,168,69,120,105,102,0,0]);
  const sof=new Uint8Array([255,192,0,11,8,15,160,23,112,1,1,17,0,255,217]);
  const out=new Uint8Array(prefix.length+t.length+sof.length);out.set(prefix);out.set(t,prefix.length);out.set(sof,prefix.length+t.length);return out.buffer;
}
for(const endian of [true,false])test('EXIF fields and JPEG dimensions: '+(endian?'little':'big')+' endian',()=>{
  const r=inspectJPEG(jpeg(endian));assert.equal(r.tags.model,'ILCE-6700');assert.equal(r.tags.exposure,1/250);assert.equal(r.tags.aperture,2.8);assert.equal(r.tags.iso,800);assert.equal(r.tags.orientation,6);assert.equal(r.width,6000);assert.equal(r.height,4000);assert.deepEqual(r.warnings,[]);
});
test('Malformed EXIF offsets do not prevent file detail inspection',()=>{const r=inspectJPEG(jpeg(true,true));assert.equal(r.width,6000);assert.equal(r.warnings.length,1);});
test('A damaged model field does not hide valid exposure settings',()=>{const r=inspectJPEG(jpeg(true,true));assert.equal(r.tags.exposure,1/250);assert.equal(r.tags.iso,800);assert.equal(r.tags.model,undefined);});
test('Non JPEG and truncated JPEG rejected',()=>{assert.throws(()=>inspectJPEG(new ArrayBuffer(4)));assert.throws(()=>inspectJPEG(jpeg().slice(0,40)));});
test('JPEG without EXIF retains dimensions',()=>{const b=new Uint8Array([255,216,255,192,0,11,8,0,100,0,200,1,1,17,0,255,217]);const r=inspectJPEG(b.buffer);assert.equal(r.exif,false);assert.equal(r.width,200);});
test('GPS references and numeric bounds',()=>{assert.deepEqual(coordinates({gps1:'N',gps2:[41,30,0],gps3:'W',gps4:[87,30,0]}),[41.5,-87.5]);assert.equal(coordinates({gps1:'N',gps2:[91,0,0],gps3:'W',gps4:[87,0,0]}),null);assert.equal(coordinates({}),null);});
