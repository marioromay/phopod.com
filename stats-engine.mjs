// Aggregates only: no photograph bytes, filenames, GPS or serial numbers retained.
export const metrics = [
  {id:'focal',title:'Focal length',note:'Actual focal length, rounded to the nearest millimeter.',numeric:true},
  {id:'aperture',title:'Aperture',note:'Recorded f-number, rounded to one decimal place.',numeric:true},
  {id:'iso',title:'ISO',note:'Recorded ISO sensitivity.',numeric:true},
  {id:'shutter',title:'Shutter speed',note:'Recorded exposure durations grouped into useful ranges.',numeric:true},
  {id:'camera',title:'Camera',note:'Camera make and model recorded in EXIF.'},
  {id:'lens',title:'Lens',note:'Lens model recorded in standard EXIF.'},
  {id:'orientation',title:'Orientation',note:'Current file proportions, accounting for EXIF rotation.'},
  {id:'hour',title:'Shooting hour',note:'Recorded camera time. No time-zone conversion.',numeric:true},
  {id:'month',title:'Shooting month',note:'Year and month from the recorded capture date.'}
];
export function createStats(){return {count:0,withSettings:0,noEXIF:0,partial:0,bytes:0,first:null,last:null,groups:Object.fromEntries(metrics.map(m=>[m.id,{known:0,counts:new Map()}]))};}
const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const clean=s=>typeof s==='string'&&s.trim()?s.trim():null;
const round=n=>Number(n.toFixed(1));
export function addPhoto(stats,data,bytes=0){
  stats.count++;stats.bytes+=bytes;if(!data.exif)stats.noEXIF++;if(data.warnings.length)stats.partial++;
  const t=data.tags;
  if(t.model||t.make||t.lens||[t.focal,t.aperture,t.iso,t.exposure].some(positive))stats.withSettings++;
  const values=photoValues(data);
  for(const [id,key] of Object.entries(values)){
    if(key===null||key===undefined)continue;
    const g=stats.groups[id];g.known++;g.counts.set(key,(g.counts.get(key)||0)+1);
  }
  const date=recordedDate(t.capture);
  if(date){if(!stats.first||date.day<stats.first)stats.first=date.day;if(!stats.last||date.day>stats.last)stats.last=date.day;}
  return stats;
}
export function recordedDate(raw){
  if(typeof raw!=='string')return null;
  const m=raw.match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);if(!m)return null;
  const [,y,month,day,h,min,s]=m;const year=+y,mo=+month,d=+day;
  const limit=new Date(Date.UTC(year,mo,0)).getUTCDate();
  if(year<1000||mo<1||mo>12||d<1||d>limit||+h>23||+min>59||+s>59)return null;
  return {day:y+'-'+month+'-'+day,hour:+h};
}
export function entries(stats,id){const metric=metrics.find(m=>m.id===id);return [...stats.groups[id].counts].sort((a,b)=>metric.numeric?a[0]-b[0]:id==='month'?String(a[0]).localeCompare(String(b[0])):b[1]-a[1]||String(a[0]).localeCompare(String(b[0])));}
export function label(id,value){if(id==='focal')return value+' mm';if(id==='aperture')return 'f/'+value;if(id==='hour')return String(value).padStart(2,'0')+':00';if(id==='shutter')return ['1/1000 sec or faster','Slower than 1/1000 to 1/250','Slower than 1/250 to 1/60','Slower than 1/60 to 1/15','Slower than 1/15 to under 1 sec','1 sec or longer'][value];return String(value);}
export function exportCSV(stats){
  const safe=x=>'"'+String(x).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
  const rows=[['Metric','Value','Photos','Percent of known values','Known values','Missing values']];
  for(const m of metrics){const g=stats.groups[m.id];for(const [key,n]of entries(stats,m.id))rows.push([m.title,label(m.id,key),n,(n/g.known*100).toFixed(1),g.known,stats.count-g.known]);if(!g.known)rows.push([m.title,'No recorded values',0,'',0,stats.count]);}
  return rows.map(row=>row.map(safe).join(',')).join('\r\n');
}

// Store only normalized statistic keys beside session-local File references.
export function photoValues(data){
  const t=data.tags, values=Object.fromEntries(metrics.map(m=>[m.id,null]));
  const add=(id,key)=>{values[id]=key;};
  add('focal',positive(t.focal)?Math.round(t.focal):null);
  add('aperture',positive(t.aperture)?round(t.aperture):null);
  add('iso',positive(t.iso)?t.iso:null);
  if(positive(t.exposure))add('shutter',t.exposure<=1/1000?0:t.exposure<=1/250?1:t.exposure<=1/60?2:t.exposure<=1/15?3:t.exposure<1?4:5);
  const make=clean(t.make),model=clean(t.model);
  add('camera',model?(make&&!model.toLowerCase().includes(make.toLowerCase())?make+' '+model:model):make);
  add('lens',clean(t.lens));
  const rotated=[5,6,7,8].includes(t.orientation),w=rotated?data.height:data.width,h=rotated?data.width:data.height;
  add('orientation',positive(w)&&positive(h)?w===h?'Square':w>h?'Landscape':'Portrait':null);
  const date=recordedDate(t.capture);
  if(date){add('hour',date.hour);add('month',date.day.slice(0,7));}
  return values;
}
export function matchingPhotos(photos,id,key){
  if(!metrics.some(m=>m.id===id))throw Error('Unknown statistic.');
  return photos.filter(photo=>key==='all'||(key==='missing'?photo.values[id]===null:String(photo.values[id])===String(key)));
}
