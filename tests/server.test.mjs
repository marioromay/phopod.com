import test from 'node:test';
import assert from 'node:assert/strict';
import {makeServer} from '../app.mjs';
test('production serves all tools, comic and processing assets and excludes private files',async()=>{
 const server=makeServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  for(const [path,text]of [['/','BEFORE'],['/before-the-shoot/','BUILD MY SHOOT'],['/during-the-shoot/','EQUIVALENT EXPOSURE'],['/during-the-shoot/calculators/','FIELD TOOLS'],['/after-the-shoot/','YOUR EXISTING TOOLS'],['/credits/','THE SOURCES'],['/exif/','Shooting details'],['/photo-stats/','Photo Stats'],['/print-size/','Print Size'],['/export/','Crop &amp; Export'],['/contact-sheet/','Contact Sheet'],['/photo-viewer/','PHOTO VIEWER'],['/about/','comic'],['/batch-rename/','Batch Rename']]){const r=await fetch(base+path);assert.equal(r.status,200,path);assert.ok((await r.text()).includes(text),path);}
  for(const path of ['/resize/','/crop/','/batch/','/batch-resize/','/privacy/','/remove-metadata/'])assert.equal((await fetch(base+path)).status,200,path);
  for(const path of ['/during.js','/during.css','/during-engine.mjs','/before.js','/before.css','/stages.css','/shoot-stages.css','/data.mjs','/planning.mjs','/solar.mjs','/vendor/suncalc.mjs','/vendor/tz-lookup.mjs','/stats-report.mjs','/viewer-app.mjs','/viewer-engine.mjs','/viewer-runtime.mjs','/viewer.css','/sheet-arrange.mjs','/redesign.css','/navigation.js','/exif-app.mjs','/export-app.mjs','/exif-cleanup.mjs','/privacy-engine.mjs','/processing.js','/contact-renderer.mjs','/toolset.css','/editorial.css','/stats-visuals.mjs','/image-loader.mjs','/heic-worker.js','/vendor/heic-worker.js','/vendor/heic-to-license.txt','/brand/inspector-focus.png','/brand/inspector-focus-comic.png','/brand/inspector-focus-social.png','/robots.txt','/sitemap.xml','/rename-app.mjs'])assert.equal((await fetch(base+path)).status,200,path);
  for(const path of ['/save-file.html','/save-file.js','/app.mjs','/package.json','/README.md','/AGENTS.md','/scripts/check-seo.mjs','/docs/project-overview.md','/tests/server.test.mjs','/.git/config','/%2e%2e/package.json'])assert.equal((await fetch(base+path)).status,404,path);
  assert.match((await fetch(base+'/exif-app.mjs')).headers.get('content-type'),/javascript/);
  assert.equal((await fetch(base+'/exif/',{method:'POST',body:'no uploads'})).status,405);
  const head=await fetch(base+'/exif/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  for(const path of ['/before-the-shoot','/during-the-shoot','/after-the-shoot','/credits','/exif','/export','/about','/photo-viewer']){const redirect=await fetch(base+path,{redirect:'manual'});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),path+'/');}
 }finally{await new Promise(resolve=>server.close(resolve));}
});
