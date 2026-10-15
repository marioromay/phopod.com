// Hit regions use the same page/cell geometry as the unchanged PDF renderer.
export function sheetSlots(count,page,layout){
 const start=page*layout.capacity;
 return Array.from({length:Math.max(0,Math.min(layout.capacity,count-start))},(_,slot)=>({
  position:start+slot,
  left:100*(layout.margin+(slot%layout.columns)*(layout.cellWidth+layout.gap))/layout.width,
  top:100*(layout.top+Math.floor(slot/layout.columns)*(layout.cellHeight+layout.gap))/layout.height,
  width:100*layout.cellWidth/layout.width,height:100*layout.cellHeight/layout.height
 }));
}
export function destinationPosition(value,count){const n=Number(value);if(!String(value).trim()||!Number.isInteger(n)||n<1||n>count)throw Error(`Choose a position from 1 to ${count}.`);return n-1;}
