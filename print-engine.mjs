export const printSizes=[{id:'4x6',short:4,long:6},{id:'8x10',short:8,long:10},{id:'11x14',short:11,long:14},{id:'16x20',short:16,long:20},{id:'20x30',short:20,long:30},{id:'24x36',short:24,long:36}];
export function printFit(width,height,size,orientation='auto',position=.5){
  if(![width,height,size.short,size.long].every(n=>Number.isFinite(n)&&n>0))throw new Error('Image and print dimensions must be positive.');
  const landscape=orientation==='landscape'||orientation==='auto'&&width>=height;
  const printWidth=landscape?size.long:size.short,printHeight=landscape?size.short:size.long;
  const ratio=printWidth/printHeight;
  let cropWidth=width,cropHeight=height;
  if(width/height>ratio)cropWidth=height*ratio;else cropHeight=width/ratio;
  const offset=Number.isFinite(position)?Math.max(0,Math.min(1,position)):.5;
  const x=(width-cropWidth)*offset,y=(height-cropHeight)*offset;
  const retained=cropWidth*cropHeight/(width*height),ppi=Math.min(cropWidth/printWidth,cropHeight/printHeight);
  return {x,y,cropWidth,cropHeight,printWidth,printHeight,ppi,lost:Math.max(0,1-retained),cropRequired:Math.abs(width/height-ratio)>1e-9,axis:width-cropWidth>1e-6?'horizontal':height-cropHeight>1e-6?'vertical':null};
}
export function resolutionGuide(ppi){return ppi>=300?{label:'High detail',tone:'high'}:ppi>=200?{label:'Good detail',tone:'good'}:ppi>=150?{label:'Lower detail',tone:'modest'}:{label:'Low resolution',tone:'low'};}
export function sizeLabel(size,unit='in'){return unit==='cm'?`${Number((size.short*2.54).toFixed(2))} × ${Number((size.long*2.54).toFixed(2))} cm`:`${size.short} × ${size.long} in`;}
