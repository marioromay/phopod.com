import {sheetSlots,destinationPosition} from './sheet-arrange.mjs?v=phopod-20261015';
import {stageSelection,discardSelection,consumeCollection} from './selection-handoff.mjs?v=phopod-20261015';
import {captureDate,orderPhotos,movePhoto} from './photo-order.mjs?v=phopod-20261015';
import {helveticaText} from './helvetica.mjs?v=phopod-20261015';
import {loadPhotograph} from './image-loader.mjs?v=phopod-20261015';
import {drawContactPage} from './contact-renderer.mjs?v=phopod-20261015';
import {layoutSheet,fitImage,sortPhotos,makePDF} from './contact-engine.mjs?v=phopod-20261015';
const $=id=>document.getElementById(id),controls=['paper','orientation','columns','order','labels','numbers','shoot-title','author'];
let decoder=null,handoffBusy=false;
let selectionIndex=0,selected=null,dragFrom=null,dragTarget=null;
let photos=[],page=0,epoch=0,previewEpoch=0,busy=false,pdfURL=null;
const settings=()=>({paper:$('paper').value,orientation:$('orientation').value,columns:Number($('columns').value),labels:$('labels').checked,numbers:$('numbers').checked,title:$('shoot-title').value,author:$('author').value});
const message=(text,error=false)=>{$('message').textContent=text;$('message').classList.toggle('error',error);};
const yieldUI=()=>new Promise(r=>setTimeout(r,0));
function invalidate(){globalThis.processingProgress?.clearReady?.();if(pdfURL)URL.revokeObjectURL(pdfURL);pdfURL=null;$('download').hidden=true;$('download').removeAttribute('href');}
function lock(value){busy=value;$('clear').disabled=!value&&!photos.length;for(const id of controls)$(id).disabled=value;
 for(const id of ['choose','add','rename-selection','viewer-selection','photo-choice','move-earlier','move-later','move-position','destination','remove-photo','close-photo'])$(id).disabled=value;
 $('generate').disabled=value||!photos.length;$('previous').disabled=value||page===0;$('next').disabled=value||page>=Math.ceil(photos.length/layoutSheet(settings()).capacity)-1;
 for(const button of $('sheet-hits').children){button.disabled=value;button.draggable=!value;}
 selectionControls();
}
function selectionControls(){
 const ordered=orderPhotos(photos,$('order').value),position=ordered.findIndex(p=>p.index===selected),photo=ordered[position];
 $('rename-selection').hidden=!photos.length;$('viewer-selection').hidden=!photos.length;$('photo-actions').hidden=!photo;
 if(!photo){selected=null;return;}
 $('selected-photo').textContent=String(position+1).padStart(3,'0')+' · '+photo.name;
 $('move-earlier').disabled=busy||position===0;$('move-later').disabled=busy||position===ordered.length-1;
 $('destination').max=ordered.length;$('destination').value=position+1;$('photo-choice').value=String(photo.index);
 for(const hit of $('sheet-hits').children)hit.setAttribute('aria-pressed',String(Number(hit.dataset.photoIndex)===selected));
}
function selectPhoto(index){if(busy)return;selected=index;selectionControls();$('photo-actions').scrollIntoView?.({block:'nearest',behavior:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
function focusPhoto(){document.querySelector?.(`[data-photo-index="${selected}"]`)?.focus?.();}
function moveSelected(target){if(busy||selected===null)return;const ordered=orderPhotos(photos,$('order').value),from=ordered.findIndex(p=>p.index===selected);if(from>=0)changeOrder(movePhoto(ordered,from,target),selected);}
$('move-earlier').onclick=()=>{const ordered=orderPhotos(photos,$('order').value);moveSelected(ordered.findIndex(p=>p.index===selected)-1);};
$('move-later').onclick=()=>{const ordered=orderPhotos(photos,$('order').value);moveSelected(ordered.findIndex(p=>p.index===selected)+1);};
$('move-position').onclick=()=>{try{moveSelected(destinationPosition($('destination').value,photos.length));}catch(error){message(error.message,true);}};
$('remove-photo').onclick=()=>{if(busy||selected===null)return;const ordered=orderPhotos(photos,$('order').value),position=ordered.findIndex(p=>p.index===selected);if(position<0)return;URL.revokeObjectURL(ordered[position].url);const next=ordered.filter(p=>p.index!==selected);selected=next[Math.min(position,next.length-1)]?.index??null;changeOrder(next,selected??undefined);};
$('close-photo').onclick=()=>{selected=null;$('photo-choice').value='';selectionControls();for(const hit of $('sheet-hits').children)hit.setAttribute('aria-pressed','false');};
$('photo-choice').onchange=()=>{if(busy||$('photo-choice').value==='')return;selected=Number($('photo-choice').value);const ordered=orderPhotos(photos,$('order').value),position=ordered.findIndex(p=>p.index===selected);if(position<0)return;page=Math.floor(position/layoutSheet(settings()).capacity);void preview().then(focusPhoto);};
function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Image could not be decoded.'));image.src=url;});}
function canvasBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Browser could not encode the page.')),'image/jpeg',.9));}
const drawPage=(...args)=>drawContactPage(...args,loadImage);
function changeOrder(next,focusIndex){if(busy)return;photos=next;dragFrom=dragTarget=null;selected=focusIndex??selected;
 if(selected!==null){const position=photos.findIndex(p=>p.index===selected);if(position>=0)page=Math.floor(position/layoutSheet(settings()).capacity);}
 $('order').value='manual';invalidate();void preview().then(focusPhoto);message('Photo order changed. Generate a new PDF when ready.');
}
function renderSheetControls(ordered,layout){
 const layer=$('sheet-hits');layer.replaceChildren();$('photo-choice').replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a photograph…';$('photo-choice').append(placeholder);
 for(const [position,photo] of ordered.entries()){const option=document.createElement('option');option.value=String(photo.index);option.textContent=String(position+1).padStart(3,'0')+' · '+photo.name;$('photo-choice').append(option);}
 for(const slot of sheetSlots(ordered.length,page,layout)){
  const photo=ordered[slot.position],hit=document.createElement('button');hit.type='button';hit.className='sheet-photo';hit.dataset.photoIndex=photo.index;hit.draggable=!busy;hit.disabled=busy;
  for(const key of ['left','top','width','height'])hit.style[key]=slot[key]+'%';
  hit.setAttribute('aria-label',`Photograph ${slot.position+1}: ${photo.name}. Select to arrange.`);hit.setAttribute('aria-pressed',String(selected===photo.index));hit.onclick=()=>selectPhoto(photo.index);
  hit.ondragstart=e=>{if(busy){e.preventDefault();return;}selected=photo.index;selectionControls();dragFrom=photo.index;dragTarget=null;e.dataTransfer.setData('application/x-inspector-photo',String(photo.index));e.dataTransfer.effectAllowed='move';};
  hit.ondragover=e=>{if(!busy&&dragFrom!==null&&Array.from(e.dataTransfer.types).includes('application/x-inspector-photo')){e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='move';if(dragTarget!==photo.index){dragTarget=photo.index;for(const target of layer.children)target.classList.toggle('drop-target',target===hit);const from=ordered.findIndex(p=>p.index===dragFrom);if(from>=0)void preview(movePhoto(ordered,from,slot.position),false);}}};
  hit.ondragend=()=>{dragFrom=dragTarget=null;void preview();};
  hit.ondrop=e=>{const raw=e.dataTransfer.getData('application/x-inspector-photo');if(!raw||busy)return;e.preventDefault();e.stopPropagation();const from=ordered.findIndex(p=>p.index===Number(raw));if(from>=0)changeOrder(movePhoto(ordered,from,slot.position),Number(raw));};
  hit.onkeydown=e=>{if(e.key==='Escape'){$('close-photo').onclick();hit.focus?.();}};
  layer.append(hit);
 }
 selectionControls();
}
async function preview(temporaryOrder=null,rebuildControls=true){
 const version=++previewEpoch,token=epoch,layout=layoutSheet(settings()),ordered=temporaryOrder||orderPhotos(photos,$('order').value),total=Math.ceil(photos.length/layout.capacity);page=Math.max(0,Math.min(page,total-1));$('empty').hidden=!!photos.length;$('loaded').hidden=!photos.length;$('count').textContent=`${photos.length} ${photos.length===1?'photograph':'photographs'}`;$('page-number').textContent=`Page ${page+1} of ${total}`;$('sheet-surface').style.setProperty('--sheet-ratio',layout.width/layout.height);if(rebuildControls){renderSheetControls(ordered,layout);$('sheet-hits').hidden=true;}lock(busy);if(!photos.length)return;
 const canvas=document.createElement('canvas');try{if(await drawPage(canvas,ordered,page,layout,()=>version===previewEpoch&&token===epoch)){$('page').width=canvas.width;$('page').height=canvas.height;$('page').getContext('2d').drawImage(canvas,0,0);$('page').setAttribute('aria-label',`Contact sheet page ${page+1} of ${total}, ${layout.columns} columns`);$('sheet-hits').hidden=false;}}catch(error){if(token===epoch)message(error.message,true);}finally{canvas.width=canvas.height=1;}
}
async function ingest(files){
 if(busy)return;const token=++epoch;invalidate();lock(true);let skipped=0,added=0;const list=Array.from(files);$('progress').hidden=false;$('progress').max=list.length;$('progress').value=0;
 const task=globalThis.processingProgress?.start({title:'Preparing contact sheet',detail:'Reading photographs…',total:list.length,cancel:clear});try{await globalThis.processingProgress?.paint();
 for(let i=0;i<list.length;i++){
  if(token!==epoch)return;const file=list[i];message(`Reading ${i+1} of ${list.length} photographs…`);globalThis.processingProgress?.update(task,`Reading ${i+1} of ${list.length} photographs…`,i,list.length);let sourceURL=null,canvas=null;
  try{
   if(photos.length>=300)throw Error('Maximum 300 photographs.');decoder=new AbortController();const loaded=await loadPhotograph(file,{signal:decoder.signal});sourceURL=loaded.url;const image=loaded.image;if(token!==epoch)return;
   const fit=fitImage(image.naturalWidth,image.naturalHeight,960,960);canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(fit.width));canvas.height=Math.max(1,Math.round(fit.height));const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);image.src='';
   const blob=await canvasBlob(canvas);if(token!==epoch)return;const capture=await captureDate(file);if(token!==epoch)return;photos.push({file,name:file.name,capture,index:selectionIndex++,width:canvas.width,height:canvas.height,url:URL.createObjectURL(blob)});added++;
  }catch{skipped++;}finally{if(sourceURL)URL.revokeObjectURL(sourceURL);if(canvas)canvas.width=canvas.height=1;}
  $('progress').value=i+1;globalThis.processingProgress?.update(task,'Photographs prepared',i+1,list.length);await yieldUI();
 }
 if(token!==epoch)return;$('files').value='';$('progress').hidden=true;lock(false);await preview();message(`${added} photographs added.${skipped?` ${skipped} skipped: unsupported, unreadable, over the size limit, or beyond 300 photographs.`:''} ${photos.length?'Review the pages, then generate your PDF.':''}`,!!skipped&&!photos.length);
 }finally{globalThis.processingProgress?.finish(task);}
}
async function generate(){
 if(busy||!photos.length)return;const token=++epoch;previewEpoch++;invalidate();lock(true);const layout=layoutSheet(settings()),ordered=orderPhotos(photos,$('order').value),total=Math.ceil(ordered.length/layout.capacity),pages=[];const canvas=document.createElement('canvas');$('progress').max=total;$('progress').value=0;$('progress').hidden=false;
 const task=globalThis.processingProgress?.start({title:'Creating contact sheet PDF',detail:'Preparing pages…',total,cancel:clear});
 try{await globalThis.processingProgress?.paint();for(let i=0;i<total;i++){
  message(`Creating PDF page ${i+1} of ${total}…`);globalThis.processingProgress?.update(task,`Creating page ${i+1} of ${total}…`,i,total);if(!await drawPage(canvas,ordered,i,{...layout,renderScale:300/72,pdfText:true},()=>token===epoch))return;const blob=await canvasBlob(canvas);const bytes=new Uint8Array(await blob.arrayBuffer());if(token!==epoch)return;pages.push({width:canvas.width,height:canvas.height,bytes,text:canvas.sheetText});globalThis.processingProgress?.update(task,'Pages created',i+1,total);$('progress').value=i+1;await yieldUI();
 }const pdf=makePDF(pages,layout.width,layout.height);if(token!==epoch)return;pdfURL=URL.createObjectURL(pdf);$('download').href=pdfURL;$('download').download=(layout.title?layout.title.replace(/[\x00-\x1f<>:"/\\|?*]/g,'_').slice(0,80)+'-':'phopod-')+'contact-sheet.pdf';$('download').hidden=false;globalThis.processingProgress?.complete?.(task,{title:'Your contact sheet is ready',detail:'Download your PDF, then open it to review or print.',download:{href:$('download').href,name:$('download').download,label:'Download PDF ↘'}});message(`${total} ${total===1?'page':'pages'} ready · ${(pdf.size/1024/1024).toFixed(1)} MB. Download your contact sheet.${[layout.title,layout.author,...ordered.filter(()=>layout.labelHeight).map(p=>p.name)].some(t=>helveticaText(t)!==t)?' Helvetica replaces unsupported characters with ?.':''}`);
 }catch(error){if(token===epoch)message(`PDF could not be created. ${error.message}`,true);}finally{globalThis.processingProgress?.finish(task);canvas.width=canvas.height=1;if(token===epoch){$('progress').hidden=true;lock(false);}}
}
function clear(){decoder?.abort();globalThis.processingProgress?.reset();epoch++;previewEpoch++;invalidate();for(const photo of photos)URL.revokeObjectURL(photo.url);photos=[];page=0;selected=null;dragFrom=dragTarget=null;$('files').value='';$('progress').hidden=true;lock(false);void preview();message('Choose photographs to create your contact sheet.');}
$('choose').onclick=$('add').onclick=()=>$('files').click();$('files').onchange=()=>ingest($('files').files);$('clear').onclick=clear;$('generate').onclick=()=>generate();
for(const id of controls)$(id).onchange=()=>{invalidate();page=0;void preview();message('Page settings changed. Generate a new PDF when ready.');};
$('previous').onclick=()=>{if(page>0){page--;void preview();}};$('next').onclick=()=>{if(page<Math.ceil(photos.length/layoutSheet(settings()).capacity)-1){page++;void preview();}};
$('dropzone').ondragover=event=>{if(Array.from(event.dataTransfer.types).includes('Files')){event.preventDefault();$('empty').classList.add('drag');}};$('dropzone').ondragleave=()=>$('empty').classList.remove('drag');$('dropzone').ondrop=event=>{event.preventDefault();$('empty').classList.remove('drag');if(event.dataTransfer.files.length)void ingest(event.dataTransfer.files);};
window.addEventListener('beforeunload',()=>{for(const photo of photos)URL.revokeObjectURL(photo.url);if(pdfURL)URL.revokeObjectURL(pdfURL);});

$('shoot-title').oninput=()=>{invalidate();void preview();message('Title changed. Generate a new PDF when ready.');};

async function transfer(path){
 if(busy||handoffBusy||!photos.length)return;
 handoffBusy=true;const token=epoch,files=orderPhotos(photos,$('order').value).map(p=>p.file);lock(true);let ticket;
 try{message('Opening your arranged originals in the next tool…');ticket=await stageSelection(files,path,settings());if(token!==epoch){await discardSelection(ticket);return;}location.assign(path);}
 catch(error){if(ticket)await discardSelection(ticket).catch(()=>{});if(token===epoch)message('Selection could not be transferred. '+error.message+' Your photographs remain here.',true);}
 finally{handoffBusy=false;if(token===epoch)lock(false);}
}
$('rename-selection').onclick=()=>transfer('/batch-rename/');$('viewer-selection').onclick=()=>transfer('/photo-viewer/');
$('author').oninput=()=>{invalidate();void preview();message('Photographer credit changed. Generate a new PDF when ready.');};
const arrivalEpoch=epoch;void consumeCollection('/contact-sheet/').then(async selection=>{if(!selection||epoch!==arrivalEpoch)return;
 $('shoot-title').value=selection.context.title;$('author').value=selection.context.author;$('labels').checked=selection.context.labels;$('numbers').checked=selection.context.numbers;$('order').value='added';await ingest(selection.files);
}).catch(error=>{if(epoch===arrivalEpoch)message('Transferred selection could not be opened. '+error.message,true);});
