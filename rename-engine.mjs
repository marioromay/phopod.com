import {orderPhotos} from './photo-order.mjs?v=phopod-20261015';
export function renamePlan(photos,{prefix='photo',start=1,padding=3,date=false,order='added'}={}){
 if(!Number.isSafeInteger(start)||start<0||start>999999999)throw Error('Starting number must be between 0 and 999999999.');
 if(!Number.isInteger(padding)||padding<1||padding>9)throw Error('Number padding must be between 1 and 9.');
 const clean=String(prefix).trim().replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g,'-').replace(/[. ]+$/g,'').slice(0,80)||'photo',used=new Set();
 return orderPhotos(photos,order).map((p,i)=>{const extension=p.name.match(/\.[a-z0-9]+$/i)?.[0]||'',stem=(date?(p.capture?.slice(0,10)||'undated')+'-':'')+clean+'-'+String(start+i).padStart(padding,'0');let name=stem+extension,n=2;while(used.has(name.toLowerCase()))name=stem+'-'+n+++extension;used.add(name.toLowerCase());return {...p,newName:name};});
}
