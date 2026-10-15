import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {searchLocations,forecast,nearby} from '../data.mjs';
import {coordinates,forecastAt} from '../planning.mjs';
const fixture=JSON.parse(await readFile(new URL('./provider-fixtures.json',import.meta.url),'utf8'));
test('Real provider fixtures normalize, cache and refresh without sample substitution',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async url=>{calls++;const data=String(url).includes('photon')?fixture.search:fixture.weather;return Response.json(data)};
 try{
 const locations=await searchLocations('Chicago');assert.ok(locations.length);assert.equal(locations[0].name,'Chicago');assert.equal(locations[0].timezone,'America/Chicago');
 await searchLocations('Chicago');assert.equal(calls,1);
 const f=await forecast(locations[0]);assert.ok(forecastAt(f,new Date(f.hourly.time[0]*1000)));assert.ok(f.retrievedAt);
 await forecast(locations[0]);assert.equal(calls,2);
 await forecast(locations[0],undefined,true);assert.equal(calls,3);
 }finally{globalThis.fetch=original}
});
test('City search fallback works when Photon is unavailable',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>String(url).includes('photon')?new Response('',{status:503}):Response.json({results:[{id:1,name:'London',latitude:51.5,longitude:-.12,admin1:'England',country:'United Kingdom'}]});
 try{const p=await searchLocations('London');assert.equal(p[0].name,'London');assert.equal(p[0].timezone,'Europe/London')}
 finally{globalThis.fetch=original}
});
test('Coordinate search needs no external service and rejects out-of-range points',async()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('Should not fetch')};
 try{assert.equal((await searchLocations('41.88, -87.63'))[0].timezone,'America/Chicago');await assert.rejects(searchLocations('100, 0'))}
 finally{globalThis.fetch=original}
});
test('Unavailable place and forecast APIs reject instead of fabricating results',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:503});
 try{await assert.rejects(forecast(coordinates(50,50),undefined,true));await assert.rejects(nearby(coordinates(50,50),'Street'))}
 finally{globalThis.fetch=original}
});
test('Live nearby-place fixture filters photographic categories and keeps actual names',async()=>{
 const raw=JSON.parse(await readFile(new URL('./nearby-fixture.json',import.meta.url),'utf8'));
 const original=globalThis.fetch;let requested;
 globalThis.fetch=async url=>{requested=new URL(url);return Response.json(raw)};
 try{
 const places=await nearby(coordinates(41.875561,-87.624421,'Chicago'),'Street');
 assert.ok(places.length>0);
 assert.ok(places.some(p=>p.name.includes('Magdalene')));
 assert.ok(!places.some(p=>p.kind==='hotel'||p.kind==='parking'));
 assert.ok(places.every(p=>p.distanceKm<=1.8));
 assert.equal(requested.pathname,'/reverse');assert.equal(requested.searchParams.get('radius'),'1.5');
 }finally{globalThis.fetch=original}
});
