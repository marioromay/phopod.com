import test from 'node:test';import assert from 'node:assert/strict';
function element(){return {textContent:'',value:'',hidden:true,disabled:false,src:'',style:{},handlers:{},classList:{toggle(){},add(){},remove(){}},removeAttribute(key){delete this[key];},addEventListener(key,fn){this.handlers[key]=fn;},click(){},querySelectorAll(){return [];}};}
const elements=new Map();let finishEncoding;
globalThis.document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement(){return {getContext(){return {fillRect(){},drawImage(){}};},toBlob(callback){finishEncoding=callback;}};}};
globalThis.window={addEventListener(){}};
globalThis.Image=class {naturalWidth=6000;naturalHeight=4000;async decode(){}};
let serial=0;const revoked=[];globalThis.URL={createObjectURL:()=>`blob:local-${++serial}`,revokeObjectURL:url=>revoked.push(url)};
const $=id=>document.getElementById(id);$('long-edge').value='2400';$('quality').value='85';
await import('../resize-app.mjs');
function file(){const bytes=new Uint8Array([255,216]);return {name:'street.jpg',size:1000,slice(){return {arrayBuffer:async()=>bytes.buffer};}};}
async function load(){ $('file').files=[file()];await $('file').onchange(); }
test('Export download reflects settings and disappears when settings change',async()=>{
  await load();assert.equal($('output-dimensions').textContent,'2,400 × 1,600 px');assert.equal($('export').disabled,false);
  const encoding=$('export').onclick();finishEncoding(new Blob(['jpeg'],{type:'image/jpeg'}));await encoding;
  assert.equal($('download').hidden,false);assert.equal($('download').download,'street-2400x1600.jpg');assert.equal($('preview-label').textContent,'Export preview');
  const previous=$('download').href;$('quality').value='90';$('quality').oninput();assert.equal($('download').hidden,true);assert.ok(revoked.includes(previous));assert.equal($('preview-label').textContent,'Original preview');
});
test('Clear cancels an in-flight export and resets controls',async()=>{
  const encoding=$('export').onclick();$('clear').onclick();finishEncoding(new Blob(['jpeg'],{type:'image/jpeg'}));await encoding;
  assert.equal($('download').hidden,true);assert.equal($('image-view').hidden,true);assert.equal($('export').disabled,true);assert.equal($('quality').value,'85');
});
test('Replacing the image during export cannot publish the previous download',async()=>{
  await load();const encoding=$('export').onclick();await load();finishEncoding(new Blob(['old jpeg'],{type:'image/jpeg'}));await encoding;
  assert.equal($('download').hidden,true);assert.equal($('export').disabled,false);assert.equal($('preview-label').textContent,'Original preview');
});
