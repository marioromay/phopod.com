import test from 'node:test';import assert from 'node:assert/strict';import {layoutSheet} from '../contact-engine.mjs';import {drawContactPage} from '../contact-renderer.mjs';
test('exported page contains the logo, centered filenames, gutter rules and site referral',async()=>{const text=[],images=[],lines=[],layout=layoutSheet({columns:3}),ctx={textAlign:'left',scale(){},fillRect(){},drawImage(...args){images.push(args);},fillText(...args){text.push({args,align:this.textAlign});},beginPath(){},moveTo(x,y){lines.push([x,y]);},lineTo(x,y){lines.push([x,y]);},stroke(){},measureText(t){return {width:t.length*4};}};const canvas={getContext:()=>ctx},items=[{name:'left.jpg',url:'a',width:600,height:400},{name:'right.jpg',url:'b',width:400,height:600}],requested=[];await drawContactPage(canvas,items,0,layout,()=>true,async url=>{requested.push(url);return {naturalWidth:600,naturalHeight:400};});assert.equal(requested[0],'/brand/phopod-logo.png?v=20261017');assert.equal(images.length,4);const left=text.find(t=>t.args[0]==='left.jpg');assert.equal(left.align,'center');assert.equal(left.args[1],layout.margin+layout.cellWidth/2);assert.ok(text.some(t=>t.args[0]==='Create your own contact sheet with Phopod'));const boundary=layout.margin+layout.cellWidth+layout.gap/2;assert.ok(lines.some(([x,y])=>x===boundary&&y===layout.top));});
test('shoot title and optional photo numbers repeat and continue across pages',async()=>{
 const layout=layoutSheet({columns:4,numbers:true,labels:false,title:'A neighborhood walk'}),text=[],ctx={scale(){},fillRect(){},drawImage(){},fillText(t,x,y){text.push({t,x,y});},beginPath(){},moveTo(){},lineTo(){},stroke(){},measureText(t){return {width:t.length*4};}};
 const items=Array.from({length:layout.capacity+2},(_,i)=>({name:i+'.jpg',url:String(i),width:600,height:400}));
 await drawContactPage({getContext:()=>ctx},items,1,layout,()=>true,async()=>({width:600,height:400}));
 assert.ok(text.some(x=>x.t==='A neighborhood walk'));assert.ok(text.some(x=>x.t===String(layout.capacity+1).padStart(3,'0')));assert.ok(text.some(x=>x.t===String(layout.capacity+2).padStart(3,'0')));assert.ok(!text.some(x=>x.t.endsWith('.jpg')));
 const sanitized=layoutSheet({title:'bad\nname\u0000',numbers:true});assert.equal(sanitized.title,'bad name');assert.equal(sanitized.numberHeight,18);
});
test('blank optional title keeps both logos without printing a wordmark or placeholder',async()=>{
 const layout=layoutSheet({title:'',columns:4}),text=[],images=[],ctx={scale(){},fillRect(){},drawImage(...args){images.push(args);},fillText(t){text.push(t);},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
 await drawContactPage({getContext:()=>ctx},[],0,layout,()=>true,async()=>({width:600,height:400}));
 assert.equal(layout.top,104);assert.ok(!text.includes('Chicago'));assert.ok(!text.includes('INSPECTOR'));assert.ok(!text.includes('FOCUS'));assert.equal(images.length,2);assert.ok(images[0][2]<94);assert.ok(images[1][2]>layout.height-34);assert.equal(layoutSheet({title:'My shoot'}).top,layout.top);
});

test('optional author is centered in the footer without changing page capacity',async()=>{
 const layout=layoutSheet({author:'Mario Romay'}),text=[],ctx={scale(){},fillRect(){},drawImage(){},fillText(t,x,y){text.push({t,x,y,align:this.textAlign});},beginPath(){},moveTo(){},lineTo(){},stroke(){},measureText(t){return {width:t.length*4};}};
 await drawContactPage({getContext:()=>ctx},[],0,layout,()=>true,async()=>({width:600,height:400}));
 const credit=text.find(p=>p.t==='Photographs by Mario Romay');assert.ok(credit);assert.equal(credit.x,layout.width/2);assert.equal(credit.align,'center');assert.equal(layout.capacity,layoutSheet().capacity);assert.equal(layoutSheet({author:'bad\nname\u0000'}).author,'bad name');
});
