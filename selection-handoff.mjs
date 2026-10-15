// Deliberate same-tab transfer of originals. Never sends photograph data over the network.
const ticketKey='inspector-focus-selection-handoff',ttl=120000,prefix='selection:';
function database(){return new Promise((resolve,reject)=>{
 if(!globalThis.indexedDB)return reject(Error('Browser storage is unavailable.'));
 const request=indexedDB.open('inspector-focus-transfer',1);
 let expired=false;const timer=setTimeout(()=>{expired=true;reject(Error('Browser storage is unavailable.'));},3000);
 request.onupgradeneeded=()=>request.result.createObjectStore('handoff');
 request.onerror=request.onblocked=()=>{clearTimeout(timer);reject(Error('Browser storage is unavailable.'));};
 request.onsuccess=()=>{clearTimeout(timer);if(expired)request.result.close();else resolve(request.result);};
});}
async function transaction(action){const db=await database();try{return await new Promise((resolve,reject)=>{
 const tx=db.transaction('handoff','readwrite');let value;
 action(tx.objectStore('handoff'),result=>{value=result;});
 tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(Error('The selection could not be transferred.'));
});}finally{db.close();}}
function prune(store){const request=store.openCursor();request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;if(String(cursor.key).startsWith(prefix)&&cursor.value.expires<=Date.now())cursor.delete();cursor.continue();};}
export function validateSelection(files){if(!Array.isArray(files)||!files.length||files.length>300||files.reduce((n,f)=>n+f.size,0)>500*1024*1024)throw Error('Batch Rename accepts up to 300 photographs totaling 500 MB or less.');if(files.some(f=>!f||typeof f.arrayBuffer!=='function'||!Number.isFinite(f.size)||!(/\.(jpe?g|png|webp|heic|heif|avif|tiff?|dng|arw)$/i.test(f.name))))throw Error('The selection contains a file Batch Rename cannot use.');return files;}
const destinations=new Set(['/batch-rename/','/contact-sheet/','/photo-viewer/']);
export function transferContext(context={}){return {title:String(context.title||'').replace(/[\x00-\x1f\x7f]/g,' ').slice(0,80),author:String(context.author||'').replace(/[\x00-\x1f\x7f]/g,' ').slice(0,80),labels:context.labels!==false,numbers:context.numbers!==false};}
export async function stageSelection(files,path='/batch-rename/',context={}){
 if(!destinations.has(path))throw Error('Unsupported selection destination.');
 validateSelection(files);const token=crypto.randomUUID(),key=prefix+token;
 let previous;try{previous=JSON.parse(sessionStorage.getItem(ticketKey));}catch{}
 await transaction(store=>{prune(store);if(previous?.token)store.delete(prefix+previous.token);store.put({files,path,context:transferContext(context),token,expires:Date.now()+ttl},key);});
 try{sessionStorage.setItem(ticketKey,JSON.stringify({token,path}));}catch(error){await transaction(store=>store.delete(key));throw error;}
 return token;
}
export async function discardSelection(token){try{const ticket=JSON.parse(sessionStorage.getItem(ticketKey));if(ticket?.token===token)sessionStorage.removeItem(ticketKey);}finally{await transaction(store=>store.delete(prefix+token));}}
export async function consumeCollection(path){
 if(!globalThis.indexedDB||!globalThis.sessionStorage)return null;
 let ticket;try{ticket=JSON.parse(sessionStorage.getItem(ticketKey));sessionStorage.removeItem(ticketKey);}catch{return null;}
 const record=await transaction((store,done)=>{prune(store);if(!ticket?.token)return;const key=prefix+ticket.token,request=store.get(key);request.onsuccess=()=>{store.delete(key);done(request.result);};});
 if(!record||record.token!==ticket.token||record.path!==path||record.expires<=Date.now())return null;
 return {files:validateSelection(record.files),context:transferContext(record.context)};
}

export async function consumeSelection(path){return (await consumeCollection(path))?.files??null;}
