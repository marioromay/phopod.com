// Transfer only on a deliberate tool change. The record is consumed and deleted
// by the destination; it is never uploaded or used as a photo library.
const routes=new Set(['/exif/','/print-size/','/resize/','/crop/','/export/','/remove-metadata/']);
const key='inspector-focus-handoff';const ttl=120000;
function database(){return new Promise((resolve,reject)=>{
 if(!globalThis.indexedDB)return reject(Error('Browser storage is unavailable.'));
 const request=indexedDB.open('inspector-focus-transfer',1);const timer=setTimeout(()=>reject(Error('Browser storage is unavailable.')),3000);
 request.onupgradeneeded=()=>request.result.createObjectStore('handoff');request.onerror=request.onblocked=()=>{clearTimeout(timer);reject(Error('Browser storage is unavailable.'));};request.onsuccess=()=>{clearTimeout(timer);resolve(request.result);};
});}
async function transaction(action){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('handoff','readwrite'),store=tx.objectStore('handoff');let value;const request=action(store);if(request)request.onsuccess=()=>{value=request.result;};tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(Error('The photograph could not be transferred.'));});}finally{db.close();}}
export function eligible(file,path){return routes.has(path)&&(!['/exif/','/remove-metadata/'].includes(path)||file.type==='image/jpeg'||/\.jpe?g$/i.test(file.name));}
export async function stage(file,path){
 const token=crypto.randomUUID(),record={file,path,token,expires:Date.now()+ttl};
 await transaction(store=>{store.clear();return store.put(record,'current');});
 try{sessionStorage.setItem(key,JSON.stringify({token,path}));}catch(error){await transaction(store=>store.clear());throw error;}
}
export async function consume(path){
 if(!globalThis.indexedDB||!globalThis.sessionStorage)return null;
 let ticket;try{ticket=JSON.parse(sessionStorage.getItem(key));sessionStorage.removeItem(key);}catch{return null;}
 try{const record=await transaction(store=>{const request=store.get('current');request.addEventListener('success',()=>{if(recordExpired(request.result)||ticket?.token===request.result?.token)store.delete('current');});return request;});
  return ticket&&record&&record.token===ticket.token&&record.path===path&&record.expires>Date.now()?record.file:null;
 }catch{return null;}
}
function recordExpired(record){return record&&record.expires<=Date.now();}
let current=null,revision=0,moving=false;
export function setCurrentFile(file){current=file;revision++;const links=document.getElementById('next-tools');if(links){links.hidden=!file;for(const a of links.querySelectorAll('a'))a.hidden=!!file&&!eligible(file,new URL(a.href,location.href).pathname);}}
export function connectWorkspace(load,untouched){
 document.addEventListener?.('click',async event=>{
  const link=event.target.closest?.('a');if(!link||event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target==='_blank')return;
  const path=new URL(link.href,location.href).pathname;if(!current||path===location.pathname||!eligible(current,path))return;
  event.preventDefault();if(moving)return;moving=true;const run=revision;const status=document.getElementById('message');if(status)status.textContent='Opening the same photograph in the next tool…';
  try{await stage(current,path);if(run===revision)location.assign(path);}catch{if(status)status.textContent='Your browser could not carry the photograph between tools. Clear it to navigate, then choose it again in the next tool.';}finally{moving=false;}
 });
 if(globalThis.location)void consume(location.pathname).then(file=>{if(file&&untouched())return load(file);});
}
