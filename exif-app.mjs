import {inspectCleanup,resetCleanup} from './exif-cleanup.mjs?v=phopod-20261015';
import {setCurrentFile,connectWorkspace} from './workspace.mjs?v=phopod-20261015';
import { inspectJPEG, coordinates } from './exif-reader.mjs?v=phopod-20261015';
const $ = id => document.getElementById(id);
let imageURL = null, summary = '', generation = 0;
const original = Object.fromEntries(['camera','lens','state','focal','aperture','shutter','iso','dimensions','resolution','size','capture','privacy','privacy-note'].map(id=>[id,$(id).textContent]));
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
function reset(){globalThis.processingProgress?.reset();resetCleanup();setCurrentFile(null);generation++;if(imageURL)URL.revokeObjectURL(imageURL);imageURL=null;summary='';$('photo').removeAttribute('src');$('file').value='';$('empty').hidden=false;$('preview').hidden=true;$('filebar').hidden=true;$('location').hidden=true;$('location').open=false;$('copy').disabled=true;for(const [id,text] of Object.entries(original))$(id).textContent=text;message('');}
$('choose').onclick=$('replace').onclick=()=>$('file').click();$('clear').onclick=reset;
$('file').onchange=()=>{const file=$('file').files[0];$('file').value='';if(file)return load(file);};
const zone=$('dropzone');for(const event of ['dragenter','dragover'])zone.addEventListener(event,e=>{e.preventDefault();$('empty').classList.add('drag');});
for(const event of ['dragleave','drop'])zone.addEventListener(event,e=>{e.preventDefault();$('empty').classList.remove('drag');});
zone.addEventListener('drop',e=>{const files=e.dataTransfer.files;if(files.length!==1){message('Choose one photograph at a time.',true);return;}load(files[0]);});
const positive=x=>Number.isFinite(x)&&x>0;
const number=x=>Number(x.toFixed(2)).toString();
async function load(file){
  resetCleanup();
  const run=++generation;message('Reading photograph locally…');
  if(file.size>50*1024*1024){message('This first version supports JPEG files up to 50 MB.',true);return;}
  const task=globalThis.processingProgress?.start({title:'Inspecting photograph',detail:'Reading EXIF and metadata…',cancel:reset});
  try{
    await globalThis.processingProgress?.paint();const buffer=await file.arrayBuffer();if(run!==generation)return;
    inspectCleanup(file,buffer);
    const data=inspectJPEG(buffer), t=data.tags, missing='Not recorded';
    const fieldMissing=data.warnings.length?'Could not read':'Not present';
    const model=t.model||t.make||fieldMissing, camera=t.make&&t.model&&!t.model.toLowerCase().includes(t.make.toLowerCase())?t.make+' '+t.model:model;
    const focal=positive(t.focal)?number(t.focal)+'mm':missing;
    const aperture=positive(t.aperture)?'f/'+number(t.aperture):missing;
    const shutter=positive(t.exposure)?(t.exposure<1?'1/'+Math.round(1/t.exposure):number(t.exposure))+' sec':missing;
    const iso=positive(t.iso)?String(t.iso):missing;
    const rotate=[5,6,7,8].includes(t.orientation), w=rotate?data.height:data.width,h=rotate?data.width:data.height;
    if(imageURL)URL.revokeObjectURL(imageURL);imageURL=URL.createObjectURL(file);$('photo').src=imageURL;
    setCurrentFile(file);$('empty').hidden=true;$('preview').hidden=false;$('filebar').hidden=false;$('filename').textContent=file.name;
    const hasSettings=Boolean(t.make||t.model||t.lens||[t.focal,t.aperture,t.exposure,t.iso].some(positive));
    $('camera').textContent=hasSettings?camera:data.warnings.length?'Shooting details unreadable':'Shooting details unavailable';
    $('lens').textContent=t.lens||(hasSettings?'Lens '+fieldMissing.toLowerCase():data.warnings.length?'EXIF was detected, but some fields could not be read.':'This file has no supported camera or exposure fields.');
    for(const [id,value]of Object.entries({focal,aperture,shutter,iso,dimensions:w.toLocaleString()+' × '+h.toLocaleString()+' px',resolution:number(w*h/1e6)+' MP',size:number(file.size/1024/1024)+' MB',capture:t.capture?String(t.capture).replace(/^(\d{4}):(\d{2}):(\d{2})/,'$1-$2-$3')+(t.offset?' (UTC'+t.offset+')':' · time zone not recorded'):missing}))$(id).textContent=value;
    for(const id of ['focal','aperture','shutter','iso'])if($(id).textContent===missing){$(id).textContent='—';$(id).title=fieldMissing;}
    $('state').textContent=data.warnings.length?'EXIF READ INCOMPLETE':!data.exif?'NO EXIF FOUND':hasSettings?'SHOOTING DATA FOUND':'LIMITED EXIF';
    $('privacy').textContent=data.gps?'EXIF GPS metadata detected':data.warnings.length?'EXIF GPS check incomplete':'No EXIF GPS metadata detected';
    $('privacy-note').textContent=data.gps?'Coordinates stay on your device and are excluded from the copied summary.':data.warnings.length?'Some EXIF fields could not be read. Location data may still be present.':'See the metadata report below for other detected containers.';
    const gps=coordinates(t);$('location').hidden=!data.gps;$('location').open=false;$('coords').textContent=gps?gps.map(n=>n.toFixed(6)).join(', '):'Coordinates were incomplete or could not be read.';
    summary=[t.model||t.make,t.lens,positive(t.focal)?focal:null,positive(t.aperture)?aperture:null,positive(t.exposure)?shutter:null,positive(t.iso)?'ISO '+iso:null].filter(Boolean).join(' · ');$('copy').disabled=!hasSettings;
    message(data.warnings.length?'Some EXIF fields could not be read. Missing values may reflect a reading problem; try the original camera JPEG.':!hasSettings?(data.exif?'This JPEG contains limited EXIF, but no supported camera or exposure settings. ':'No EXIF was found in this JPEG. ')+'Try a JPEG straight from the camera or an export with camera metadata included. Resized or shared copies may omit these details. The tool cannot recover metadata that is absent.':'Inspection complete. A dash means that field is not present in the supported EXIF data. Your original file is unchanged.',data.warnings.length>0);
    globalThis.processingProgress?.complete?.(task,{title:'Your EXIF results are ready',detail:'View the inspection results. To create a cleaned JPEG, use Remove metadata in the tool.'});
  }catch(error){if(run!==generation)return;reset();message(error.message||'This photograph could not be read.',true);}finally{globalThis.processingProgress?.finish(task);}
}
$('photo').onerror=()=>message('Metadata was read, but this browser could not display the JPEG preview.',true);
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(summary);message('Shooting summary copied. Location and capture time are excluded.');}catch{message('Clipboard access is unavailable. Select and copy this summary: '+summary);}};
window.addEventListener('pagehide',()=>{if(imageURL)URL.revokeObjectURL(imageURL);});

connectWorkspace(load,()=>generation===0);
