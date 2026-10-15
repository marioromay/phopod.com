import {setCurrentFile,connectWorkspace} from './workspace.mjs?v=phopod-20261015';
import {resizeDimensions,imageFormat,exportFilename,encodeJpeg} from './resize-engine.mjs?v=phopod-20261015';
const $=id=>document.getElementById(id);
let source=null,sourceURL=null,outputURL=null,generation=0,busy=false;
const say=(text,error=false)=>{$('message').textContent=text;$('message').classList.toggle('error',error);};
const size=bytes=>bytes<1024*1024?(bytes/1024).toFixed(1)+' KB':(bytes/1024/1024).toFixed(2)+' MB';
function releaseOutput(){
  $('download').hidden=true;$('download').removeAttribute('href');$('result').hidden=true;
  if(outputURL)URL.revokeObjectURL(outputURL);outputURL=null;
  if(sourceURL)$('photo').src=sourceURL;
  $('preview-label').textContent='Original preview';
}
function controls(){
  for(const id of ['preset','long-edge','quality','reset'])$(id).disabled=!source||busy;
  $('export').disabled=!source||busy;$('export').textContent=busy?'Working locally…':'Create JPEG';
}
function update(){
  $('quality-value').textContent=$('quality').value;
  if(!source){$('output-dimensions').textContent='—';controls();return;}
  try{
    const d=resizeDimensions(source.image.naturalWidth,source.image.naturalHeight,Number($('long-edge').value));
    $('output-dimensions').textContent=d.width.toLocaleString()+' × '+d.height.toLocaleString()+' px';
    $('size-note').textContent=d.reduced?'Aspect ratio retained. No cropping.':'Original dimensions retained. We never upscale.';
    controls();
  }catch(error){$('output-dimensions').textContent='—';$('size-note').textContent=error.message;controls();$('export').disabled=true;}
}
function changed(){generation++;busy=false;releaseOutput();update();say('Settings changed. Create a new JPEG to download these settings.');}
function clear(){
  setCurrentFile(null);generation++;busy=false;releaseOutput();if(sourceURL)URL.revokeObjectURL(sourceURL);
  source=null;sourceURL=null;$('photo').removeAttribute('src');$('file').value='';
  $('image-view').hidden=true;$('empty').hidden=false;$('preset').value='2400';$('long-edge').value='2400';$('quality').value='85';
  $('size-note').textContent='Select a photograph to see the output dimensions.';update();say('Choose a photograph to resize and export.');
}
async function load(file){
  const run=++generation;busy=true;releaseOutput();controls();let pendingURL=null;
  try{
    if(file.size>50*1024*1024)throw new Error('Choose an image up to 50 MB.');
    const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());if(run!==generation)return;
    const format=imageFormat(bytes);say('Reading photograph locally…');
    pendingURL=URL.createObjectURL(file);const image=new Image();image.src=pendingURL;await image.decode();
    if(run!==generation)return;
    if(!image.naturalWidth||!image.naturalHeight)throw new Error('The browser could not read this image.');
    if(image.naturalWidth*image.naturalHeight>60_000_000)throw new Error('Choose an image up to 60 megapixels for this version.');
    if(sourceURL)URL.revokeObjectURL(sourceURL);sourceURL=pendingURL;pendingURL=null;source={image,file};
    $('photo').src=sourceURL;$('filename').textContent=file.name;
    $('source-facts').textContent=format+' · '+image.naturalWidth.toLocaleString()+' × '+image.naturalHeight.toLocaleString()+' pixels · '+size(file.size);
    setCurrentFile(file);$('image-view').hidden=false;$('empty').hidden=true;
    say('Photograph ready. Choose a size and quality, then create your JPEG.');
  }catch(error){if(run===generation)say(error.message||'The browser could not read this image. Try a standard JPEG.',true);}
  finally{if(pendingURL)URL.revokeObjectURL(pendingURL);if(run===generation){busy=false;update();}}
}
async function create(){
  if(!source||busy)return;const run=++generation;busy=true;releaseOutput();controls();say('Creating JPEG locally…');
  try{
    const current=source,d=resizeDimensions(current.image.naturalWidth,current.image.naturalHeight,Number($('long-edge').value));
    const quality=Number($('quality').value);
    const blob=await encodeJpeg(current.image,d,quality);
    if(run!==generation)return;
    outputURL=URL.createObjectURL(blob);$('photo').src=outputURL;$('preview-label').textContent='Export preview';
    const filename=exportFilename(current.file.name,d.width,d.height);
    $('download').href=outputURL;$('download').download=filename;$('download').hidden=false;globalThis.processingProgress?.ready?.({title:'Your file is ready',detail:'Download your copy. Your originals stay unchanged.',download:{href:$('download').href,name:$('download').download,label:'Download file ↘'}});
    $('export-facts').textContent=d.width.toLocaleString()+' × '+d.height.toLocaleString()+' px · JPEG · '+size(blob.size);
    $('export-name').textContent=filename;$('result').hidden=false;
    const difference=(1-blob.size/current.file.size)*100;
    $('size-change').textContent=Math.abs(difference).toFixed(1)+'% '+(difference>=0?'smaller':'larger')+' than the original file.';
    say('JPEG ready. Download your copy. The original photograph is unchanged.');
  }catch(error){if(run===generation)say(error.message||'Export failed. Try a smaller size.',true);}
  finally{if(run===generation){busy=false;update();}}
}
$('choose').onclick=$('replace').onclick=()=>$('file').click();
$('file').onchange=()=>{const file=$('file').files[0];$('file').value='';if(file)return load(file);};
$('clear').onclick=clear;$('export').onclick=create;
$('preset').onchange=()=>{if($('preset').value!=='custom')$('long-edge').value=$('preset').value;changed();};
$('long-edge').oninput=()=>{$('preset').value='custom';changed();};$('quality').oninput=changed;
$('reset').onclick=()=>{$('preset').value='2400';$('long-edge').value='2400';$('quality').value='85';changed();};
for(const event of ['dragenter','dragover'])$('dropzone').addEventListener(event,e=>{e.preventDefault();$('empty').classList.add('drag');});
for(const event of ['dragleave','drop'])$('dropzone').addEventListener(event,e=>{e.preventDefault();$('empty').classList.remove('drag');});
$('dropzone').addEventListener('drop',e=>{if(e.dataTransfer.files.length!==1){say('Choose one photograph at a time.',true);return;}return load(e.dataTransfer.files[0]);});
window.addEventListener('pagehide',event=>{if(event.persisted)return;generation++;releaseOutput();if(sourceURL)URL.revokeObjectURL(sourceURL);});
update();

connectWorkspace(load,()=>generation===0);
