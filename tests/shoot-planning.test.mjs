import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinates,localDay,validDay,localInstant,localParts,shootingWindow,forecastAt,normalizeLocation,normalizePlaces,distance,routeMetrics,directions,validSaved} from '../planning.mjs';
const chicago=coordinates(41.88,-87.63,'Chicago');
test('Destination zones and dates remain independent of the browser zone',()=>{
 assert.equal(chicago.timezone,'America/Chicago');
 assert.equal(localDay('Asia/Tokyo',0,new Date('2026-10-15T01:00:00Z')),'2026-10-15');
 assert.equal(localDay('America/Chicago',0,new Date('2026-10-15T01:00:00Z')),'2026-10-14');
 assert.equal(localDay('America/Chicago',1,new Date('2026-12-31T18:00:00Z')),'2027-01-01');
});
test('Wall times resolve across seasonal time offsets',()=>{
 assert.equal(localInstant('2026-03-08',12*60,'America/Chicago').toISOString(),'2026-03-08T17:00:00.000Z');
 assert.equal(localInstant('2026-11-01',12*60,'America/Chicago').toISOString(),'2026-11-01T18:00:00.000Z');
});
test('Solar windows match Chicago autumn daylight, and expired windows are flagged',()=>{
 const now=new Date('2026-10-14T12:00:00Z'),w=shootingWindow(chicago,'2026-10-14','Evening',null,now);
 const minute=localParts(w.start,chicago.timezone).minute;
 assert.ok(minute>16*60&&minute<18*60);
 assert.ok(w.end>w.start);
 assert.equal(w.passed,false);
 assert.equal(shootingWindow(chicago,'2026-10-14','Best Light',null,new Date('2026-10-15T03:00:00Z')).passed,true);
});
test('Best Light selects a future window, never an expired morning',()=>{
 const now=localInstant('2026-10-14',12*60,chicago.timezone);
 const w=shootingWindow(chicago,'2026-10-14','Best Light',null,now);
 assert.equal(w.label,'Evening golden hour');assert.ok(w.end>now);
});
test('Polar conditions return unavailable crossings without invalid dates',()=>{
 const w=shootingWindow(coordinates(69.6492,18.9553),'2026-12-21','Best Light',null,new Date('2026-12-20T00:00:00Z'));
 assert.equal(w.polar,true);assert.ok(Number.isFinite(w.start.getTime()));
});
test('Invalid dates and coordinates are rejected',()=>{
 assert.equal(validDay('2026-02-30'),false);assert.equal(validDay('2028-02-29'),true);
 assert.throws(()=>coordinates(91,0));assert.throws(()=>coordinates(0,NaN));
 assert.throws(()=>shootingWindow(chicago,'2026-02-30','Morning'));
});
test('Forecasts use epoch timestamps and never turn missing values into zero',()=>{
 const d={hourly:{time:[1000,4600],temperature_2m:[null,55],precipitation_probability:[null,20]}};
 assert.equal(forecastAt(d,new Date(2000*1000)).temperature,null);
 assert.equal(forecastAt(d,new Date(5000*1000)).temperature,55);
 assert.equal(forecastAt(d,new Date(9000*1000)),null);
});
test('Search normalization validates coordinates and uses the destination timezone',()=>{
 const feature={type:'Feature',geometry:{type:'Point',coordinates:[-87.63,41.88]},properties:{name:'Chicago',osm_type:'R',osm_id:12,osm_value:'city',state:'Illinois'}};
 assert.equal(normalizeLocation(feature).timezone,'America/Chicago');
 assert.equal(normalizeLocation({...feature,geometry:{type:'Point',coordinates:[NaN,0]}}),null);
 assert.equal(normalizeLocation({}),null);
});
test('Nearby results exclude private access and faraway points',()=>{
 const raw={elements:[{type:'node',id:1,lat:41.881,lon:-87.63,tags:{name:'Square',place:'square'}},{type:'node',id:2,lat:41.88,lon:-87.63,tags:{name:'Private',access:'private'}},{type:'node',id:3,lat:42.88,lon:-87.63,tags:{name:'Far'}}]};
 assert.deepEqual(normalizePlaces(raw,chicago,'Street').map(p=>p.name),['Square']);
});
test('Route totals, stop order and walking links remain consistent',()=>{
 const stops=[chicago,coordinates(41.89,-87.63,'North'),coordinates(41.90,-87.63,'Finish')];
 const m=routeMetrics(stops);assert.ok(m.directKm>2&&m.directKm<2.3);assert.equal(m.shootMinutes,60);
 const url=new URL(directions(stops));assert.equal(url.searchParams.get('travelmode'),'walking');assert.equal(url.searchParams.get('origin'),'41.88,-87.63');assert.equal(url.searchParams.get('destination'),'41.9,-87.63');assert.equal(url.searchParams.get('waypoints'),'41.89,-87.63');
 assert.equal(distance(stops[0],stops[0]),0);
});
test('Saved shoots validate every field and strip untrusted external URLs',()=>{
 const value={version:1,date:'2026-10-15',type:'Street',time:'Best Light',location:chicago,stops:[{...chicago,sourceUrl:'javascript:alert(1)'}]};
 assert.ok(validSaved(value));assert.equal(validSaved(value).stops[0].sourceUrl,undefined);
 assert.equal(validSaved({...value,stops:[]}),null);assert.equal(validSaved({...value,stops:[{...chicago,latitude:200}]}),null);
 assert.equal(validSaved({...value,date:'2026-02-30'}),null);
});
