/* A single, text-free arrival animation per browser-tab visit. */
(() => {
 const root=document.documentElement,key='inspector-focus-arrival-v1';
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 try{if(sessionStorage.getItem(key))return;}catch{}
 root.classList.add('splash-active');
 let timer;
 const finish=()=>{clearTimeout(timer);root.classList.remove('splash-active');document.getElementById('site-splash')?.remove();};
 // Never hold the site behind a missing image, blocked script or slow connection.
 timer=setTimeout(finish,5000);
 const ready=()=>{
  if(!root.classList.contains('splash-active'))return;
  const splash=document.getElementById('site-splash'),image=splash?.querySelector('img');
  if(!image){finish();return;}
  const fly=()=>{
   if(!root.classList.contains('splash-active'))return;
   if(!image.naturalWidth){finish();return;}
   try{sessionStorage.setItem(key,'1');}catch{}
   clearTimeout(timer);timer=setTimeout(finish,3200);
   splash.classList.add('splash-fly');
   splash.addEventListener('animationend',event=>{if(event.target===splash)finish();});
  };
  image.addEventListener('error',finish,{once:true});
  if(image.complete)fly();else image.addEventListener('load',fly,{once:true});
  document.addEventListener('pointerdown',finish,{once:true});
  document.addEventListener('keydown',finish,{once:true});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
 window.addEventListener('pagehide',finish,{once:true});
})();
