import {normalizeLocation,coordinates,normalizePlaces,distance} from './planning.mjs?v=live-before-20261016';
const cache=new Map();
export async function fetchJSON(url,{signal,ttl=300000,force=false}={}){
 const key=String(url),old=cache.get(key);if(!force&&old&&old.until>Date.now())return old.data;
 const timeout=AbortSignal.timeout(18000);const response=await fetch(url,{signal:signal?AbortSignal.any([signal,timeout]):timeout});
 if(!response.ok)throw Error(response.status===429?'The location service is busy. Please try again shortly.':'Data is temporarily unavailable. Please try again.');
 const data=await response.json();if(cache.size>40)cache.delete(cache.keys().next().value);cache.set(key,{data,until:Date.now()+ttl});return data;
}
export async function searchLocations(query,signal,bias){
 const q=query.trim();if(q.length<3||q.length>120)throw Error('Enter a location with 3–120 characters.');
 const pair=q.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
 if(pair)return [coordinates(Number(pair[1]),Number(pair[2]),'Selected coordinates')];
 const url=new URL('https://photon.komoot.io/api/');url.search=new URLSearchParams({q,limit:'15',lang:'en'}).toString();
 if(Number.isFinite(bias?.latitude)&&Number.isFinite(bias?.longitude)){url.searchParams.set('lat',bias.latitude);url.searchParams.set('lon',bias.longitude);url.searchParams.set('zoom','10');url.searchParams.set('location_bias_scale','0.1');}
 let raw;
 try{raw=await fetchJSON(url,{signal,ttl:86400000})}
 catch(error){
  if(signal?.aborted)throw error;
  const fallback=new URL('https://geocoding-api.open-meteo.com/v1/search');fallback.search=new URLSearchParams({name:q,count:'6',language:'en',format:'json'}).toString();
  const data=await fetchJSON(fallback,{signal,ttl:86400000});
  return (data.results||[]).flatMap(r=>{try{return [{...coordinates(r.latitude,r.longitude,r.name),id:String(r.id),region:[r.admin1,r.country].filter(Boolean).join(', '),kind:'City'}]}catch{return []}});
 }
 const seen=new Set();
 return rankLocations((raw.features||[]).map(normalizeLocation).filter(p=>p&&!seen.has(p.id)&&seen.add(p.id)),q,bias).slice(0,10);
}
export async function forecast(location,signal,force=false){
 const url=new URL('https://api.open-meteo.com/v1/forecast');
 url.search=new URLSearchParams({latitude:location.latitude.toFixed(4),longitude:location.longitude.toFixed(4),hourly:'temperature_2m,cloud_cover,precipitation_probability,wind_speed_10m,weather_code',timezone:'auto',forecast_days:'16',timeformat:'unixtime',temperature_unit:'fahrenheit',wind_speed_unit:'mph'}).toString();
 const data=await fetchJSON(url,{signal,ttl:600000,force});
 if(!Array.isArray(data.hourly?.time)||!data.hourly.time.length)throw Error('Forecast unavailable.');
 return {...data,retrievedAt:new Date().toISOString()};
}
export async function nearby(location,type,signal){
 const url=new URL('https://photon.komoot.io/reverse');
 url.search=new URLSearchParams({lat:location.latitude.toFixed(5),lon:location.longitude.toFixed(5),radius:'1.5',limit:'16',lang:'en'}).toString();
 const tags=type==='Explore'?['place:square','amenity:marketplace','tourism:artwork','tourism:attraction','tourism:viewpoint','tourism:museum','leisure:park','historic','building:cathedral','building:civic']:type==='Architecture'?['historic','tourism:museum','tourism:attraction','building:cathedral','building:civic']:type==='Cityscape'?['tourism:viewpoint','tourism:attraction','leisure:park']:['place:square','amenity:marketplace','tourism:artwork','tourism:attraction','tourism:viewpoint','tourism:museum','leisure:park'];
 for(const tag of tags)url.searchParams.append('osm_tag',tag);
 const raw=await fetchJSON(url,{signal,ttl:1800000});
 const elements=(raw.features||[]).flatMap(f=>{
  const p=normalizeLocation(f);if(!p)return [];
  const props=f.properties;
  if(!tags.some(t=>{const [key,value]=t.split(':');return props.osm_key===key&&(!value||props.osm_value===value)}))return [];
  return [{type:{N:'node',W:'way',R:'relation'}[props.osm_type],id:props.osm_id,lat:p.latitude,lon:p.longitude,tags:{name:p.name,[props.osm_key]:props.osm_value}}];
 });
 return normalizePlaces({elements},location,type);
}

// Local relevance is a ranking hint, never a selected or precise device location.
export function rankLocations(results,query,bias){
 const words=s=>s.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).filter(w=>w!=='the');
 const q=words(query);const score=p=>{const name=words(p.name+' '+(p.address||'')+' '+(p.region||''));const match=q.filter(w=>name.includes(w)).length/Math.max(q.length,1);const km=Number.isFinite(bias?.latitude)&&Number.isFinite(bias?.longitude)?distance(bias,p):null;return match*10+(km===null?0:2.5/(1+km/40));};
 return [...results].sort((a,b)=>score(b)-score(a));
}
export async function approximateArea(){
 try{const r=await fetch('https://ipapi.co/json/',{signal:AbortSignal.timeout(3500),credentials:'omit'});if(!r.ok)return null;const d=await r.json();return Number.isFinite(d.latitude)&&Number.isFinite(d.longitude)&&Math.abs(d.latitude)<=90&&Math.abs(d.longitude)<=180?{latitude:d.latitude,longitude:d.longitude}:null;}catch{return null;}
}
export async function readableDeviceLocation(location,signal){
 try{const url=new URL('https://photon.komoot.io/reverse');url.search=new URLSearchParams({lat:location.latitude,lon:location.longitude,limit:'1',lang:'en'});const raw=await fetchJSON(url,{signal});const named=normalizeLocation(raw.features?.[0]);return named?{...location,name:named.name,address:named.address,region:named.region,kind:'Device location'}:location;}catch{return location;}
}
