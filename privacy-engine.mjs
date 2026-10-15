import {inspectJPEG} from './exif-reader.mjs?v=phopod-20261015';
const text=bytes=>new TextDecoder('latin1').decode(bytes);
const starts=(bytes,s)=>s.split('').every((c,i)=>bytes[i]===c.charCodeAt(0));
export function jpegSegments(buffer){
 const b=new Uint8Array(buffer),v=new DataView(buffer);if(b.length<4||b[0]!==255||b[1]!==216)throw Error('Choose a JPEG photograph.');
 const segments=[{start:0,end:2,marker:0xd8}];let p=2,finished=false;
 while(p<b.length){
  const start=p;if(b[p++]!==255)throw Error('The JPEG structure is damaged.');while(b[p]===255)p++;if(p>=b.length)throw Error('The JPEG is incomplete.');const marker=b[p++];
  if(marker===0xd9){segments.push({start,end:p,marker});finished=true;break;}
  if(marker===0xd8||marker===0)throw Error('Invalid JPEG marker.');
  if(marker===1||marker>=0xd0&&marker<=0xd7){segments.push({start,end:p,marker});continue;}
  if(p+2>b.length)throw Error('The JPEG is incomplete.');const length=v.getUint16(p),dataStart=p+2,end=p+length;if(length<2||end>b.length)throw Error('The JPEG is incomplete.');
  segments.push({start,end,marker,dataStart});p=end;
  if(marker===0xda){const scan=p;while(p<b.length){if(b[p]!==255){p++;continue;}let next=p+1;while(b[next]===255)next++;if(next>=b.length)break;const code=b[next];if(code===0||code>=0xd0&&code<=0xd7){p=next+1;continue;}break;}segments.push({start:scan,end:p,marker:null});}
 }
 if(!finished)throw Error('No JPEG end marker was found.');if(!segments.some(s=>s.marker===0xda))throw Error('No JPEG image scan was found.');return {segments,end:p,trailing:b.length-p};
}
function kind(segment,buffer){const data=new Uint8Array(buffer,segment.dataStart??segment.start,segment.end-(segment.dataStart??segment.start));
 if(segment.marker===0xfe)return 'comments';
 if(segment.marker<0xe0||segment.marker>0xef||segment.marker===null)return null;
 if(segment.marker===0xe1&&starts(data,'Exif\0\0'))return 'exif';
 if(segment.marker===0xe1&&text(data.slice(0,80)).includes('adobe.com/'))return 'xmp';
 if(segment.marker===0xed)return 'iptc';
 if(segment.marker===0xe2&&starts(data,'ICC_PROFILE\0'))return 'icc';
 if(segment.marker===0xee&&starts(data,'Adobe'))return 'color';
 return 'other';
}
export function privacyReport(buffer){
 const parsed=jpegSegments(buffer),inspection=inspectJPEG(buffer),counts={exif:0,xmp:0,iptc:0,comments:0,other:0,icc:0,color:0};
 for(const segment of parsed.segments){const k=kind(segment,buffer);if(k)counts[k]++;}
 return {...parsed,counts,inspection,removable:Object.entries(counts).some(([k,n])=>!['icc','color'].includes(k)&&n>0)||parsed.trailing>0};
}
export function orientationEXIF(orientation){
 if(!Number.isInteger(orientation)||orientation<2||orientation>8)return new Uint8Array();
 const b=new Uint8Array(36),v=new DataView(b.buffer);b.set([255,225,0,34,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0]);v.setUint16(20,274,true);v.setUint16(22,3,true);v.setUint32(24,1,true);v.setUint16(28,orientation,true);return b;
}
export function removeMetadata(buffer){
 const report=privacyReport(buffer),parts=[];const orientation=orientationEXIF(report.inspection.tags.orientation);
 for(const s of report.segments){const k=kind(s,buffer);if(k&&!['icc','color'].includes(k))continue;parts.push(new Uint8Array(buffer,s.start,s.end-s.start));if(s.marker===0xd8&&orientation.length)parts.push(orientation);}
 const length=parts.reduce((n,p)=>n+p.length,0),result=new Uint8Array(length);let at=0;for(const p of parts){result.set(p,at);at+=p.length;}
 // Re-read output before presenting it as a cleaned copy.
 const after=privacyReport(result.buffer);if(after.counts.xmp||after.counts.iptc||after.counts.comments||after.counts.other||after.trailing||after.inspection.gps)throw Error('The cleaned JPEG did not pass verification.');
 return {bytes:result,report,after,orientationRetained:orientation.length>0};
}
