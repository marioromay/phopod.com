const encoder=new TextEncoder();
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);return n>>>0;});
export function crc32(bytes){let crc=0xffffffff;for(const byte of bytes)crc=(crc>>>8)^crcTable[(crc^byte)&255];return (crc^0xffffffff)>>>0;}
export function uniqueName(name,used){const stem=name.replace(/\.jpg$/i,'');let candidate=stem+'.jpg',index=2;while(used.has(candidate.toLowerCase()))candidate=`${stem}-${index++}.jpg`;used.add(candidate.toLowerCase());return candidate;}
export function makeZIP(entries){
 const parts=[],directory=[];let offset=0,centralSize=0;
 for(const entry of entries){const name=encoder.encode(entry.name),bytes=entry.bytes,crc=crc32(bytes),header=new Uint8Array(30+name.length),v=new DataView(header.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,name.length,true);header.set(name,30);parts.push(header,bytes);
 const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);directory.push(central);centralSize+=central.length;offset+=header.length+bytes.length;
 }
 if(entries.length>65535||offset+centralSize>0xffffffff)throw Error('The ZIP is too large. Choose a smaller batch.');
 const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);return new Blob([...parts,...directory,end],{type:'application/zip'});
}

export const makeZip=makeZIP;
