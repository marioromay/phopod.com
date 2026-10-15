import {copyFile, mkdir, rm, stat, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicFiles} from '../app.mjs';

const root=fileURLToPath(new URL('../', import.meta.url));
const output=resolve(root, 'dist');
// Recreate the output so removed routes and old build files cannot leak into it.
await rm(output, {recursive:true, force:true});
await mkdir(output, {recursive:true});
for (const file of publicFiles) {
  const source=resolve(root, file);
  const destination=resolve(output, file);
  if (!source.startsWith(root) || !destination.startsWith(output+'/')) {
    throw new Error('Public asset path escapes the build directory: '+file);
  }
  if ((await stat(source)).size>25*1024*1024) {
    throw new Error('Public asset exceeds the Cloudflare asset limit: '+file);
  }
  await mkdir(dirname(destination), {recursive:true});
  await copyFile(source, destination);
}
// Keep the existing response header, and serve browser modules as JavaScript.
await writeFile(resolve(output, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n/*.mjs\n  Content-Type: text/javascript; charset=utf-8\n');
console.log('Built '+publicFiles.length+' public files in dist/');
