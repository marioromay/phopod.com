// Read-only JPEG/TIFF EXIF inspection. No network calls or image rewriting.
export function inspectJPEG(buffer) {
  const v = new DataView(buffer), length = v.byteLength;
  if (length < 4 || v.getUint16(0) !== 0xffd8) throw new Error('Choose a valid JPEG photograph (.jpg or .jpeg).');
  const result = { tags: {}, width: null, height: null, exif: false, warnings: [], gps: false };
  let p = 2;
  while (p < length) {
    if (v.getUint8(p++) !== 255) throw new Error('The JPEG structure could not be read.');
    while (p < length && v.getUint8(p) === 255) p++;
    if (p >= length) break;
    const marker = v.getUint8(p++);
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (p + 2 > length) throw new Error('This JPEG appears incomplete.');
    const size = v.getUint16(p), start = p + 2, end = p + size;
    if (size < 2 || end > length) throw new Error('This JPEG appears incomplete.');
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && size >= 8) {
      result.height = v.getUint16(start + 1); result.width = v.getUint16(start + 3);
    }
    if (marker === 0xe1 && end - start >= 6 && v.getUint32(start) === 0x45786966 && v.getUint16(start + 4) === 0) {
      result.exif = true;
      try { readTIFF(start + 6, end); } catch { result.warnings.push('Some EXIF fields could not be read.'); }
    }
    p = end;
  }
  if (!result.width || !result.height) throw new Error('No valid JPEG image dimensions were found.');
  return result;

  function readTIFF(base, end) {
    const safe = (offset, count) => { if (!Number.isSafeInteger(offset) || offset < base || offset + count > end) throw new Error('Invalid EXIF offset'); };
    safe(base,8);
    const order = v.getUint16(base), little = order === 0x4949;
    if (order !== 0x4949 && order !== 0x4d4d) throw new Error('Invalid byte order');
    const u16 = x => { safe(x,2); return v.getUint16(x,little); };
    const u32 = x => { safe(x,4); return v.getUint32(x,little); };
    if (u16(base+2) !== 42) throw new Error('Invalid TIFF');
    const names = {271:'make',272:'model',274:'orientation',33434:'exposure',33437:'aperture',34855:'iso',36867:'capture',36881:'offset',37386:'focal',42036:'lens',42033:'cameraSerial',42037:'lensSerial',315:'artist',33432:'copyright'};
    const visited = new Set();
    function value(entry) {
      const type = u16(entry+2), count = u32(entry+4), sizes = {1:1,2:1,3:2,4:4,5:8,7:1,9:4,10:8}, size = sizes[type];
      if (!size || !count || count > 65536) return undefined;
      const bytes = size * count, at = bytes <= 4 ? entry+8 : base+u32(entry+8); safe(at,bytes);
      if (type === 2) return new TextDecoder().decode(new Uint8Array(buffer,at,count)).replace(/\0.*$/s,'').trim();
      const values = [];
      for (let i=0;i<count;i++) {
        const x = at+i*size;
        if (type === 5 || type === 10) {
          const n = type === 10 ? v.getInt32(x,little) : u32(x), d = type === 10 ? v.getInt32(x+4,little) : u32(x+4);
          values.push(d ? n/d : null);
        } else values.push(type === 3 ? u16(x) : type === 4 ? u32(x) : type === 9 ? v.getInt32(x,little) : v.getUint8(x));
      }
      return count === 1 ? values[0] : values;
    }
    function directory(offset, gps = false, depth = 0) {
      if (!offset || depth > 3 || visited.has(offset)) return;
      visited.add(offset); const at = base+offset, count=u16(at); safe(at+2,count*12);
      for (let i=0;i<count;i++) {
        const e = at+2+i*12, tag=u16(e);
        try {
        if (tag === 34853 && !gps) { result.gps = true; directory(u32(e+8),true,depth+1); }
        else if (tag === 34665 && !gps) directory(u32(e+8),false,depth+1);
        else if (gps && [1,2,3,4].includes(tag)) result.tags['gps'+tag] = value(e);
        else if (!gps && names[tag]) result.tags[names[tag]] = value(e);
        } catch { result.warnings.push('An EXIF field could not be read.'); }
      }
    }
    directory(u32(base+4));
  }
}

export function coordinates(tags) {
  const decimal = (a, ref, positive, negative, max) => {
    if (!Array.isArray(a) || a.length !== 3 || !a.every(n=>Number.isFinite(n) && n>=0) || a[1]>=60 || a[2]>=60 || ![positive,negative].includes(ref)) return null;
    const value=a[0]+a[1]/60+a[2]/3600;
    return value <= max ? value*(ref===negative?-1:1) : null;
  };
  const lat=decimal(tags.gps2,tags.gps1,'N','S',90), lon=decimal(tags.gps4,tags.gps3,'E','W',180);
  return lat === null || lon === null ? null : [lat,lon];
}
