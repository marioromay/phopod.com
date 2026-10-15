(() => {
 let serial=0,current=null,previousFocus=null;
 const popup=document.createElement('dialog');popup.className='processing-popup';popup.setAttribute('aria-labelledby','processing-title');popup.setAttribute('aria-describedby','processing-detail');
 popup.innerHTML='<div class="processing-heading"><span class="processing-mascot" aria-hidden="true"><img src="/brand/inspector-focus.png" alt="" width="88" height="88"></span><h2 id="processing-title">Processing</h2></div><p id="processing-detail" role="status" aria-live="polite"></p><progress aria-label="Processing progress"></progress><p class="processing-count" aria-live="off"></p><p class="processing-local">Working on your device. Your photographs stay local.</p><button class="secondary" type="button" hidden>Cancel</button><a class="processing-download download-button" hidden>Download ZIP</a><a class="processing-preview secondary" target="_blank" rel="noopener" hidden>Preview viewer ↗</a><button class="processing-close secondary" type="button" hidden>Close</button>';
 document.body.append(popup);const title=popup.querySelector('h2'),detail=popup.querySelector('#processing-detail'),bar=popup.querySelector('progress'),count=popup.querySelector('.processing-count'),button=popup.querySelector('button'),download=popup.querySelector('.processing-download'),preview=popup.querySelector('.processing-preview'),close=popup.querySelector('.processing-close');
 function cancel(){if(!current?.cancel)return;const action=current.cancel;current.cancel=null;button.disabled=true;detail.textContent='Stopping…';action();}
 function dismiss({restoreFocus=true}={}){current=null;if(popup.open)popup.close();if(restoreFocus)previousFocus?.focus?.();previousFocus=null;}
 button.onclick=cancel;close.onclick=()=>dismiss();popup.addEventListener('cancel',e=>{e.preventDefault();if(current?.completed)dismiss();else cancel();});
 function update(id,text,done,total){if(current?.id!==id)return;detail.textContent=text;if(Number.isFinite(total)&&total>0){bar.max=total;bar.value=Math.min(total,Math.max(0,done||0));count.textContent=(done||0)+' / '+total;}else{bar.removeAttribute('value');count.textContent='';}}
 function finish(id,options){if(current?.id!==id||current.completed)return;dismiss(options);}
 function complete(id,{keepOpen=false,title:heading='Your ZIP is ready',detail:text='Download and extract your ZIP.',download:output,preview:viewer}={}){
  if(current?.id!==id)return;if(!keepOpen){finish(id);return;}
  current.completed=true;current.cancel=null;title.textContent=heading;detail.textContent=text;bar.hidden=count.hidden=button.hidden=true;close.hidden=false;download.hidden=!output;preview.hidden=!viewer;
  if(output){download.href=output.href;download.download=output.name;download.textContent=output.label||'Download ZIP ↘';download.onclick=null;download.focus?.();}
  if(viewer){preview.href=viewer.href;preview.textContent=viewer.label||'Preview viewer ↗';}
 }
 // Native anchor downloads keep the click in the browser's normal download flow.
 function saveFile(event,output,report=()=>{}){report('Check your browser’s downloads for '+output.name+'.');}
 window.processingProgress={saveFile,start({title:heading='Processing',detail:text='Working locally…',total,cancel:action,cancelLabel='Cancel'}={}){const id=++serial;current={id,cancel:action};download.hidden=preview.hidden=close.hidden=true;download.removeAttribute('href');preview.removeAttribute('href');bar.hidden=count.hidden=false;title.textContent=heading;button.hidden=!action;button.disabled=false;button.textContent=cancelLabel;update(id,text,0,total);if(!popup.open){previousFocus=document.activeElement;popup.showModal();}return id;},update,complete,ready(options){if(!options?.keepOpen)return;const id=this.start();complete(id,options);return id;},clearReady(){if(current?.completed)dismiss();},finish,reset(){dismiss();},paint:()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)))};
 window.addEventListener('pagehide',()=>window.processingProgress.reset());
})();
