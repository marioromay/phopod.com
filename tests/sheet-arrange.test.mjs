import test from 'node:test';import assert from 'node:assert/strict';import {sheetSlots,destinationPosition} from '../sheet-arrange.mjs';import {layoutSheet} from '../contact-engine.mjs';
test('interactive slots align with PDF grid for all paper, orientation, columns and label settings',()=>{
 for(const paper of ['letter','a4'])for(const orientation of ['portrait','landscape'])for(const columns of [2,3,4,5,6])for(const labels of [true,false])for(const numbers of [true,false]){
  const layout=layoutSheet({paper,orientation,columns,labels,numbers}),slots=sheetSlots(layout.capacity+2,1,layout);assert.equal(slots.length,2);assert.equal(slots[0].position,layout.capacity);assert.equal(slots[0].left,100*layout.margin/layout.width);assert.equal(slots[0].top,100*layout.top/layout.height);
  for(const slot of sheetSlots(layout.capacity,0,layout)){assert.ok(slot.left>=0&&slot.left+slot.width<=100);assert.ok(slot.top>=0&&slot.top+slot.height<=100);assert.equal(slot.width,100*layout.cellWidth/layout.width);}
 }
});
test('position controls accept whole numbers in the collection and reject invalid destinations',()=>{assert.equal(destinationPosition('300',300),299);assert.equal(destinationPosition('1',300),0);for(const value of ['',0,-1,301,'abc',1.5])assert.throws(()=>destinationPosition(value,300),/Choose a position/);});
