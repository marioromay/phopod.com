const positive=(v,n)=>{if(!Number.isFinite(v)||v<=0)throw Error(`${n} must be greater than zero.`);return v;};
export function exposure({aperture,shutter,iso,targetAperture,targetShutter,targetIso,solve}){
 positive(aperture,'Original aperture');positive(shutter,'Original shutter');positive(iso,'Original ISO');
 const k=shutter*iso/aperture**2;
 if(solve==='shutter')return k*positive(targetAperture,'New aperture')**2/positive(targetIso,'New ISO');
 if(solve==='iso')return k*positive(targetAperture,'New aperture')**2/positive(targetShutter,'New shutter');
 if(solve==='aperture')return Math.sqrt(positive(targetShutter,'New shutter')*positive(targetIso,'New ISO')/k);
 throw Error('Choose a setting to calculate.');
}
export function depth({focal,aperture,distance,coc}){
 positive(focal,'Focal length');positive(aperture,'Aperture');positive(distance,'Focus distance');positive(coc,'Circle of confusion');
 const s=distance*1000;if(s<=focal)throw Error('Focus distance must exceed the focal length.');
 const h=focal*focal/(aperture*coc)+focal;
 const near=(h-focal)*s/(h+s-2*focal);const den=h-s;const far=den<=0?Infinity:(h-focal)*s/den;
 return {near:near/1000,far:far/1000,hyperfocal:h/1000,total:(far-near)/1000};
}
export function ndExposure(shutter,stops){positive(shutter,'Metered shutter');if(!Number.isFinite(stops)||stops<0||stops>30)throw Error('Use 0 to 30 stops.');return shutter*2**stops;}
export function timelapse({minutes,interval,fps,shutter,mb}){
 positive(minutes,'Capture duration');positive(interval,'Interval');positive(fps,'Frame rate');positive(shutter,'Shutter duration');positive(mb,'File size');
 if(shutter>=interval)throw Error('Shutter duration must be shorter than the start-to-start interval.');
 const seconds=minutes*60;if(shutter>seconds)throw Error('The first exposure exceeds the capture duration.');
 const frames=Math.floor((seconds-shutter)/interval)+1;
 return {frames,playback:frames/fps,storage:frames*mb/1000,speed:interval*fps};
}
export function parseShutter(v){const parts=String(v).trim().split('/');if(parts.length>2||parts.some(x=>!x.trim()))throw Error('Enter seconds or a fraction, such as 1/125.');const n=parts.length===2?Number(parts[0])/Number(parts[1]):Number(parts[0]);return positive(n,'Shutter duration');}
export function duration(v){if(!Number.isFinite(v))return '∞';if(v<1)return `1/${Math.round(1/v).toLocaleString()} s`;if(v<60)return `${Number(v.toFixed(2))} s`;const h=Math.floor(v/3600),m=Math.floor(v%3600/60),s=Number((v%60).toFixed(1));return [h?`${h}h`:'',m?`${m}m`:'',s?`${s}s`:''].filter(Boolean).join(' ')||'0 s';}
export function flash({guide,iso,power,guideUnit='m',distanceUnit='m',distance,aperture,solve}){
 positive(guide,'Guide number');positive(iso,'ISO');positive(power,'Flash power');if(power>1)throw Error('Flash power cannot exceed full power.');
 if(!['m','ft'].includes(guideUnit)||!['m','ft'].includes(distanceUnit))throw Error('Choose meters or feet.');
 const effective=guide*(guideUnit==='ft'?.3048:1)*Math.sqrt(iso/100)*Math.sqrt(power);
 if(solve==='aperture')return {value:effective/(positive(distance,'Distance')*(distanceUnit==='ft'?.3048:1)),effective};
 if(solve==='distance')return {value:effective/positive(aperture,'Aperture')/(distanceUnit==='ft'?.3048:1),effective};
 throw Error('Choose aperture or distance.');
}
