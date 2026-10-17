import {helveticaText,helveticaWidth} from './helvetica.mjs?v=phopod-20261015';
import {fitImage} from './contact-engine.mjs?v=phopod-20261015';
const logos=new WeakMap();
function shortLabel(ctx,text,width){text=helveticaText(text).replace(/[\x00-\x1f\x7f]/g,' ');if(textWidth(ctx,text)<=width)return text;let end=text.length;while(end>0&&textWidth(ctx,text.slice(0,end)+'…')>width)end--;return text.slice(0,end)+'…';}
function textWidth(ctx,text){return helveticaWidth(text,parseFloat(ctx.font.match(/[\d.]+px/)[0]),ctx.font.startsWith('bold'));}
function writeText(target,ctx,text,x,y,vector){
 const value=helveticaText(text),size=parseFloat(ctx.font.match(/[\d.]+px/)[0]),bold=ctx.font.startsWith('bold'),width=helveticaWidth(value,size,bold);
 const left=x-(ctx.textAlign==='center'?width/2:ctx.textAlign==='right'?width:0);
 target.sheetText.push({value,x:left,y,size,bold,color:ctx.fillStyle});
 if(!vector)ctx.fillText(value,x,y);
}
export async function drawContactPage(target,ordered,index,layout,active,loadImage){
 target.sheetText=[];const text=(...args)=>writeText(target,ctx,...args,layout.pdfText);const scale=layout.renderScale||2;target.width=Math.round(layout.width*scale);target.height=Math.round(layout.height*scale);const ctx=target.getContext('2d',{alpha:false});ctx.scale(scale,scale);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,layout.width,layout.height);
 if(!logos.has(loadImage))logos.set(loadImage,loadImage('/brand/phopod-logo.png?v=20261017').catch(error=>{logos.delete(loadImage);throw error;}));
 const logo=await logos.get(loadImage);if(!active())return false;
 ctx.fillStyle='#111111';ctx.fillRect(layout.margin,18,layout.width-2*layout.margin,76);
 const headerLogo=fitImage(logo.naturalWidth||logo.width,logo.naturalHeight||logo.height,54,56);ctx.drawImage(logo,layout.margin+14+(54-headerLogo.width)/2,28+(56-headerLogo.height)/2,headerLogo.width,headerLogo.height);
 ctx.fillStyle='#ffffff';ctx.textAlign='right';ctx.font='bold 20px Helvetica';
 if(layout.title)text(shortLabel(ctx,layout.title,layout.width-2*layout.margin-100),layout.width-layout.margin-14,53);
 ctx.font='8px Helvetica';text('PAGE '+String(index+1).padStart(2,'0')+' / '+String(Math.ceil(ordered.length/layout.capacity)).padStart(2,'0'),layout.width-layout.margin-14,75);
 ctx.fillStyle='#d7352b';ctx.fillRect(layout.margin,layout.top-10,layout.width-2*layout.margin,2);
 ctx.strokeStyle='#bbb';ctx.lineWidth=.35;
 const start=index*layout.capacity,count=Math.min(layout.capacity,ordered.length-start),usedRows=Math.ceil(count/layout.columns),usedColumns=Math.min(layout.columns,count),gridBottom=layout.top+usedRows*layout.cellHeight+(usedRows-1)*layout.gap;
 // Thin rules fall in the gutter, outside the photograph and filename areas.
 ctx.beginPath();for(let col=1;col<usedColumns;col++){const x=layout.margin+col*(layout.cellWidth+layout.gap)-layout.gap/2;ctx.moveTo(x,layout.top);ctx.lineTo(x,gridBottom);}for(let row=1;row<usedRows;row++){const y=layout.top+row*(layout.cellHeight+layout.gap)-layout.gap/2;ctx.moveTo(layout.margin,y);ctx.lineTo(layout.width-layout.margin,y);}ctx.stroke();
 for(let i=0;i<count;i++){
  if(!active())return false;const photo=ordered[start+i],image=await loadImage(photo.url);if(!active())return false;
  const x=layout.margin+(i%layout.columns)*(layout.cellWidth+layout.gap),y=layout.top+Math.floor(i/layout.columns)*(layout.cellHeight+layout.gap),boxHeight=layout.cellHeight-layout.labelHeight-(layout.numberHeight||0),fit=fitImage(photo.width,photo.height,layout.cellWidth,boxHeight);
  ctx.drawImage(image,x+(layout.cellWidth-fit.width)/2,y+(layout.numberHeight||0)+(boxHeight-fit.height)/2,fit.width,fit.height);image.src='';
  if(layout.numberHeight){ctx.fillStyle='#d7352b';ctx.textAlign='center';ctx.font='bold 7.5px Helvetica';text(String(start+i+1).padStart(3,'0'),x+layout.cellWidth/2,y+10);}
  if(layout.labelHeight){ctx.fillStyle='#333333';ctx.textAlign='center';ctx.font='8px Helvetica';text(shortLabel(ctx,photo.name,layout.cellWidth-4),x+layout.cellWidth/2,y+layout.cellHeight-5);}
 }
 ctx.beginPath();ctx.moveTo(layout.margin,layout.height-34);ctx.lineTo(layout.width-layout.margin,layout.height-34);ctx.stroke();
 const footerLogo=fitImage(logo.naturalWidth||logo.width,logo.naturalHeight||logo.height,20,20);ctx.drawImage(logo,layout.margin+(20-footerLogo.width)/2,layout.height-31+(20-footerLogo.height)/2,footerLogo.width,footerLogo.height);
 ctx.fillStyle='#555555';ctx.font='7.5px Helvetica';
 if(layout.author){ctx.textAlign='center';ctx.font='7px Helvetica';text(shortLabel(ctx,'Photographs by '+layout.author,layout.width-2*layout.margin-80),layout.width/2,layout.height-27);ctx.font='7.5px Helvetica';}
 ctx.textAlign='left';text(`${ordered.length} photographs`,layout.margin+28,layout.height-16);ctx.textAlign='center';text('Create your own contact sheet with Phopod',layout.width/2,layout.height-16);ctx.textAlign='right';text(`${index+1} / ${Math.ceil(ordered.length/layout.capacity)}`,layout.width-layout.margin,layout.height-16);ctx.textAlign='left';return true;
}
