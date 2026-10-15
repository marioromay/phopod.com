import {helveticaHex} from './helvetica.mjs?v=phopod-20261015';
export function layoutSheet({paper='letter',orientation='portrait',columns=4,labels=true,numbers=false,title='',author=''}={}){
  if(!['letter','a4'].includes(paper)||!['portrait','landscape'].includes(orientation)||![2,3,4,5,6].includes(Number(columns)))throw Error('Invalid page settings.');
  let [width,height]=paper==='a4'?[595.28,841.89]:[612,792];
  if(orientation==='landscape')[width,height]=[height,width];
  columns=Number(columns);const shootTitle=String(title).replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,80);const margin=32,gap=16,top=104,bottom=46,labelHeight=labels?18:0,numberHeight=numbers?18:0;
  const cellWidth=(width-2*margin-gap*(columns-1))/columns;
  const rows=Math.max(1,Math.floor((height-top-bottom+gap)/(cellWidth*.78+labelHeight+numberHeight+gap)));
  const cellHeight=(height-top-bottom-gap*(rows-1))/rows;
  return {width,height,margin,gap,top,columns,rows,capacity:columns*rows,cellWidth,cellHeight,labelHeight,numberHeight,title:shootTitle,author:String(author).replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,80)};
}
export function fitImage(width,height,boxWidth,boxHeight){
  if(![width,height,boxWidth,boxHeight].every(n=>Number.isFinite(n)&&n>0))throw Error('Invalid image dimensions.');
  const scale=Math.min(boxWidth/width,boxHeight/height);return {width:width*scale,height:height*scale};
}
export function sortPhotos(photos,order){return order==='filename'?[...photos].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'})||a.index-b.index):[...photos];}
// A small image-only PDF writer. Page artwork is rendered locally on canvas,
// including labels, so filenames never require PDF text escaping or font uploads.
export function makePDF(pages,width,height){
  if(!pages.length)throw Error('No pages to export.');
  const enc=new TextEncoder(),chunks=[],offsets=[0],fontRegular=3+pages.length*3,fontBold=fontRegular+1;let length=0;
  const append=value=>{const bytes=typeof value==='string'?enc.encode(value):value;chunks.push(bytes);length+=bytes.length;};
  const obj=(id,body)=>{offsets[id]=length;append(`${id} 0 obj\n`);append(body);append('\nendobj\n');};
  append('%PDF-1.4\n% Phopod\n');
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
  for(let i=0;i<pages.length;i++){
    const p=pages[i],id=3+i*3;
    obj(id,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> /XObject << /Im0 ${id+1} 0 R >> >> /Contents ${id+2} 0 R /Annots [<< /Type /Annot /Subtype /Link /Rect [${width/2-145} 8 ${width/2+145} 26] /Border [0 0 0] /A << /S /URI /URI (https://phopod.com/contact-sheet/) >> >>] >>`);
    offsets[id+1]=length;append(`${id+1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`);append(p.bytes);append('\nendstream\nendobj\n');
    let content=`q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`;
    for(const text of p.text||[]){
      const rgb=/^#([0-9a-f]{6})$/i.exec(text.color);if(!rgb)throw Error('Invalid PDF text color.');
      const color=[0,2,4].map(n=>parseInt(rgb[1].slice(n,n+2),16)/255).map(n=>n.toFixed(4)).join(' ');
      content+=`BT /${text.bold?'F2':'F1'} ${text.size} Tf ${color} rg 1 0 0 1 ${text.x.toFixed(3)} ${(height-text.y).toFixed(3)} Tm <${helveticaHex(text.value)}> Tj ET\n`;
    }
    obj(id+2,`<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream`);
  }
  obj(fontRegular,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  obj(fontBold,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const start=length;append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for(const offset of offsets.slice(1))append(`${String(offset).padStart(10,'0')} 00000 n \n`);
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);
  return new Blob(chunks,{type:'application/pdf'});
}
