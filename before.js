import {coordinates,localDay,validDay,dayDiff,shootingWindow,forecastAt,weatherName,localParts,localInstant,localTime,solarAt,distance,routeMetrics,directions,validSaved} from './planning.mjs?v=before-release-20261016';
import {searchLocations,forecast,approximateArea,readableDeviceLocation} from './data.mjs?v=before-release-20261016';
const $=s=>document.querySelector(s);
const key='inspector-focus:shoot:v1';
const state={location:null,type:'Explore',day:'Today',time:'Best Light',date:null,stops:[],forecast:null,window:null,nearby:[],minute:720};
let searchBias=null;const areaReady=approximateArea().then(area=>{if(!searchBias)searchBias=area;});
let searchController,addController,buildController,nearbyController,epoch=0,searchEpoch=0,addEpoch=0,geoEpoch=0,weatherEpoch=0,nearbyEpoch=0;
const dateInput=$('#shoot-date');
let saved;try{saved=validSaved(JSON.parse(localStorage.getItem(key)||'null'))}catch{}
$('#restore').hidden=!saved;$('#clear-saved').hidden=!saved;
const safeText=(node,text)=>{node.textContent=text};
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node}
function reveal(node){node.hidden=false;node.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})}
function focusHeading(node){node.focus({preventScroll:true})}
function cancelBuild({nearby:cancelNearby=true}={}){
 epoch++;weatherEpoch++;if(cancelNearby){nearbyEpoch++;nearbyController?.abort();}addEpoch++;addController?.abort();buildController?.abort();$('#build-status').textContent='';
}
function adjustDate(){
 if(!state.location)return;
 dateInput.min=localDay(state.location.timezone);
 if(!dateInput.value||dateInput.value<dateInput.min)dateInput.value=dateInput.min;
 state.date=state.day==='Choose Date'?dateInput.value:localDay(state.location.timezone,state.day==='Tomorrow'?1:0);
 const now=new Date(),date=localInstant(state.date,720,state.location.timezone);
 const formatted=new Intl.DateTimeFormat('en-US',{timeZone:state.location.timezone,weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(date);
 $('#selected-date').textContent=formatted+(state.day==='Today'?' · '+localTime(now,state.location.timezone)+' now':'')+' · '+state.location.timezone;

}
function selectLocation(location,{restore=false}={}){
 searchEpoch++;geoEpoch++;searchController?.abort();$('#search-form button').disabled=false;$('#locate').disabled=false;cancelBuild();state.location=location;searchBias=location;state.forecast=null;state.nearby=[];if(!restore){state.stops=[location];state.day='Today';state.time='Best Light';document.querySelectorAll('[data-group]').forEach(group=>group.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===state[group.dataset.group]))));$('#date-wrap').hidden=true;}
 $('#place').value=location.name;$('#preferences-title').textContent=location.name;
 $('#location-detail').textContent=[location.address,location.region,location.timezone].filter(Boolean).join(' · ');
 $('#suggestions').hidden=true;$('#location-message').textContent='Location selected.';
 adjustDate();$('#preferences').hidden=false;$('.opening').hidden=true;if(!restore){build({locationChanged:true});focusHeading($('#preferences-title'));}
}
function resultButton(location,onChoose){
 const b=el('button',undefined,'search-result');b.type='button';
 b.append(el('strong',location.name+' ↗'),el('small',[location.address,location.region||location.kind].filter(Boolean).join(' · ')));
 b.onclick=()=>onChoose(location);return b;
}
async function runSearch(){
 const id=++searchEpoch;searchController?.abort();searchController=new AbortController();
 const message=$('#location-message'),q=$('#place').value.trim(),button=$('#search-form button');
 $('#suggestions').hidden=true;button.disabled=true;message.textContent='Searching locations…';
 try{
 await areaReady;if(id!==searchEpoch)return;const results=await searchLocations(q,searchController.signal,searchBias);if(id!==searchEpoch)return;
 $('#suggestion-list').replaceChildren(...results.map(l=>resultButton(l,selectLocation)));
 $('#suggestions').hidden=!results.length;
 message.textContent=results.length?'Choose the matching location below.':'No matching places. Try including the city, or enter latitude, longitude.';
 if(results.length)$('#suggestion-list button').focus();
 }catch(error){if(id===searchEpoch&&error.name!=='AbortError')message.textContent=error.message||'Location search unavailable. Try again or enter coordinates.'}
 finally{if(id===searchEpoch)button.disabled=false}
}
$('#search-form').onsubmit=e=>{e.preventDefault();runSearch()};
$('#place').addEventListener('input',()=>{geoEpoch++;$('#locate').disabled=false;searchEpoch++;searchController?.abort();$('#search-form button').disabled=false;$('#suggestions').hidden=true;$('#location-message').textContent=''});
$('#locate').onclick=()=>{
 if(!navigator.geolocation){$('#location-message').textContent='Device location is unavailable. Search a place instead.';return}
 const id=++geoEpoch;$('#locate').disabled=true;$('#location-message').textContent='Waiting for location permission…';
 navigator.geolocation.getCurrentPosition(async pos=>{
 if(id!==geoEpoch)return;$('#locate').disabled=false;
 try{const exact=coordinates(pos.coords.latitude,pos.coords.longitude,'Your device location');selectLocation(exact);const named=await readableDeviceLocation(exact);if(id+1!==geoEpoch||state.location!==exact)return;Object.assign(exact,named);$('#preferences-title').textContent=named.name;$('#location-detail').textContent=[named.address,named.region,named.timezone].filter(Boolean).join(' · ');$('#place').value=named.name;renderRoute();$('#location-message').textContent='Using your device location. You can change it any time.'}catch{$('#location-message').textContent='Could not read location. Search a place instead.'}
 },()=>{
 if(id!==geoEpoch)return;$('#locate').disabled=false;$('#location-message').textContent='Location permission was declined or unavailable. Search a place instead.';
 },{timeout:10000,maximumAge:300000});
};
$('#change-location').onclick=()=>{cancelBuild();$('#results').hidden=true;$('#preferences').hidden=true;$('.opening').hidden=false;$('#place').focus();$('#place').select();$('#place').scrollIntoView({block:'center'})};
document.querySelectorAll('[data-group]').forEach(group=>group.onclick=e=>{
 const b=e.target.closest('button');if(!b)return;
 group.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
 state[group.dataset.group]=b.dataset.value;
 $('#date-wrap').hidden=state.day!=='Choose Date';adjustDate();
 if(group.dataset.group==='day'&&state.day==='Choose Date')openCalendar();
 build({restore:true});
});
let calendarMonth='';
function openCalendar(){calendarMonth=dateInput.value.slice(0,7);renderCalendar();}
function renderCalendar(){
 const box=$('#shoot-calendar');box.replaceChildren();
 const [year,month]=calendarMonth.split('-').map(Number),first=new Date(Date.UTC(year,month-1,1));
 const heading=el('div',undefined,'calendar-heading');
 for(const [label,offset] of [['Previous month',-1],['Next month',1]]){
 const button=el('button',offset<0?'←':'→','secondary');button.type='button';button.setAttribute('aria-label',label);
 button.onclick=()=>{const next=new Date(Date.UTC(year,month-1+offset,1));calendarMonth=next.toISOString().slice(0,7);renderCalendar();};
 if(offset<0)heading.append(button);else{heading.append(el('strong',new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(first)));heading.append(button);}
 }
 box.append(heading);const grid=el('div',undefined,'calendar-grid');
 for(const day of ['Su','Mo','Tu','We','Th','Fr','Sa'])grid.append(el('span',day));
 for(let i=0;i<first.getUTCDay();i++)grid.append(el('span',''));
 const total=new Date(Date.UTC(year,month,0)).getUTCDate();
 for(let day=1;day<=total;day++){
 const value=calendarMonth+'-'+String(day).padStart(2,'0'),button=el('button',String(day));button.type='button';button.disabled=value<dateInput.min;button.setAttribute('aria-label',value);button.setAttribute('aria-pressed',String(value===dateInput.value));
 button.onclick=()=>{dateInput.value=value;adjustDate();renderCalendar();build({restore:true});$('#date-wrap').hidden=true;document.querySelector('[data-value="Choose Date"]').focus();};grid.append(button);
 }
 box.append(grid);
}
dateInput.onchange=()=>{adjustDate();build({restore:true})};
const stamp=d=>new Intl.DateTimeFormat('en-US',{timeZone:state.location.timezone,month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);
const time=d=>localTime(d,state.location.timezone);
function metric(value,label){const d=el('div');d.append(el('strong',value),el('span',label));return d}
function showLight(){
 const w=state.window,t=w.times;
 $('#result-meta').textContent=state.location.name+' / '+state.date+' / '+state.location.timezone;
 $('#result-title').textContent='LIGHT & WEATHER.';
 $('#light-title').textContent='Your day in light.';
 $('#light-copy').textContent=w.polar?'Some sun windows are unavailable at this latitude and date. Use the weather time control to inspect conditions.':'Select a sun time below to move the timeline and update the weather. Light windows select their start time.';
 $('#window-note').textContent='Sun times and forecasts are local to your destination.';
 $('#solar-facts').replaceChildren();
 for(const [label,start,end] of [['Sunrise',t.sunrise],['Sunset',t.sunset],['Morning golden hour',t.sunrise,t.goldenHourEnd],['Evening golden hour',t.goldenHour,t.sunset],['Morning blue hour',t.blueMorningStart,t.blueMorningEnd],['Evening blue hour',t.blueEveningStart,t.blueEveningEnd]]){
 const d=el('div'),value=el('dd'),button=el('button',end?time(start)+'–'+time(end):time(start));
 button.type='button';button.className='text-button';button.disabled=!(start instanceof Date&&Number.isFinite(start.getTime()));button.setAttribute('aria-label','Check weather for '+label);
 button.onclick=()=>{state.minute=localParts(start,state.location.timezone).minute;$('#shoot-hour').value=String(state.minute);showWeather();};
 button.dataset.start=start instanceof Date?String(start.getTime()):'';button.dataset.end=end instanceof Date?String(end.getTime()):button.dataset.start;
 value.append(button);d.append(el('dt',label),value);$('#solar-facts').append(d);
 }
}
function showWeather(){
 const instant=localInstant(state.date,state.minute,state.location.timezone),f=forecastAt(state.forecast,instant),solar=solarAt(instant,state.location);
 $('#hour-label').textContent=time(instant)+' · '+solar.light.status+' · '+state.location.timezone;
 updateSession(instant,solar);

 $('#weather-metrics').replaceChildren();
 if(!f){
 $('#weather-title').textContent='Forecast unavailable.';
 const outside=dayDiff(localDay(state.location.timezone),state.date);
 $('#weather-copy').textContent=outside<0?'This preview does not retrieve historical weather. Sun times still work.':outside>15?'This date is outside the forecast window. Sun times still work; check weather closer to your shoot.':'Could not get a forecast for this hour. Refresh to try again; your light and route remain available.';
 $('#weather-source').textContent='Open-Meteo · no forecast shown';return;
 }
 $('#weather-title').textContent=weatherName(f.code)+'.';
 const effect=solar.belowHorizon?'Sun below the horizon.':f.cloud===null?'Cloud cover is unavailable; direct sunlight is uncertain.':f.cloud>=80?'Heavy cloud may soften daylight and reduce direct sun.':f.cloud>=30?'Broken cloud may interrupt direct sunlight.':'Limited cloud may allow direct sun where buildings permit.';
 $('#weather-copy').textContent=effect+(f.rainChance!==null&&f.rainChance>=50?' Rain is possible; consider a sheltered alternative.':'')+(f.wind!==null&&f.wind>=20?' Wind may be noticeable in exposed locations.':'');
 $('#weather-metrics').append(metric(f.temperature===null?'—':Math.round(f.temperature)+'°F','TEMPERATURE'),metric(f.cloud===null?'—':Math.round(f.cloud)+'%','CLOUD COVER'),metric(f.rainChance===null?'—':Math.round(f.rainChance)+'%','RAIN CHANCE'),metric(f.wind===null?'—':Math.round(f.wind)+' mph','WIND'));
 $('#weather-source').textContent='Open-Meteo forecast · '+stamp(instant)+' · retrieved '+stamp(new Date(state.forecast.retrievedAt));
}
async function build({restore=false,locationChanged=false}={}){
 if(!state.location)return;adjustDate();
 if(state.day==='Choose Date'&&(!dateInput.value||!dateInput.checkValidity())){dateInput.reportValidity();return}
 if(!validDay(state.date))return;
 cancelBuild({nearby:locationChanged});const id=epoch;const location=state.location;const controller=new AbortController();buildController=controller;
 if(!restore&&!state.stops.length)state.stops=[location];
 if(locationChanged){state.nearby=[];state.forecast=null;$('#add-form').hidden=true;$('#add-results').replaceChildren();$('#places-status').textContent='';}
 state.window=shootingWindow(location,state.date,state.time,state.forecast);
 state.minute=state.day==='Today'?localParts(new Date(),location.timezone).minute:720;
 $('#shoot-hour').value=String(state.minute);showLight();showWeather();renderRoute();$('#results').hidden=false;$('#preferences').hidden=false;
 $('#build-status').textContent='Updating weather… Light and route are ready.';if(!state.forecast){$('#weather-title').textContent='Checking forecast…';$('#weather-copy').textContent='Light calculations are ready while weather loads.';}

 try{const data=await forecast(location,controller.signal);if(id!==epoch)return;state.forecast=data;state.window=shootingWindow(location,state.date,state.time,data);$('#shoot-hour').value=String(state.minute);showLight();showWeather();$('#build-status').textContent='';}
 catch(error){if(id!==epoch||controller.signal.aborted)return;state.forecast=null;showWeather();$('#build-status').textContent='Weather is unavailable. Light, places and route remain available.';}
}
function changeMinute(minute){state.minute=minute;$('#shoot-hour').value=String(minute);showWeather();}
$('#shoot-hour').oninput=()=>changeMinute(Number($('#shoot-hour').value));
$('#exact-time').onchange=()=>{const match=/^(\d{2}):(\d{2})$/.exec($('#exact-time').value);if(match&&Number(match[1])<24&&Number(match[2])<60){$('#exact-time').setAttribute('aria-invalid','false');changeMinute(Number(match[1])*60+Number(match[2]));}else{$('#exact-time').setAttribute('aria-invalid','true');}};
$('#time-hour').onchange=()=>{const minute=Number($('#time-minute').value);changeMinute(Number($('#time-hour').value)*60+Math.floor(minute/15)*15);};
$('#time-minute').onchange=()=>changeMinute(Number($('#time-hour').value)*60+Number($('#time-minute').value));
$('#time-now').onclick=()=>{if(!state.location)return;state.day='Today';$('#date-wrap').hidden=true;document.querySelectorAll('[data-group]').forEach(g=>g.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value==='Today'))));build({restore:true});};
function updateSession(instant,solar){
 const clock=String(Math.floor(state.minute/60)).padStart(2,'0')+':'+String(state.minute%60).padStart(2,'0');
 $('#time-minute').querySelectorAll('[data-exact]').forEach(n=>n.remove());
 if(state.minute%15){const option=el('option',String(state.minute%60).padStart(2,'0'));option.value=String(state.minute%60);option.setAttribute('data-exact','true');$('#time-minute').append(option);}
 $('#time-hour').value=String(Math.floor(state.minute/60));$('#time-minute').value=String(state.minute%60);
 $('#exact-time').value=clock;

 const directions=['North','Northeast','East','Southeast','South','Southwest','West','Northwest'];
 const phase=solar.light.status==='Nautical twilight'&&solar.altitude>=-8?'Blue hour':solar.light.status;
 $('#light-title').textContent=phase;

 document.querySelectorAll('#solar-facts button').forEach(b=>{const start=Number(b.dataset.start),end=Number(b.dataset.end);b.setAttribute('aria-pressed',String(!!b.dataset.start&&instant.getTime()>=start&&instant.getTime()<=end));});

}
$('#refresh-weather').onclick=async()=>{
 if(!state.location)return;const id=++weatherEpoch,location=state.location;
 $('#refresh-weather').disabled=true;$('#weather-source').textContent='Refreshing forecast…';
 try{
 const data=await forecast(location,undefined,true);
 if(id!==weatherEpoch||location!==state.location)return;
 state.forecast=data;showWeather();
 }catch{if(id===weatherEpoch){state.forecast=null;showWeather()}}
 finally{$('#refresh-weather').disabled=false}
};
function stopButton(text,label,action,disabled=false){const b=el('button',text);b.type='button';b.setAttribute('aria-label',label);b.disabled=disabled;b.onclick=action;return b}
function renderRoute(){
 $('#stops').replaceChildren();
 state.stops.forEach((stop,index)=>{
 const li=el('li'),content=el('div'),actions=el('div',undefined,'stop-actions');
 content.append(el('h4',stop.name),el('p',[index===0?'START HERE':stop.kind||'Place',stop.region].filter(Boolean).join(' · ')));
 const map=el('a','View map ↗');const url=new URL('https://www.google.com/maps/search/');url.searchParams.set('api','1');url.searchParams.set('query',stop.latitude+','+stop.longitude);map.href=url.href;map.target='_blank';map.rel='noopener noreferrer';content.append(map);
 actions.append(stopButton('↑','Move '+stop.name+' earlier',()=>{[state.stops[index-1],state.stops[index]]=[state.stops[index],state.stops[index-1]];renderRoute()},index===0),stopButton('↓','Move '+stop.name+' later',()=>{[state.stops[index+1],state.stops[index]]=[state.stops[index],state.stops[index+1]];renderRoute()},index===state.stops.length-1),stopButton('×','Remove '+stop.name,()=>{state.stops.splice(index,1);renderRoute()},state.stops.length===1));
 li.append(content,actions);$('#stops').append(li);
 });
 const m=routeMetrics(state.stops);
 $('#route-summary').textContent=state.stops.length+' '+(state.stops.length===1?'stop':'stops')+' · '+(m.estimatedKm/1.609344).toFixed(1)+' mi rough walking estimate · ~'+m.walkMinutes+' min walking + '+m.shootMinutes+' min shooting';
 $('#directions').href=directions(state.stops);
 $('#show-add').disabled=state.stops.length>=5;
 $('#save-status').textContent='';
}
function addStop(location){
 if(state.stops.length>=5){$('#places-status').textContent='Five stops maximum. Remove a stop to add another.';return}
 if(state.stops.some(p=>distance(p,location)<.025&&p.name.toLocaleLowerCase()===location.name.toLocaleLowerCase())){$('#places-status').textContent='That place is already in your walk.';return}
 state.stops.push(location);renderRoute();$('#places-status').textContent=location.name+' added. '+state.stops.length+' stops in your walk.';
 $('#add-form').hidden=true;$('#add-results').replaceChildren();
}
$('#show-add').onclick=()=>{$('#add-form').hidden=!$('#add-form').hidden;if(!$('#add-form').hidden)$('#add-place').focus()};
$('#add-place').oninput=()=>{addEpoch++;addController?.abort();$('#add-form button').disabled=false;$('#add-results').replaceChildren()};
$('#add-form').onsubmit=async e=>{
 e.preventDefault();const id=++addEpoch;addController?.abort();addController=new AbortController();$('#add-form button').disabled=true;$('#add-results').replaceChildren();$('#add-status').textContent='Searching places…';
 try{const results=await searchLocations($('#add-place').value,addController.signal,state.location);if(id!==addEpoch)return;$('#add-results').replaceChildren(...results.map(l=>resultButton(l,addStop)));$('#add-status').textContent=results.length?'Choose a stop. Include the city to narrow your search.':'No matches. Try another name or coordinates.'}
 catch(error){if(id===addEpoch&&error.name!=='AbortError')$('#add-status').textContent=error.message}
 finally{if(id===addEpoch)$('#add-form button').disabled=false}
};
function serialise(){return {version:1,location:state.location,date:state.date,type:state.type,time:state.time,stops:state.stops}}
$('#save').onclick=()=>{
 try{const value=serialise();localStorage.setItem(key,JSON.stringify(value));saved=validSaved(value);$('#restore').hidden=false;$('#clear-saved').hidden=false;$('#save-status').textContent='Saved on this device. Reopen it here when you come back.'}
 catch{$('#save-status').textContent='This browser could not save the shoot. Use Download plan instead.'}
};
$('#clear-saved').onclick=()=>{try{localStorage.removeItem(key);saved=null;$('#restore').hidden=true;$('#clear-saved').hidden=true;$('#save-status').textContent='Saved shoot deleted from this browser.'}catch{$('#save-status').textContent='Could not remove browser storage.'}};
$('#restore').onclick=()=>{
 if(!saved)return;
 const restoreDate=saved.date<localDay(saved.location.timezone)?localDay(saved.location.timezone):saved.date;
 state.type='Explore';state.time=saved.time;state.day='Choose Date';dateInput.min=localDay(saved.location.timezone);dateInput.value=restoreDate;
 selectLocation(saved.location,{restore:true});dateInput.value=restoreDate;state.stops=saved.stops;state.date=restoreDate;
 document.querySelectorAll('[data-group]').forEach(group=>group.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===state[group.dataset.group]))));
 $('#date-wrap').hidden=false;
 build({restore:true,locationChanged:true});if(restoreDate!==saved.date)$('#save-status').textContent='This saved date has passed. Showing Today at your destination; review the date before heading out.';
};
let exportURL;
$('#download').onclick=()=>{
 const w=state.window,m=routeMetrics(state.stops),f=forecastAt(state.forecast,localInstant(state.date,state.minute,state.location.timezone));
 const text=['PHOPOD / BEFORE THE SHOOT',state.location.name,state.date+' / '+state.location.timezone,state.time,'',w.label+': '+time(w.start)+'–'+time(w.end),'Sunrise: '+time(w.times.sunrise)+' / Sunset: '+time(w.times.sunset),f?'Forecast at '+time(localInstant(state.date,state.minute,state.location.timezone))+': '+weatherName(f.code)+(f.temperature===null?'':' / '+Math.round(f.temperature)+'°F'):'Forecast unavailable','',...state.stops.map((p,i)=>(i+1)+'. '+p.name+' / '+p.latitude+', '+p.longitude),'','Rough walking estimate: '+(m.estimatedKm/1.609344).toFixed(1)+' mi, '+m.walkMinutes+' min. Straight-line distances with an allowance; actual paths vary.','Walking directions: '+directions(state.stops),'','Sun times are calculated; buildings and terrain can block light. Forecasts can change. Check access and opening hours.','Weather: Open-Meteo. Place data: © OpenStreetMap contributors.','Created with Phopod.'].join('\n');
 if(exportURL)URL.revokeObjectURL(exportURL);exportURL=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
 const a=el('a');a.href=exportURL;a.download='phopod-shoot-'+state.date+'.txt';document.body.append(a);a.click();a.remove();
};
window.addEventListener('pagehide',()=>{searchController?.abort();addController?.abort();buildController?.abort();if(exportURL)URL.revokeObjectURL(exportURL)});
