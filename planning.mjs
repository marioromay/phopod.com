import tzLookup from './vendor/tz-lookup.mjs?v=phopod-20261015';
import {localParts,localInstant,solarAt,localTime} from './solar.mjs?v=phopod-20261015';
export {localParts,localInstant,solarAt,localTime};
export function coordinates(latitude,longitude,name='Your location'){
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw Error('Enter valid latitude, longitude.');
 return {name,latitude,longitude,timezone:tzLookup(latitude,longitude),region:'',kind:'Coordinates',id:latitude+','+longitude};
}
export function normalizeLocation(f){
 const p=f?.properties,c=f?.geometry?.coordinates;
 const name=p?.name||[p?.housenumber,p?.street].filter(Boolean).join(' ');
 if(typeof name!=='string'||!name.trim()||name.length>250||f?.geometry?.type!=='Point'||!Array.isArray(c)||!['N','W','R'].includes(p?.osm_type)||!Number.isFinite(p?.osm_id))return null;
 try{return {...coordinates(c[1],c[0],name),id:p.osm_type+p.osm_id,region:[p.city,p.state,p.country].filter(Boolean).join(', '),kind:(p.osm_value||'place').replaceAll('_',' '),sourceUrl:'https://www.openstreetmap.org/'+{N:'node',W:'way',R:'relation'}[p.osm_type]+'/'+p.osm_id};}catch{return null}
}
export function localDay(zone,offset=0,now=new Date()){
 const day=localParts(now,zone).date;
 const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);
}
export function validDay(day){if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;const date=new Date(day+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day}
export function dayDiff(first,last){return Math.round((Date.parse(last+'T12:00:00Z')-Date.parse(first+'T12:00:00Z'))/86400000)}
export function distance(a,b){
 const rad=v=>v*Math.PI/180;
 const v=Math.sin(rad(b.latitude-a.latitude)/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(rad(b.longitude-a.longitude)/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(v),Math.sqrt(Math.max(0,1-v)));
}
export function forecastAt(data,instant){
 const t=instant instanceof Date?instant.getTime()/1000:NaN;
 const hours=data?.hourly?.time;if(!Array.isArray(hours)||!Number.isFinite(t))return null;
 const i=hours.findIndex(start=>Number.isFinite(start)&&t>=start&&t<start+3600);if(i<0)return null;
 const value=k=>{const v=data.hourly[k]?.[i];return typeof v==='number'&&Number.isFinite(v)?v:null};
 return {time:hours[i],temperature:value('temperature_2m'),cloud:value('cloud_cover'),rainChance:value('precipitation_probability'),wind:value('wind_speed_10m'),code:value('weather_code')};
}
export function weatherName(code){
 if(code===null)return 'Conditions unavailable';
 if(code===0)return 'Clear sky';if(code<=2)return 'Partly cloudy';if(code===3)return 'Overcast';if(code<=48)return 'Fog';
 if(code<=57)return 'Drizzle';if(code<=67)return 'Rain';if(code<=77)return 'Snow';if(code<=82)return 'Rain showers';if(code<=86)return 'Snow showers';return 'Thunderstorms';
}
export function shootingWindow(location,date,period,forecast=null,now=new Date()){
 if(!validDay(date))throw Error('Choose a valid shoot date.');
 const noon=localInstant(date,720,location.timezone);
 const s=solarAt(noon,location),t=s.times;
 const window=(label,start,end)=>start instanceof Date&&end instanceof Date&&Number.isFinite(start.getTime())&&Number.isFinite(end.getTime())&&end>start?{label,start,end}:null;
 let options=[];
 if(period==='Morning')options=[window('Morning light',t.sunrise,t.goldenHourEnd)];
 else if(period==='Evening')options=[window('Evening light',t.goldenHour,t.sunset)];
 else if(period==='Afternoon'){
 const start=localInstant(date,13*60,location.timezone),end=localInstant(date,15*60,location.timezone);
 options=[window('Afternoon',start,end)];
 }else options=[window('Morning golden hour',t.sunrise,t.goldenHourEnd),window('Evening golden hour',t.goldenHour,t.sunset)];
 options=options.filter(Boolean);
 const today=localParts(now,location.timezone).date;
 let upcoming=options.filter(w=>date!==today||w.end>now);
 if(period==='Best Light'&&upcoming.length>1){
  upcoming.sort((a,b)=>{
   const score=w=>{const f=forecastAt(forecast,new Date((w.start.getTime()+w.end.getTime())/2));return f? (f.rainChance??30)*.6+(f.cloud??50)*.25+(f.wind??0)*.4:50};
   return score(a)-score(b)||a.start-b.start;
  });
 }
 let chosen=upcoming[0]||options[0];
 const passed=date<today||(date===today&&(!chosen||chosen.end<=now));
 if(!chosen){
  chosen={label:'No golden-hour crossing',start:noon,end:new Date(noon.getTime()+3600000)};
  return {...chosen,times:t,solar:s,passed,polar:true,options};
 }
 return {...chosen,times:t,solar:s,passed,polar:false,options};
}
export function normalizePlaces(raw,location,type){
 const seen=new Set(),result=[];
 for(const e of raw?.elements??[]){
  const tags=e.tags||{},lat=e.lat??e.center?.lat,lon=e.lon??e.center?.lon;
  if(!tags.name||tags.access==='private'||tags.access==='no'||!Number.isFinite(lat)||!Number.isFinite(lon))continue;
  let p;try{p=coordinates(lat,lon,tags.name)}catch{continue}
  const km=distance(location,p);if(km>1.8)continue;
  const key=tags.name.toLocaleLowerCase()+':'+lat.toFixed(3)+':'+lon.toFixed(3);if(seen.has(key))continue;seen.add(key);
  const category=tags.tourism||tags.leisure||tags.historic||tags.amenity||tags.building||'place';
  const score=type==='Architecture'?(tags.building||tags.historic?0:2):type==='Cityscape'?(tags.tourism==='viewpoint'||tags.leisure==='park'?0:2):type==='Street'?(tags.amenity==='marketplace'||tags.place==='square'?0:2):0;
  result.push({...p,id:e.type+e.id,kind:category.replaceAll('_',' '),distanceKm:km,score,openingHours:tags.opening_hours||'',sourceUrl:'https://www.openstreetmap.org/'+e.type+'/'+e.id});
 }
 return result.sort((a,b)=>a.score-b.score||a.distanceKm-b.distanceKm).slice(0,8);
}
export function routeMetrics(stops){
 let km=0;for(let i=1;i<stops.length;i++)km+=distance(stops[i-1],stops[i]);
 return {directKm:km,estimatedKm:km*1.3,walkMinutes:Math.ceil(km*1.3/4.5*60),shootMinutes:stops.length*20};
}
export function directions(stops){
 if(!stops.length)return null;
 const point=p=>p.latitude+','+p.longitude;
 const url=new URL('https://www.google.com/maps/dir/');
 url.searchParams.set('api','1');url.searchParams.set('travelmode','walking');
 url.searchParams.set('destination',point(stops.at(-1)));
 if(stops.length>1)url.searchParams.set('origin',point(stops[0]));
 if(stops.length>2)url.searchParams.set('waypoints',stops.slice(1,-1).map(point).join('|'));
 return url.href;
}
export function validSaved(value){
 if(!value||value.version!==1||!validDay(value.date)||!['Street','Architecture','Cityscape','Explore'].includes(value.type)||!['Morning','Afternoon','Evening','Best Light'].includes(value.time)||!Array.isArray(value.stops)||!value.stops.length||value.stops.length>5)return null;
 try{
 const clean=p=>{if(typeof p?.name!=='string'||p.name.length>250)throw Error();const c=coordinates(p.latitude,p.longitude,p.name);return {...c,kind:typeof p.kind==='string'?p.kind.slice(0,80):'Place'}};
 return {version:1,date:value.date,type:value.type,time:value.time,location:clean(value.location),stops:value.stops.map(clean)};
 }catch{return null}
}
