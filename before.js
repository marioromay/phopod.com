import {coordinates,localDay,validDay,dayDiff,shootingWindow,forecastAt,weatherName,localParts,localInstant,localTime,solarAt,distance,routeMetrics,directions,validSaved} from './planning.mjs?v=phopod-20261015';
import {searchLocations,forecast,nearby} from './data.mjs?v=phopod-20261015';
const $=s=>document.querySelector(s);
const key='inspector-focus:shoot:v1';
const state={location:null,type:'Street',day:'Today',time:'Best Light',date:null,stops:[],forecast:null,window:null,nearby:[],minute:720};
let searchController,addController,buildController,nearbyController,epoch=0,searchEpoch=0,addEpoch=0,geoEpoch=0,weatherEpoch=0,nearbyEpoch=0;
const dateInput=$('#shoot-date');
let saved;try{saved=validSaved(JSON.parse(localStorage.getItem(key)||'null'))}catch{}
$('#restore').hidden=!saved;$('#clear-saved').hidden=!saved;
const safeText=(node,text)=>{node.textContent=text};
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node}
function reveal(node){node.hidden=false;node.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})}
function focusHeading(node){node.focus({preventScroll:true})}
function cancelBuild(){
 epoch++;weatherEpoch++;nearbyEpoch++;addEpoch++;addController?.abort();buildController?.abort();nearbyController?.abort();$('#build').disabled=false;$('#build').innerHTML='BUILD MY SHOOT <span>↗</span>';$('#nearby').disabled=false;$('#results').hidden=true;$('#build-status').textContent='';
}
function adjustDate(){
 if(!state.location)return;
 dateInput.min=localDay(state.location.timezone);
 if(!dateInput.value||dateInput.value<dateInput.min)dateInput.value=dateInput.min;
 state.date=state.day==='Choose Date'?dateInput.value:localDay(state.location.timezone,state.day==='Tomorrow'?1:0);
}
function selectLocation(location,{restore=false}={}){
 searchEpoch++;geoEpoch++;searchController?.abort();$('#search-form button').disabled=false;$('#locate').disabled=false;cancelBuild();state.location=location;state.forecast=null;state.nearby=[];if(!restore)state.stops=[location];
 $('#place').value=location.name;$('#preferences-title').textContent=location.name;
 $('#location-detail').textContent=[location.region,location.timezone,location.latitude.toFixed(4)+', '+location.longitude.toFixed(4)].filter(Boolean).join(' · ');
 $('#suggestions').hidden=true;$('#location-message').textContent='Location selected.';
 adjustDate();reveal($('#preferences'));focusHeading($('#preferences-title'));
}
function resultButton(location,onChoose){
 const b=el('button',undefined,'search-result');b.type='button';
 b.append(el('strong',location.name+' ↗'),el('small',[location.kind,location.region,location.latitude.toFixed(3)+', '+location.longitude.toFixed(3)].filter(Boolean).join(' · ')));
 b.onclick=()=>onChoose(location);return b;
}
async function runSearch(){
 const id=++searchEpoch;searchController?.abort();searchController=new AbortController();
 const message=$('#location-message'),q=$('#place').value.trim(),button=$('#search-form button');
 $('#suggestions').hidden=true;button.disabled=true;message.textContent='Searching locations…';
 try{
 const results=await searchLocations(q,searchController.signal);if(id!==searchEpoch)return;
 $('#suggestion-list').replaceChildren(...results.map(l=>resultButton(l,selectLocation)));
 $('#suggestions').hidden=!results.length;
 message.textContent=results.length?'Choose the matching location below.':'No matching places. Try including the city, or enter latitude, longitude.';
 if(results.length)$('#suggestion-list button').focus();
 }catch(error){if(id===searchEpoch&&error.name!=='AbortError')message.textContent=error.message||'Location search unavailable. Try again or enter coordinates.'}
 finally{if(id===searchEpoch)button.disabled=false}
}
$('#search-form').onsubmit=e=>{e.preventDefault();runSearch()};
$('#place').addEventListener('input',()=>{geoEpoch++;$('#locate').disabled=false;searchEpoch++;searchController?.abort();$('#search-form button').disabled=false;$('#suggestions').hidden=true;$('#location-message').textContent=''});
$('#chicago').onclick=()=>selectLocation({...coordinates(41.8755616,-87.6244212,'Chicago'),region:'Illinois, United States',kind:'City'});
$('#locate').onclick=()=>{
 if(!navigator.geolocation){$('#location-message').textContent='Device location is unavailable. Search a place instead.';return}
 const id=++geoEpoch;$('#locate').disabled=true;$('#location-message').textContent='Waiting for location permission…';
 navigator.geolocation.getCurrentPosition(pos=>{
 if(id!==geoEpoch)return;$('#locate').disabled=false;
 try{selectLocation(coordinates(pos.coords.latitude,pos.coords.longitude,'Your location'));$('#location-message').textContent='Using your device location. You can change it any time.'}catch{$('#location-message').textContent='Could not read location. Search a place instead.'}
 },()=>{
 if(id!==geoEpoch)return;$('#locate').disabled=false;$('#location-message').textContent='Location permission was declined or unavailable. Search a place instead.';
 },{timeout:10000,maximumAge:300000});
};
$('#change-location').onclick=()=>{cancelBuild();$('#preferences').hidden=true;$('#place').focus();$('#place').select();$('#place').scrollIntoView({block:'center'})};
const descriptions={Morning:'Start with sunrise and the morning golden-hour window.',Afternoon:'Plan a daytime session from 1–3 PM at your destination.',Evening:'Start with the evening golden-hour window.', 'Best Light':'Compare upcoming golden-hour windows, using the forecast when available.'};
document.querySelectorAll('[data-group]').forEach(group=>group.onclick=e=>{
 const b=e.target.closest('button');if(!b)return;
 group.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
 state[group.dataset.group]=b.dataset.value;cancelBuild();
 $('#date-wrap').hidden=state.day!=='Choose Date';adjustDate();
 if(group.dataset.group==='day'&&state.day==='Choose Date')dateInput.focus();
 $('#time-description').textContent=descriptions[state.time];
});
dateInput.onchange=()=>{cancelBuild();adjustDate()};
const stamp=d=>new Intl.DateTimeFormat('en-US',{timeZone:state.location.timezone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d);
const time=d=>localTime(d,state.location.timezone);
function metric(value,label){const d=el('div');d.append(el('strong',value),el('span',label));return d}
function showLight(){
 const w=state.window,t=w.times;
 $('#result-meta').textContent=state.location.name+' / '+state.type+' / '+state.date+' / '+state.location.timezone;
 $('#result-title').textContent=w.polar?'A DIFFERENT KIND OF LIGHT.':w.label.toUpperCase()+'.';
 const range=w.polar?'No golden-hour crossing for this date.':time(w.start)+'–'+time(w.end)+' · local time';
 $('#light-title').textContent=range;
 $('#light-copy').textContent=w.polar?'The sun does not cross the usual golden-hour boundaries. Use the time control to inspect its position.':state.time==='Best Light'?'Suggested from upcoming morning and evening golden-hour windows. Where available, forecast cloud, rain and wind help rank them.':'Your selected shooting window, calculated for this location and date.';
 $('#window-note').textContent=w.passed?'These windows have passed for the selected date. Choose Tomorrow or another date to plan ahead.':w.polar?'High-latitude daylight can differ from the familiar sunrise–sunset pattern.':'Start here, then choose the places you want to photograph.';
 $('#solar-facts').replaceChildren();
 for(const [label,start,end] of [['Sunrise',t.sunrise],['Sunset',t.sunset],['Morning golden hour',t.sunrise,t.goldenHourEnd],['Evening golden hour',t.goldenHour,t.sunset],['Morning blue hour',t.blueMorningStart,t.blueMorningEnd],['Evening blue hour',t.blueEveningStart,t.blueEveningEnd]]){
 const d=el('div');d.append(el('dt',label),el('dd',end?time(start)+'–'+time(end):time(start)));$('#solar-facts').append(d);
 }
}
function showWeather(){
 const instant=localInstant(state.date,state.minute,state.location.timezone),f=forecastAt(state.forecast,instant),solar=solarAt(instant,state.location);
 $('#hour-label').textContent=time(instant)+' · '+state.location.timezone;
 $('#sun-position').textContent='Sun at this time: '+solar.light.status+' · '+(solar.belowHorizon?'below the horizon':solar.light.sunDirection+' · '+Math.round(solar.altitude)+'° elevation');
 $('#weather-metrics').replaceChildren();
 if(!f){
 $('#weather-title').textContent='Forecast unavailable.';
 const outside=dayDiff(localDay(state.location.timezone),state.date);
 $('#weather-copy').textContent=outside<0?'This preview does not retrieve historical weather. Sun times still work.':outside>15?'This date is outside the forecast window. Sun times still work; check weather closer to your shoot.':'Could not get a forecast for this hour. Refresh to try again; your light and route remain available.';
 $('#weather-source').textContent='Open-Meteo · no forecast shown';return;
 }
 $('#weather-title').textContent=weatherName(f.code)+'.';
 const effect=solar.belowHorizon?'Look for artificial light and illuminated streets.':f.cloud===null?'Cloud cover is unavailable; direct sunlight is uncertain.':f.cloud>=80?'Heavy cloud may soften daylight and reduce direct sun.':f.cloud>=30?'Broken cloud may interrupt direct sunlight.':'Limited cloud may allow direct sun where buildings permit.';
 $('#weather-copy').textContent=effect+(f.rainChance!==null&&f.rainChance>=50?' Rain is possible; consider a sheltered alternative.':'')+(f.wind!==null&&f.wind>=20?' Wind may be noticeable in exposed locations.':'');
 $('#weather-metrics').append(metric(f.temperature===null?'—':Math.round(f.temperature)+'°F','TEMPERATURE'),metric(f.cloud===null?'—':Math.round(f.cloud)+'%','CLOUD COVER'),metric(f.rainChance===null?'—':Math.round(f.rainChance)+'%','RAIN CHANCE'),metric(f.wind===null?'—':Math.round(f.wind)+' mph','WIND'));
 $('#weather-source').textContent='Open-Meteo forecast · '+stamp(instant)+' · retrieved '+stamp(new Date(state.forecast.retrievedAt));
}
async function build({restore=false}={}){
 if(!state.location)return;adjustDate();
 if(state.day==='Choose Date'&&(!dateInput.value||!dateInput.checkValidity())){dateInput.reportValidity();return}
 if(!validDay(state.date))return;
 cancelBuild();const id=epoch;buildController=new AbortController();$('#build').disabled=true;$('#build').textContent='CHECKING YOUR SHOOT…';$('#build-status').textContent='Calculating light and requesting the forecast…';
 state.forecast=null;
 try{state.forecast=await forecast(state.location,buildController.signal)}catch(error){if(buildController.signal.aborted)return}
 if(id!==epoch)return;
 state.window=shootingWindow(state.location,state.date,state.time,state.forecast);
 state.minute=localParts(state.window.start,state.location.timezone).minute;
 $('#shoot-hour').value=String(state.minute);showLight();showWeather();
 if(!restore||!state.stops.length)state.stops=[state.location];
 state.nearby=[];$('#nearby-list').replaceChildren();$('#add-form').hidden=true;$('#add-results').replaceChildren();$('#places-status').textContent='';$('#save-status').textContent='';
 renderRoute();$('#build-status').textContent='';$('#build').disabled=false;$('#build').innerHTML='BUILD MY SHOOT <span>↗</span>';
 $('#preferences').hidden=true;reveal($('#results'));focusHeading($('#result-title'));
}
$('#build').onclick=()=>build();
$('#edit').onclick=()=>{cancelBuild();reveal($('#preferences'));focusHeading($('#preferences-title'))};
$('#shoot-hour').oninput=()=>{state.minute=Number($('#shoot-hour').value);showWeather()};
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
 $('#show-add').disabled=state.stops.length>=5;$('#nearby').disabled=state.stops.length>=5;
 $('#save-status').textContent='';renderCandidates();
}
function addStop(location){
 if(state.stops.length>=5){$('#places-status').textContent='Five stops maximum. Remove a stop to add another.';return}
 if(state.stops.some(p=>distance(p,location)<.025&&p.name.toLocaleLowerCase()===location.name.toLocaleLowerCase())){$('#places-status').textContent='That place is already in your walk.';return}
 state.stops.push(location);renderRoute();$('#places-status').textContent=location.name+' added. '+state.stops.length+' stops in your walk.';
 $('#add-form').hidden=true;$('#add-results').replaceChildren();
}
function renderCandidates(){
 $('#nearby-list').replaceChildren();
 for(const location of state.nearby){
 const row=el('div',undefined,'candidate'),copy=el('div');copy.append(el('strong',location.name),el('small',location.kind+' · '+(location.distanceKm/1.609344).toFixed(1)+' mi from your selected location'+(location.openingHours?' · Hours listed in map data':'')));
 const existing=state.stops.some(p=>distance(p,location)<.025&&p.name.toLocaleLowerCase()===location.name.toLocaleLowerCase());
 const b=stopButton(existing?'Added ✓':'+ Add','Add '+location.name,()=>addStop(location),existing||state.stops.length>=5);row.append(copy,b);$('#nearby-list').append(row);
 }
}
$('#nearby').onclick=async()=>{
 const id=++nearbyEpoch;nearbyController?.abort();nearbyController=new AbortController();const location=state.location,type=state.type;
 $('#nearby').disabled=true;$('#places-status').textContent='Looking for named places within about one mile…';state.nearby=[];renderCandidates();
 try{const places=await nearby(location,type,nearbyController.signal);if(id!==nearbyEpoch||location!==state.location||$('#results').hidden)return;state.nearby=places;renderCandidates();$('#places-status').textContent=places.length?'OpenStreetMap places near your selected location. Add the ones you want to shoot.':'No matching places found nearby. Add a place by name instead.'}
 catch(error){if(id===nearbyEpoch&&error.name!=='AbortError')$('#places-status').textContent='Nearby places are unavailable. Try again, or add a place by name.'}
 finally{if(id===nearbyEpoch)$('#nearby').disabled=state.stops.length>=5}
};
$('#show-add').onclick=()=>{$('#add-form').hidden=!$('#add-form').hidden;if(!$('#add-form').hidden)$('#add-place').focus()};
$('#add-place').oninput=()=>{addEpoch++;addController?.abort();$('#add-form button').disabled=false;$('#add-results').replaceChildren()};
$('#add-form').onsubmit=async e=>{
 e.preventDefault();const id=++addEpoch;addController?.abort();addController=new AbortController();$('#add-form button').disabled=true;$('#add-results').replaceChildren();$('#add-status').textContent='Searching places…';
 try{const results=await searchLocations($('#add-place').value,addController.signal);if(id!==addEpoch)return;$('#add-results').replaceChildren(...results.map(l=>resultButton(l,addStop)));$('#add-status').textContent=results.length?'Choose a stop. Include the city to narrow your search.':'No matches. Try another name or coordinates.'}
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
 state.type=saved.type;state.time=saved.time;state.day='Choose Date';dateInput.min=localDay(saved.location.timezone);dateInput.value=restoreDate;
 selectLocation(saved.location,{restore:true});dateInput.value=restoreDate;state.stops=saved.stops;state.date=restoreDate;
 document.querySelectorAll('[data-group]').forEach(group=>group.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===state[group.dataset.group]))));
 $('#date-wrap').hidden=false;
 if(restoreDate!==saved.date){$('#build-status').textContent='Saved shoot loaded. Its date has passed, so the date is now Today. Review it and build your shoot.';}else build({restore:true});
};
let exportURL;
$('#download').onclick=()=>{
 const w=state.window,m=routeMetrics(state.stops),f=forecastAt(state.forecast,localInstant(state.date,state.minute,state.location.timezone));
 const text=['PHOPOD / BEFORE THE SHOOT',state.location.name,state.date+' / '+state.location.timezone,state.type+' / '+state.time,'',w.label+': '+time(w.start)+'–'+time(w.end),'Sunrise: '+time(w.times.sunrise)+' / Sunset: '+time(w.times.sunset),f?'Forecast at '+time(localInstant(state.date,state.minute,state.location.timezone))+': '+weatherName(f.code)+(f.temperature===null?'':' / '+Math.round(f.temperature)+'°F'):'Forecast unavailable','',...state.stops.map((p,i)=>(i+1)+'. '+p.name+' / '+p.latitude+', '+p.longitude),'','Rough walking estimate: '+(m.estimatedKm/1.609344).toFixed(1)+' mi, '+m.walkMinutes+' min. Straight-line distances with an allowance; actual paths vary.','Walking directions: '+directions(state.stops),'','Sun times are calculated; buildings and terrain can block light. Forecasts can change. Check access and opening hours.','Weather: Open-Meteo. Place data: © OpenStreetMap contributors.','Created with Phopod.'].join('\n');
 if(exportURL)URL.revokeObjectURL(exportURL);exportURL=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
 const a=el('a');a.href=exportURL;a.download='phopod-shoot-'+state.date+'.txt';document.body.append(a);a.click();a.remove();
};
window.addEventListener('pagehide',()=>{searchController?.abort();addController?.abort();buildController?.abort();nearbyController?.abort();if(exportURL)URL.revokeObjectURL(exportURL)});
