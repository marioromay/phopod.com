export const ratios=[['original','Original'],['1:1','1:1 · square'],['4:5','4:5 · portrait'],['3:2','3:2 · landscape'],['2:3','2:3 · portrait'],['16:9','16:9 · landscape'],['9:16','9:16 · vertical']];
export function cropFrame(width,height,ratio='original',horizontal=.5,vertical=.5,zoom=1){
 if(![width,height].every(n=>Number.isSafeInteger(n)&&n>0))throw Error('Invalid image dimensions.');
 if(!ratios.some(r=>r[0]===ratio))throw Error('Choose a supported aspect ratio.');
 if(!Number.isFinite(zoom)||zoom<1||zoom>4)throw Error('Crop zoom must be from 1 to 4.');
 if(ratio==='original'&&zoom===1)return {x:0,y:0,width,height,lost:0};
 const target=ratio==='original'?width/height:ratio.split(':').map(Number).reduce((a,b)=>a/b);
 const cropWidth=Math.min(width,Math.max(1,Math.floor(Math.min(width,height*target)/zoom))),cropHeight=Math.min(height,Math.max(1,Math.floor(Math.min(height,width/target)/zoom)));
 const clamp=n=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):.5;
 return {x:Math.round((width-cropWidth)*clamp(horizontal)),y:Math.round((height-cropHeight)*clamp(vertical)),width:cropWidth,height:cropHeight,lost:1-cropWidth*cropHeight/(width*height)};
}

export function cropRect(width,height,ratio='original',zoom=1,x=.5,y=.5){
 if(![width,height].every(n=>Number.isInteger(n)&&n>0))throw Error('Invalid image dimensions.');
 const r=ratio==='original'?width/height:Number(ratio);
 if(!Number.isFinite(r)||r<=0||!Number.isFinite(zoom)||zoom<1||zoom>4)throw Error('Invalid crop settings.');
 const w=Math.max(1,Math.floor(Math.min(width,height*r)/zoom));
 const h=Math.max(1,Math.min(height,Math.round(w/r)));
 return {x:Math.round((width-w)*Math.max(0,Math.min(1,x))),y:Math.round((height-h)*Math.max(0,Math.min(1,y))),width:w,height:h};
}
