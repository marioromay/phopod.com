import {inspectJPEG} from './exif-reader.mjs?v=phopod-20261015';
import {recordedDate} from './stats-engine.mjs?v=phopod-20261015';
export async function captureDate(file){
 if(!/\.jpe?g$/i.test(file.name)&&file.type!=='image/jpeg')return null;
 try{const raw=inspectJPEG(await file.arrayBuffer()).tags.capture;if(!recordedDate(raw))return null;return raw.slice(0,19).replace(/:/g,'-').replace(' ','T');}catch{return null;}
}
export function orderPhotos(photos,order){
 const copy=[...photos];
 if(order==='filename')copy.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'})||a.index-b.index);
 if(order==='added')copy.sort((a,b)=>a.index-b.index);
 if(order==='date')copy.sort((a,b)=>a.capture&&b.capture?a.capture.localeCompare(b.capture)||a.index-b.index:a.capture?-1:b.capture?1:a.index-b.index);
 return copy;
}
export function movePhoto(photos,from,to){const result=[...photos];if(from<0||to<0||from>=result.length||to>=result.length)return result;result.splice(to,0,result.splice(from,1)[0]);return result;}
