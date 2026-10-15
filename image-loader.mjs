import {imageFormat} from './resize-engine.mjs?v=phopod-20261015';
function decodeURL(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('This browser cannot decode this photograph.'));image.src=url;if(typeof image.decode==='function')image.decode().then(()=>resolve(image),reject);});}
export async function loadPhotograph(file,{signal}={}){
 if(file.size>50*1024*1024)throw Error('Choose an image up to 50 MB.');
 const format=imageFormat(new Uint8Array(await file.slice(0,256).arrayBuffer()));
 let url=URL.createObjectURL(file);
 try{
  let image;
  try{image=await decodeURL(url);}catch(error){
   if(format!=='HEIC')throw Error(format==='AVIF'?'AVIF decoding is unavailable in this browser. Try JPEG, PNG or WebP.':error.message);
   if(signal?.aborted)throw Error('Cancelled.');
   const data=await new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./heic-worker.js',import.meta.url));
    const finish=(error,value)=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);worker.terminate();error?reject(error):resolve(value);};
    const cancel=()=>finish(Error('Cancelled.'));
    const timer=setTimeout(()=>finish(Error('HEIC decoding timed out. Try a smaller photograph.')),90_000);
    signal?.addEventListener('abort',cancel,{once:true});
    worker.onmessage=event=>event.data.error?finish(Error('HEIC could not be decoded: '+event.data.error)):finish(null,event.data.imageData);
    worker.onerror=()=>finish(Error('HEIC decoding is unavailable in this browser.'));
    file.arrayBuffer().then(buffer=>{if(signal?.aborted)cancel();else worker.postMessage({id:'decode',buffer},[buffer]);},finish);
   });
   if(signal?.aborted)throw Error('Cancelled.');
   const canvas=document.createElement('canvas');canvas.width=data.width;canvas.height=data.height;
   let blob;try{canvas.getContext('2d').putImageData(data,0,0);blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));}finally{canvas.width=canvas.height=0;}
   if(!blob)throw Error('HEIC preview could not be created.');
   URL.revokeObjectURL(url);url=URL.createObjectURL(blob);image=await decodeURL(url);
  }
  if(signal?.aborted)throw Error('Cancelled.');
  if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>60_000_000)throw Error('Choose a readable photograph up to 60 MP.');
  return {image,url,format};
 }catch(error){URL.revokeObjectURL(url);throw error;}
}
