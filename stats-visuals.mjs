import {entries,label} from './stats-engine.mjs?v=phopod-20261015';
export function leaders(stats,id){
 const g=stats.groups[id],values=entries(stats,id),maximum=Math.max(0,...values.map(([,n])=>n));
 const tied=values.filter(([,n])=>n===maximum);
 return {known:g.known,missing:stats.count-g.known,count:maximum,percent:g.known?maximum/g.known*100:0,values:tied.map(([key])=>label(id,key))};
}
export function chartValues(stats,id){
 const g=stats.groups[id];const values=id==='hour'?Array.from({length:24},(_,h)=>[h,g.counts.get(h)||0]):entries(stats,id);
 const max=Math.max(0,...values.map(([,count])=>count));
 return values.map(([key,count])=>({key,label:label(id,key),count,percent:g.known?count/g.known*100:0,height:max?count/max*100:0,leading:count>0&&count===max}));
}

export function donutValues(stats,id,limit=5){
 const values=chartValues(stats,id).sort((a,b)=>b.count-a.count);
 if(values.length<=limit)return values;
 const members=values.slice(limit),count=members.reduce((sum,v)=>sum+v.count,0),known=stats.groups[id].known;
 return [...values.slice(0,limit),{key:null,label:'Other',count,percent:known?count/known*100:0,leading:false,members}];
}
