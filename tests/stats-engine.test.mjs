import test from 'node:test';
import assert from 'node:assert/strict';
import {createStats,addPhoto,recordedDate,entries,exportCSV} from '../stats-engine.mjs';
const photo=(tags={},extra={})=>({tags,width:6000,height:4000,exif:true,warnings:[],...extra});
test('Missing exposure values do not enter the denominator',()=>{
  const s=createStats();addPhoto(s,photo({focal:35,iso:800}));addPhoto(s,photo({focal:35}));addPhoto(s,photo({}, {exif:false}));
  assert.equal(s.count,3);assert.equal(s.groups.focal.known,2);assert.deepEqual(entries(s,'focal'),[[35,2]]);assert.equal(s.groups.iso.known,1);assert.equal(s.noEXIF,1);assert.equal(s.withSettings,2);assert.equal(s.groups.orientation.known,3);
});
test('EXIF orientation and square files',()=>{
  const s=createStats();addPhoto(s,photo({orientation:6}));addPhoto(s,photo({}, {width:100,height:100}));assert.deepEqual(entries(s,'orientation'),[['Portrait',1],['Square',1]]);
});
test('Capture dates use recorded time, validate calendar dates, and preserve years',()=>{
  assert.equal(recordedDate('2026:02:30 12:00:00'),null);assert.equal(recordedDate('2026:02:01 24:00:00'),null);assert.equal(recordedDate('2024:02:29 23:00:00').hour,23);
  const s=createStats();addPhoto(s,photo({capture:'2026:10:10 23:30:00',offset:'+09:00'}));addPhoto(s,photo({capture:'2025:10:10 06:30:00'}));assert.equal(s.first,'2025-10-10');assert.equal(s.last,'2026-10-10');assert.deepEqual(entries(s,'hour'),[[6,1],[23,1]]);assert.equal(s.groups.month.counts.size,2);
});
test('Exposure boundaries and invalid values',()=>{
  const s=createStats();for(const exposure of [1/1000,1/250,1/60,1/15,.5,1,0,NaN])addPhoto(s,photo({exposure}));assert.deepEqual(entries(s,'shutter'),[[0,1],[1,1],[2,1],[3,1],[4,1],[5,1]]);assert.equal(s.groups.shutter.known,6);
});
test('Camera make normalization and numerical distribution order',()=>{
  const s=createStats();addPhoto(s,photo({make:'SONY',model:'Sony a6700',focal:100}));addPhoto(s,photo({make:'SONY',model:'ILCE-6700',focal:24}));assert.equal(s.groups.camera.counts.get('Sony a6700'),1);assert.equal(s.groups.camera.counts.get('SONY ILCE-6700'),1);assert.deepEqual(entries(s,'focal'),[[24,1],[100,1]]);
});
test('CSV exports aggregates, handles quotes, blocks formula cells, excludes GPS',()=>{
  const s=createStats();addPhoto(s,photo({lens:'=DANGEROUS',model:'A "camera"',gps2:[41,0,0],capture:'2026:10:10 10:00:00'}));const csv=exportCSV(s);assert.ok(csv.includes("'=DANGEROUS"));assert.ok(csv.includes('A ""camera""'));assert.ok(!csv.includes('gps'));assert.ok(csv.includes('Percent of known values'));assert.ok(csv.includes('No recorded values'));
});
test('Empty collection and partial reads remain explicit',()=>{const s=createStats();assert.deepEqual(entries(s,'focal'),[]);assert.ok(exportCSV(s).includes('No recorded values'));addPhoto(s,photo({}, {warnings:['Bad field']}));assert.equal(s.partial,1);});
test('photo filter keys match aggregate buckets, including missing data and shutter boundaries',async()=>{
 const {photoValues,matchingPhotos,metrics}=await import('../stats-engine.mjs');
 const records=[{width:6000,height:4000,tags:{focal:35.4,aperture:5.56,iso:400,exposure:1/250,make:'Sony',model:'ILCE-6700',lens:'Prime',orientation:6,capture:'2026:10:10 16:05:00'},exif:true,warnings:[]},{width:200,height:100,tags:{exposure:1/1000},exif:true,warnings:[]},{width:100,height:100,tags:{capture:'2026:02:30 12:00:00'},exif:false,warnings:[]}];
 const stats=createStats(),photos=records.map((data,i)=>{addPhoto(stats,data);return {file:{name:i+'.jpg'},values:photoValues(data)};});
 for(const metric of metrics){for(const [key,count] of stats.groups[metric.id].counts)assert.equal(matchingPhotos(photos,metric.id,String(key)).length,count);assert.equal(matchingPhotos(photos,metric.id,'missing').length,stats.count-stats.groups[metric.id].known);}
 assert.equal(photos[0].values.orientation,'Portrait');assert.equal(photos[0].values.aperture,5.6);assert.equal(photos[2].values.hour,null);assert.equal(matchingPhotos(photos,'focal','all').length,3);assert.throws(()=>matchingPhotos(photos,'gps','all'));
});
