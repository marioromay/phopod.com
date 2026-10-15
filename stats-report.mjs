import {metrics,entries,label} from './stats-engine.mjs?v=phopod-20261015';
import {helveticaWidth,helveticaHex,helveticaText} from './helvetica.mjs?v=phopod-20261015';
const number=n=>n.toLocaleString('en-US');
const clean=value=>String(value||'').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,80);
export function weightedMedian(values){
 const sorted=[...values].sort((a,b)=>a[0]-b[0]),count=sorted.reduce((s,[,n])=>s+n,0);if(!count)return null;
 const at=index=>{let seen=0;for(const [value,n] of sorted){seen+=n;if(seen>index)return Number(value);}};
 return (at(Math.floor((count-1)/2))+at(Math.floor(count/2)))/2;
}
export function inspectionReport(stats,photos=[],{skipped=0,partial=false,title='',author='',generated=new Date().toISOString().slice(0,10)}={}){
 const groups=metrics.map(m=>{const g=stats.groups[m.id],rows=entries(stats,m.id).map(([key,count])=>({key,value:label(m.id,key),count,percent:g.known?count/g.known*100:0}));return {...m,known:g.known,missing:stats.count-g.known,rows};});
 const peak=id=>{const g=groups.find(g=>g.id===id),max=Math.max(0,...g.rows.map(r=>r.count)),winners=g.rows.filter(r=>r.count===max);return {values:winners.map(r=>r.value),count:max,known:g.known,percent:g.known?max/g.known*100:0};};
 const names=new Map();let largest=null,dimensionsKnown=0;const ratios=new Map();
 for(const photo of photos){names.set(photo.file.name,(names.get(photo.file.name)||0)+1);const w=photo.width,h=photo.height;if(Number.isFinite(w)&&Number.isFinite(h)&&w>0&&h>0){dimensionsKnown++;if(!largest||w*h>largest.width*largest.height)largest={width:w,height:h};const gcd=(a,b)=>b?gcd(b,a%b):a,divisor=gcd(w,h),ratio=w/divisor+':'+h/divisor;ratios.set(ratio,(ratios.get(ratio)||0)+1);}}
 const repeated=[...names.values()].filter(n=>n>1),iso=groups.find(g=>g.id==='iso'),median=weightedMedian(iso.rows.map(r=>[r.key,r.count]));
 const facts=[['Photographs analyzed',number(stats.count)],['With shooting details',number(stats.withSettings)],['No EXIF container',number(stats.noEXIF)],['Incomplete metadata reads',number(stats.partial)],['Skipped files',number(skipped)],['Cameras / lenses detected',groups.find(g=>g.id==='camera').rows.length+' / '+groups.find(g=>g.id==='lens').rows.length],['Median ISO / recorded range',median===null?'Not recorded':number(median)+' / '+number(iso.rows[0].key)+'-'+number(iso.rows.at(-1).key)],['Repeated filenames',number(repeated.length)+' names / '+number(repeated.reduce((s,n)=>s+n-1,0))+' extra occurrences'],['Largest image dimensions',largest?number(largest.width)+' × '+number(largest.height)+' px':'Not available'],['Uncropped size at 300 PPI',largest?(largest.width/300).toFixed(1)+' × '+(largest.height/300).toFixed(1)+' in':'Not available'],['Distinct aspect ratios',number(ratios.size)+' / '+number(dimensionsKnown)+' images with dimensions'],['Recorded capture dates',stats.first?stats.first+(stats.last!==stats.first?' to '+stats.last:''):'Not recorded']];
 const insights=[['Most-used focal length',peak('focal')],['Most-used aperture',peak('aperture')],['Most-used shutter range',peak('shutter')],['Busiest recorded hour',peak('hour')]];
 const result={count:stats.count,title:clean(title),author:clean(author),generated,partial,groups,facts,insights};
 result.unsupported=[result.title,result.author,...groups.flatMap(g=>g.rows.map(r=>r.value))].some(t=>helveticaText(t)!==t);return result;
}
const ink='#111111',red='#ce241b',muted='#606060';
const rgb=c=>[1,3,5].map(i=>(parseInt(c.slice(i,i+2),16)/255).toFixed(4)).join(' ');
export function reportPDF(report,{paper='letter',logo=null}={}){
 if(!report.count)throw Error('Analyze photographs before exporting a report.');
 if(!['letter','a4'].includes(paper))throw Error('Choose US Letter or A4.');
 const [W,H]=paper==='a4'?[595.28,841.89]:[612,792],M=36,C=W-2*M,pages=[];let page;
 const text=(value,x,y,size=10,bold=false,color=ink)=>{page.push(`BT /${bold?'F2':'F1'} ${size} Tf ${rgb(color)} rg 1 0 0 1 ${x.toFixed(2)} ${(H-y).toFixed(2)} Tm <${helveticaHex(value)}> Tj ET`);};
 const rect=(x,y,w,h,color=ink)=>page.push(`${rgb(color)} rg ${x.toFixed(2)} ${(H-y-h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
 const fit=(value,width,size=10,bold=false)=>{let s=String(value);if(helveticaWidth(s,size,bold)<=width)return s;while(s.length&&helveticaWidth(s+'...',size,bold)>width)s=s.slice(0,-1);return s+'...';};
 const wrap=(value,width,size=10,bold=false)=>{const lines=[];let line='';for(const char of String(value)){if(helveticaWidth(line+char,size,bold)>width){const space=line.lastIndexOf(' ');if(space>0){lines.push(line.slice(0,space));line=line.slice(space+1);}else{lines.push(line);line='';}}line+=char;}if(line)lines.push(line);return lines;};
 const paragraph=(value,x,y,width,size=9,bold=false,color=muted)=>{const lines=wrap(value,width,size,bold);for(const [i,line] of lines.entries())text(line,x,y+i*(size+4),size,bold,color);return y+lines.length*(size+4);};
 const newPage=section=>{
  page=[];pages.push(page);const tx=logo?M+58:M;
  if(logo){const scale=44/Math.max(logo.width,logo.height),w=logo.width*scale,h=logo.height*scale;page.push(`q ${w.toFixed(3)} 0 0 ${h.toFixed(3)} ${M} ${(H-24-h).toFixed(3)} cm /Logo Do Q`);}
  text('INSPECTION REPORT',tx,43,17,true);
  let y=62;if(report.title)y=paragraph(report.title,tx,y,W-M-tx,12,true,ink);
  const metadata=(report.author?'Photographer: '+report.author+' / ':'')+'Report date: '+report.generated;
  y=paragraph(metadata,tx,y,W-M-tx,8,false,muted);
  if(report.partial)y=paragraph('Partial collection / completed reads only',tx,y,W-M-tx,8,false,red);
  const rule=y+6;rect(M,rule,C,1.5,red);
  rect(M,H-45,C,.5,'#cccccc');text('Inspection report by Phopod.',M,H-29,8,false,muted);text('Get yours with Phopod',M,H-17,8,false,muted);
  if(section){text(section,M,rule+31,20,true);return rule+62;}
  return rule+20;
 };
 let y=newPage(null);
 text(number(report.count),M,y+35,42,true,red);text('PHOTOGRAPHS ANALYZED',M+160,y+28,10,true);y+=62;
 for(const [key,value] of report.facts.slice(1)){rect(M,y-10,C,.4,'#dddddd');text(key,M,y+4,9);text(fit(value,C*.53,9,true),M+C*.47,y+4,9,true);y+=22;}
 y+=17;text('YOUR SHOOTING PATTERN',M,y,12,true);y+=23;
 for(const [title,peak] of report.insights){const values=peak.values.join(' / ');text(title,M,y,9);text(fit(values||'Not recorded',C*.53,10,true),M+C*.47,y,10,true);y+=16;text(peak.known?number(peak.count)+' each / '+peak.percent.toFixed(1)+'% of '+number(peak.known)+' known'+(peak.values.length>1?' / '+peak.values.length+' tied values':''):'No recorded values',M+C*.47,y,8,false,muted);y+=18;}
 paragraph('Percentages exclude missing values. Times use recorded camera time without time-zone conversion. Repeated filenames do not establish duplicate photos; near-duplicates are not assessed. Print size is a pixel estimate, not a quality guarantee.',M,y+2,C,8);
 const appendix=[];
 function panel(id,x,y,width,height){
 const g=report.groups.find(g=>g.id===id);text(g.title.toUpperCase(),x,y,12,true);text(number(g.known)+' known / '+number(g.missing)+' missing',x,y+18,8,false,muted);y+=38;
 if(!g.known){text('No recorded values.',x,y,11,false,muted);return;}
 const rows=g.rows.slice(0,8),max=Math.max(...g.rows.map(r=>r.count));
 for(const row of rows){text(fit(row.value,width-90,9),x,y,9);text(number(row.count)+' / '+row.percent.toFixed(1)+'%',x+width-83,y,8);rect(x,y+7,width,4,'#eeeeee');rect(x,y+7,width*row.percent/100,4,row.count===max?red:ink);y+=24;}
 if(g.rows.length>rows.length||rows.some(r=>fit(r.value,width-90,9)!==r.value)){text((g.rows.length>rows.length?'First 8 of '+g.rows.length+' values. ':'')+'Full table in appendix.',x,y+1,8,false,muted);appendix.push(g);}
 paragraph(g.note,x,y+18,width,8);
 }
 let top=newPage('01 / YOUR EQUIPMENT');panel('camera',M,top,C,245);panel('lens',M,top+275,C,245);
 top=newPage('02 / CAMERA SETTINGS');const gap=26,col=(C-gap)/2;panel('focal',M,top,col,245);panel('aperture',M+col+gap,top,col,245);panel('iso',M,top+275,col,245);panel('shutter',M+col+gap,top+275,col,245);
 top=newPage('03 / TIME & FORMAT');const hour=report.groups.find(g=>g.id==='hour');text('RECORDED SHOOTING HOUR',M,top,12,true);text(number(hour.known)+' known / '+number(hour.missing)+' missing',M,top+18,8,false,muted);
 const max=Math.max(0,...hour.rows.map(r=>r.count)),barW=C/24,baseline=top+165;for(let h=0;h<24;h++){const n=hour.rows.find(r=>r.key===h)?.count||0,barH=max?n/max*112:0;rect(M+h*barW,baseline-barH,barW-4,barH,n&&n===max?red:ink);if(h%3===0)text(String(h).padStart(2,'0'),M+h*barW,top+182,8);}
 text(max?'Bar scale: 0-'+number(max)+' photos. Exact hour counts below.':'No valid recorded times.',M,top+37,8,false,muted);
 for(let h=0;h<24;h++){const n=hour.rows.find(r=>r.key===h)?.count||0;text(String(h).padStart(2,'0')+': '+n,M+(h%8)*C/8,top+206+Math.floor(h/8)*14,8);}
 text(hour.note,M,top+261,8,false,muted);const formatTop=Math.min(top+296,H-315);panel('orientation',M,formatTop,col,220);panel('month',M+col+gap,formatTop,col,220);
 // Only truncated charts need an appendix; all exact recorded categories remain available.
 for(const g of appendix){let y=newPage('EXACT VALUES / '+g.title.toUpperCase());const tableHead=()=>{text(g.note,M,y,8,false,muted);y+=22;text(number(g.known)+' known / '+number(g.missing)+' missing',M,y,8,false,muted);y+=24;text('VALUE',M,y,9,true);text('PHOTOS',W-166,y,9,true);text('% KNOWN',W-104,y,9,true);y+=24;};tableHead();for(const row of g.rows){const lines=wrap(row.value,C-155,9);let pos=0;while(pos<lines.length){if(y+24>H-55){y=newPage('EXACT VALUES / '+g.title.toUpperCase());tableHead();}const capacity=Math.max(1,Math.floor((H-55-y-9)/13)),chunk=lines.slice(pos,pos+capacity),height=Math.max(24,chunk.length*13+9);for(const [i,line] of chunk.entries())text(line,M,y+i*13,9);text(number(row.count),W-166,y,9);text(row.percent.toFixed(1)+'%',W-104,y,9);rect(M,y+height-10,C,.4,'#dddddd');y+=height;pos+=chunk.length;if(pos<lines.length){y=newPage('EXACT VALUES / '+g.title.toUpperCase());tableHead();}}}}
 // Searchable vector lettering and charts; JPEG logo is the only raster artwork.
 const enc=new TextEncoder(),chunks=[],offsets=[0];let length=0;const append=s=>{const b=typeof s==='string'?enc.encode(s):s;chunks.push(b);length+=b.length;};const obj=(id,s)=>{offsets[id]=length;append(`${id} 0 obj\n${s}\nendobj\n`);};
 append('%PDF-1.4\n% Phopod report\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${5+i*2} 0 R`).join(' ')}] >>`);obj(3,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');obj(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');const logoId=5+pages.length*2;
 for(const [i,p] of pages.entries()){page=p;text((i+1)+' / '+pages.length,W-70,H-17,8,false,muted);const id=5+i*2;obj(id,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${logo?`/XObject << /Logo ${logoId} 0 R >>`:''} >> /Contents ${id+1} 0 R /Annots [<< /Type /Annot /Subtype /Link /Rect [${M} 10 ${W-100} 38] /Border [0 0 0] /A << /S /URI /URI (https://phopod.com/) >> >>] >>`);const content=p.join('\n')+'\n';obj(id+1,`<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream`);}
 if(logo){offsets[logoId]=length;append(`${logoId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.bytes.length} >>\nstream\n`);append(logo.bytes);append('\nendstream\nendobj\n');}
 const start=length;append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);for(const offset of offsets.slice(1))append(`${String(offset).padStart(10,'0')} 00000 n \n`);append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);return new Blob(chunks,{type:'application/pdf'});
}
export async function reportLogo(){
 const image=new Image();image.src='/brand/inspector-focus.png';await image.decode();
 const scale=Math.min(1,600/Math.max(image.naturalWidth,image.naturalHeight)),width=Math.max(1,Math.round(image.naturalWidth*scale)),height=Math.max(1,Math.round(image.naturalHeight*scale));
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
 const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.98));canvas.width=canvas.height=0;if(!blob)throw Error('Could not prepare the report logo.');return {width,height,bytes:new Uint8Array(await blob.arrayBuffer())};
}
