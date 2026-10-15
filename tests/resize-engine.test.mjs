import test from 'node:test';
import assert from 'node:assert/strict';
import {resizeDimensions,imageFormat,exportFilename,encodeJpeg} from '../resize-engine.mjs';
test('Long edge sizing retains landscape, portrait and square ratios without upscaling',()=>{
  assert.deepEqual(resizeDimensions(6000,4000,2400),{width:2400,height:1600,reduced:true});
  assert.deepEqual(resizeDimensions(4000,6000,1600),{width:1067,height:1600,reduced:true});
  assert.deepEqual(resizeDimensions(3000,3000,600),{width:600,height:600,reduced:true});
  assert.deepEqual(resizeDimensions(800,600,2400),{width:800,height:600,reduced:false});
  assert.equal(resizeDimensions(6000,1,100).height,1);
});
test('Invalid settings and excessive output are rejected',()=>{
  for(const size of [0,99,6001,NaN,200.5])assert.throws(()=>resizeDimensions(6000,4000,size));
  assert.throws(()=>resizeDimensions(0,4000,2400));
  assert.throws(()=>resizeDimensions(6000,6000,6000),/24 megapixels/);
});
test('Supported signatures and export names are independent of extension labels',()=>{
  assert.equal(imageFormat(new Uint8Array([255,216])),'JPEG');
  assert.equal(imageFormat(new Uint8Array([137,80,78,71,13,10,26,10])),'PNG');
  assert.equal(imageFormat(new TextEncoder().encode('RIFF0000WEBP')),'WebP');
  assert.throws(()=>imageFormat(new TextEncoder().encode('not a photo')));
  assert.equal(exportFilename('Street.Walk.PNG',2400,1600),'Street.Walk-2400x1600.jpg');
  assert.equal(exportFilename('../a:b.jpg',100,100),'.._a_b-100x100.jpg');
});
function canvasFor(blob){const calls=[];const context={fillRect(...args){calls.push(['fill',...args]);},drawImage(...args){calls.push(['draw',...args]);}};const canvas={getContext:(kind,options)=>{calls.push([kind,options]);return context;},toBlob(callback,type,quality){calls.push([type,quality]);callback(blob);}};return {canvas,context,calls};}
test('JPEG encoding uses white background and selected quality, then releases canvas pixels',async()=>{
  const blob=new Blob(['jpeg'],{type:'image/jpeg'}),mock=canvasFor(blob),image={};
  assert.equal(await encodeJpeg(image,{width:2400,height:1600},85,()=>mock.canvas),blob);
  assert.equal(mock.context.fillStyle,'#ffffff');assert.equal(mock.context.imageSmoothingQuality,'high');
  assert.deepEqual(mock.calls[1],['fill',0,0,2400,1600]);assert.deepEqual(mock.calls[2],['draw',image,0,0,2400,1600]);
  assert.deepEqual(mock.calls[3],['image/jpeg',.85]);assert.equal(mock.canvas.width,0);assert.equal(mock.canvas.height,0);
});
test('Encoder failure and format fallback never return a mislabeled JPEG',async()=>{
  for(const blob of [null,new Blob([],{type:'image/jpeg'}),new Blob(['png'],{type:'image/png'})]){
    const mock=canvasFor(blob);await assert.rejects(encodeJpeg({}, {width:100,height:100},85,()=>mock.canvas));assert.equal(mock.canvas.width,0);
  }
  await assert.rejects(encodeJpeg({}, {width:100,height:100},0));
});
