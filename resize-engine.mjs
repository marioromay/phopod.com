export function resizeDimensions(width, height, longEdge) {
  if (![width,height].every(n=>Number.isSafeInteger(n)&&n>0)) throw new Error('Invalid image dimensions.');
  if (!Number.isInteger(longEdge)||longEdge<100||longEdge>6000) throw new Error('Enter a long edge from 100 to 6,000 pixels.');
  const scale=Math.min(1,longEdge/Math.max(width,height));
  const output={width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
  if(output.width*output.height>24_000_000) throw new Error('Choose a smaller long edge. This version exports up to 24 megapixels.');
  return {...output,reduced:scale<1};
}
export function imageFormat(bytes) {
  if(bytes[0]===255&&bytes[1]===216)return 'JPEG';
  if([137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return 'PNG';
  if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')return 'WebP';
  if(new TextDecoder().decode(bytes.slice(4,8))==='ftyp'){
    const brands=new TextDecoder().decode(bytes.slice(8));
    if(/avif|avis/.test(brands))return 'AVIF';
    if(/heic|heix|hevc|hevx|mif1|msf1/.test(brands))return 'HEIC';
  }
  throw new Error('Choose a JPEG, PNG, WebP, HEIC/HEIF or AVIF photograph.');
}
export function exportFilename(name,width,height,format='jpeg') {
  const stem=String(name).replace(/\.[^.]*$/,'').replace(/[\x00-\x1f<>:"/\\|?*]/g,'_').slice(0,120)||'photograph';
  return `${stem}-${width}x${height}.${format==='jpeg'?'jpg':format}`;
}
export function outputDimensions(width,height,longEdge,original=false){
 if(!original)return resizeDimensions(width,height,longEdge);
 if(![width,height].every(n=>Number.isSafeInteger(n)&&n>0)||width*height>60_000_000)throw Error('Original-size export supports up to 60 MP.');
 return {width,height,reduced:false};
}
export function encodeJpeg(image,dimensions,quality,makeCanvas=()=>document.createElement('canvas'),crop=null){return encodeImage(image,dimensions,quality,makeCanvas,crop);}
export async function encodeImage(image,dimensions,quality,makeCanvas=()=>document.createElement('canvas'),crop=null,format='jpeg',background='#ffffff') {
  if(!['jpeg','png','webp'].includes(format))throw Error('Choose JPEG, PNG or WebP output.');
  if(!/^#[0-9a-f]{6}$/i.test(background))throw Error('Choose a valid background color.');
  if(format!=='png'&&(!Number.isInteger(quality)||quality<50||quality>100))throw new Error('Choose JPEG quality from 50 to 100.');
  const canvas=makeCanvas();canvas.width=dimensions.width;canvas.height=dimensions.height;
  try {
    const context=canvas.getContext('2d',{alpha:format!=='jpeg',colorSpace:'srgb'});
    if(!context)throw new Error('The browser could not create the image. Try a smaller size.');
    if(format==='jpeg'){context.fillStyle=background;context.fillRect(0,0,canvas.width,canvas.height);}
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
    if(crop)context.drawImage(image,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);
    else context.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/'+format,format==='png'?undefined:quality/100));
    if(!blob||!blob.size)throw new Error('The browser could not export this image. Try a smaller size.');
    if(blob.type!=='image/'+format)throw new Error(format.toUpperCase()+' export is unavailable in this browser.');
    return blob;
  } finally {canvas.width=0;canvas.height=0;}
}

export function targetFileBytes(value, unit='MB') {
  const size=Number(value), multiplier=unit==='KB'?1000:unit==='MB'?1000000:0;
  const bytes=Math.floor(size*multiplier);
  if(!Number.isFinite(size)||!multiplier||bytes<10000||bytes>50000000)throw Error('Choose a file-size limit from 10 KB to 50 MB.');
  return bytes;
}
// Every attempt renders from the original crop, never from a compressed copy.
export async function encodeToTarget(image, dimensions, quality, makeCanvas, crop, format, background, targetBytes, isCancelled=()=>false, encode=encodeImage) {
  if(!Number.isSafeInteger(targetBytes)||targetBytes<10000||targetBytes>50000000)throw Error('Choose a file-size limit from 10 KB to 50 MB.');
  let d={...dimensions};
  const attempt=async q=>{
    if(isCancelled())throw Error('Export cancelled.');
    const blob=await encode(image,d,q,makeCanvas,crop,format,background);
    if(isCancelled())throw Error('Export cancelled.');
    return {blob,dimensions:{...d},quality:format==='png'?null:q};
  };
  for(let step=0;step<12;step++){
    let result=await attempt(quality);
    if(result.blob.size<=targetBytes)return result;
    if(format!=='png'&&quality>50){
      const smallest=await attempt(50);
      if(smallest.blob.size<=targetBytes){
        let best=smallest,lo=51,hi=quality-1;
        while(lo<=hi){const q=Math.floor((lo+hi)/2),candidate=await attempt(q);if(candidate.blob.size<=targetBytes){best=candidate;lo=q+1;}else hi=q-1;}
        return best;
      }
      result=smallest;
    }
    const scale=Math.min(.85,Math.sqrt(targetBytes/result.blob.size)*.92);
    const next={width:Math.max(1,Math.floor(d.width*scale)),height:Math.max(1,Math.floor(d.height*scale)),reduced:true};
    if(next.width===d.width&&next.height===d.height)break;
    d=next;
  }
  throw Error('This image could not meet the file-size limit. Increase the limit or choose another format.');
}
