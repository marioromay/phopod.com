import test from 'node:test';import assert from 'node:assert/strict';
const elements=new Map();function element(){return {value:'',checked:false,hidden:true,disabled:false,children:[],files:[],append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},classList:{toggle(){}},removeAttribute(key){delete this[key];},click(){}};}
globalThis.document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element};globalThis.window={addEventListener(){}};
const $=id=>document.getElementById(id);$('prefix').value='chicago';$('start').value='1';$('padding').value='3';$('rename-order').value='added';
let serial=0;const blobs=new Map(),revoked=[];globalThis.URL={createObjectURL(blob){const url='blob:'+ ++serial;blobs.set(url,blob);return url;},revokeObjectURL(url){revoked.push(url);}};
await import('../rename-app.mjs');
const bytes=new Uint8Array([1,7,9]),file={name:'source.HEIC',size:3,arrayBuffer:async()=>bytes.buffer};
test('shared empty upload transitions to naming controls and Clear restores it',async()=>{assert.equal($('rename-empty').hidden,false);assert.equal($('rename-controls').hidden,true);assert.equal($('rename-loaded').hidden,true);$('files').files=[file];await $('files').onchange();assert.equal($('rename-empty').hidden,true);assert.equal($('rename-controls').hidden,false);assert.equal($('rename-loaded').hidden,false);$('clear').onclick();assert.equal($('rename-empty').hidden,false);assert.equal($('rename-loaded').hidden,true);});
test('rename preview matches ZIP names and option edits invalidate downloads',async()=>{
 $('files').files=[file];await $('files').onchange();assert.equal($('rename-list').children[0].children[1].textContent,'chicago-001.HEIC');await $('generate').onclick();assert.equal($('download').hidden,false);
 const url=$('download').href,data=new Uint8Array(await blobs.get(url).arrayBuffer()),length=new DataView(data.buffer).getUint16(26,true);assert.equal(new TextDecoder().decode(data.slice(30,30+length)),'chicago-001.HEIC');assert.deepEqual(data.slice(30+length,33+length),bytes);
 $('prefix').value='walk';$('prefix').oninput();assert.equal($('download').hidden,true);assert.ok(revoked.includes(url));assert.equal($('rename-list').children[0].children[1].textContent,'walk-001.HEIC');
});
test('clear cancels in-flight copying without producing an old ZIP',async()=>{
 let release;$('files').files=[{...file,arrayBuffer:()=>new Promise(r=>{release=r;})}];await $('files').onchange();const pending=$('generate').onclick();await new Promise(r=>setImmediate(r));$('clear').onclick();release(bytes.buffer);await pending;assert.equal($('download').hidden,true);assert.equal($('generate').disabled,true);assert.equal($('rename-list').children.length,0);
});
test('batch limits and invalid numbering are enforced before output',async()=>{
 $('files').files=[{...file,size:501*1024*1024}];await $('files').onchange();assert.match($('message').textContent,/500 MB/);$('files').files=[file];await $('files').onchange();$('start').value='';$('start').oninput();assert.equal($('generate').disabled,true);assert.match($('message').textContent,/Starting number/);
});

test('drop accepts mixed formats without decoding and replacement replaces the selection',async()=>{
 $('clear').onclick();$('start').value='1';const names=['x.jpg','x.png','x.webp','x.heic','x.heif','x.avif','x.tiff','x.dng','x.arw'];
 $('rename-drop').ondrop({preventDefault(){},dataTransfer:{files:names.map(name=>({...file,name}))}});await new Promise(r=>setTimeout(r,30));assert.equal($('rename-list').children.length,9);
 $('files').files=[{...file,name:'replacement.ARW'}];await $('files').onchange();assert.equal($('rename-list').children.length,1);assert.equal($('rename-list').children[0].children[0].textContent,'replacement.ARW');
 let chosen=0;$('files').click=()=>chosen++;$('replace').onclick();$('choose').onclick();assert.equal(chosen,2);
});
