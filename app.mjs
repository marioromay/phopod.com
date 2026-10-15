// Hostinger Node entrypoint. Photograph processing stays in the browser.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('./',import.meta.url);
const routes=new Map([
 ["/before.css", "before.css"],
 ["/stages.css", "stages.css"],
 ["/before.js", "before.js"],
 ["/during.js", "during.js"],
 ["/during.css", "during.css"],
 ["/during-engine.mjs", "during-engine.mjs"],
 ["/data.mjs", "data.mjs"],
 ["/planning.mjs", "planning.mjs"],
 ["/solar.mjs", "solar.mjs"],
 ["/vendor/suncalc.mjs", "vendor/suncalc.mjs"],
 ["/vendor/tz-lookup.mjs", "vendor/tz-lookup.mjs"],
 ["/vendor/suncalc-LICENSE.txt", "vendor/suncalc-LICENSE.txt"],
 ["/vendor/tz-lookup-LICENSE.txt", "vendor/tz-lookup-LICENSE.txt"],
 ["/before-the-shoot/index.html", "before-the-shoot/index.html"],
 ["/before-the-shoot/", "before-the-shoot/index.html"],
 ["/during-the-shoot/index.html", "during-the-shoot/index.html"],
 ["/during-the-shoot/", "during-the-shoot/index.html"],
 ["/during-the-shoot/calculators/", "during-the-shoot/calculators/index.html"],
 ["/during-the-shoot/calculators/index.html", "during-the-shoot/calculators/index.html"],
 ["/after-the-shoot/index.html", "after-the-shoot/index.html"],
 ["/after-the-shoot/", "after-the-shoot/index.html"],
 ["/credits/index.html", "credits/index.html"],
 ["/credits/", "credits/index.html"],
 ["/shoot-stages.css", "shoot-stages.css"],
 ["/footer.js", "footer.js"],
 ["/brand/shootwalk-mark-black.png", "brand/shootwalk-mark-black.png"],
 ["/brand/shootwalk-mark-white.png", "brand/shootwalk-mark-white.png"],
 ["/stats-report.mjs", "stats-report.mjs"],
 ["/viewer-runtime.mjs", "viewer-runtime.mjs"],
 ["/viewer.css", "viewer.css"],
 ["/viewer-engine.mjs", "viewer-engine.mjs"],
 ["/sheet-arrange.mjs", "sheet-arrange.mjs"],
 ["/selection-handoff.mjs", "selection-handoff.mjs"],
 ["/viewer-app.mjs", "viewer-app.mjs"],
 ["/photo-viewer/index.html", "photo-viewer/index.html"],
 ["/photo-viewer/", "photo-viewer/index.html"],
 ["/redesign.css", "redesign.css"],
 ["/navigation.js", "navigation.js"],
 [
  "/about/index.html",
  "about/index.html"
 ],
 [
  "/batch-app.mjs",
  "batch-app.mjs"
 ],
 [
  "/batch-rename/index.html",
  "batch-rename/index.html"
 ],
 [
  "/batch-resize/index.html",
  "batch-resize/index.html"
 ],
 [
  "/batch/index.html",
  "batch/index.html"
 ],
 [
  "/brand/inspector-focus-comic.png",
  "brand/inspector-focus-comic.png"
 ],
 [
  "/brand/inspector-focus-social.png",
  "brand/inspector-focus-social.png"
 ],
 [
  "/brand/inspector-focus.png",
  "brand/inspector-focus.png"
 ],
 [
  "/contact-app.mjs",
  "contact-app.mjs"
 ],
 [
  "/contact-engine.mjs",
  "contact-engine.mjs"
 ],
 [
  "/contact-renderer.mjs",
  "contact-renderer.mjs"
 ],
 [
  "/contact-sheet/index.html",
  "contact-sheet/index.html"
 ],
 [
  "/contact.css",
  "contact.css"
 ],
 [
  "/crop-app.mjs",
  "crop-app.mjs"
 ],
 [
  "/crop-engine.mjs",
  "crop-engine.mjs"
 ],
 [
  "/crop/index.html",
  "crop/index.html"
 ],
 [
  "/editorial.css",
  "editorial.css"
 ],
 [
  "/exif-app.mjs",
  "exif-app.mjs"
 ],
 [
  "/exif-cleanup.mjs",
  "exif-cleanup.mjs"
 ],
 [
  "/exif-reader.mjs",
  "exif-reader.mjs"
 ],
 [
  "/exif/index.html",
  "exif/index.html"
 ],
 [
  "/export-app.mjs",
  "export-app.mjs"
 ],
 [
  "/export/index.html",
  "export/index.html"
 ],
 [
  "/favicon.svg",
  "favicon.svg"
 ],
 [
  "/heic-worker.js",
  "heic-worker.js"
 ],
 [
  "/helvetica.mjs",
  "helvetica.mjs"
 ],
 [
  "/home.css",
  "home.css"
 ],
 [
  "/image-loader.mjs",
  "image-loader.mjs"
 ],
 [
  "/index.html",
  "index.html"
 ],
 [
  "/photo-order.mjs",
  "photo-order.mjs"
 ],
 [
  "/photo-stats/index.html",
  "photo-stats/index.html"
 ],
 [
  "/print-app.mjs",
  "print-app.mjs"
 ],
 [
  "/print-engine.mjs",
  "print-engine.mjs"
 ],
 [
  "/print-size/index.html",
  "print-size/index.html"
 ],
 [
  "/print.css",
  "print.css"
 ],
 [
  "/privacy-app.mjs",
  "privacy-app.mjs"
 ],
 [
  "/privacy-engine.mjs",
  "privacy-engine.mjs"
 ],
 [
  "/privacy/index.html",
  "privacy/index.html"
 ],
 [
  "/processing.js",
  "processing.js"
 ],
 [
  "/remove-metadata/index.html",
  "remove-metadata/index.html"
 ],
 [
  "/rename-app.mjs",
  "rename-app.mjs"
 ],
 [
  "/rename-engine.mjs",
  "rename-engine.mjs"
 ],
 [
  "/resize-app.mjs",
  "resize-app.mjs"
 ],
 [
  "/resize-engine.mjs",
  "resize-engine.mjs"
 ],
 [
  "/resize.css",
  "resize.css"
 ],
 [
  "/resize/index.html",
  "resize/index.html"
 ],
 [
  "/robots.txt",
  "robots.txt"
 ],
 [
  "/sitemap.xml",
  "sitemap.xml"
 ],
 [
  "/splash.js",
  "splash.js"
 ],
 [
  "/stats-app.mjs",
  "stats-app.mjs"
 ],
 [
  "/stats-engine.mjs",
  "stats-engine.mjs"
 ],
 [
  "/stats-visuals.mjs",
  "stats-visuals.mjs"
 ],
 [
  "/stats.css",
  "stats.css"
 ],
 [
  "/style.css",
  "style.css"
 ],
 [
  "/theme.js",
  "theme.js"
 ],
 [
  "/toolset.css",
  "toolset.css"
 ],
 [
  "/vendor/heic-to-license.txt",
  "vendor/heic-to-license.txt"
 ],
 [
  "/vendor/heic-worker.js",
  "vendor/heic-worker.js"
 ],
 [
  "/workspace.mjs",
  "workspace.mjs"
 ],
 [
  "/zip-engine.mjs",
  "zip-engine.mjs"
 ],
 [
  "/",
  "index.html"
 ],
 [
  "/about/",
  "about/index.html"
 ],
 [
  "/batch/",
  "batch/index.html"
 ],
 [
  "/batch-rename/",
  "batch-rename/index.html"
 ],
 [
  "/batch-resize/",
  "batch-resize/index.html"
 ],
 [
  "/contact-sheet/",
  "contact-sheet/index.html"
 ],
 [
  "/crop/",
  "crop/index.html"
 ],
 [
  "/exif/",
  "exif/index.html"
 ],
 [
  "/export/",
  "export/index.html"
 ],
 [
  "/photo-stats/",
  "photo-stats/index.html"
 ],
 [
  "/print-size/",
  "print-size/index.html"
 ],
 [
  "/privacy/",
  "privacy/index.html"
 ],
 [
  "/remove-metadata/",
  "remove-metadata/index.html"
 ],
 [
  "/resize/",
  "resize/index.html"
 ]
]);
const directoryRoutes=new Set(["/during-the-shoot/calculators","/before-the-shoot","/during-the-shoot","/after-the-shoot","/credits","/photo-viewer", "/about", "/batch", "/batch-rename", "/batch-resize", "/contact-sheet", "/crop", "/exif", "/export", "/photo-stats", "/print-size", "/privacy", "/remove-metadata", "/resize"]);
const mime={html:'text/html; charset=utf-8',mjs:'text/javascript; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml',png:'image/png',txt:'text/plain; charset=utf-8',xml:'application/xml; charset=utf-8'};
// The static build uses the same public file allowlist as the Node server.
export const publicFiles=Object.freeze([...new Set(routes.values())]);
export function makeServer(){return createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'});res.end('Method not allowed');return;}
 let path;try{path=new URL(req.url,'http://localhost').pathname;}catch{res.writeHead(400);res.end('Bad request');return;}
 if(directoryRoutes.has(path)){res.writeHead(308,{'Location':path+'/'});res.end();return;}
 const file=routes.get(path);
 if(!file){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end(req.method==='HEAD'?undefined:'Page not found');return;}
 try{const body=await readFile(new URL(file,root));res.writeHead(200,{'Content-Type':mime[file.split('.').pop()],'Content-Length':body.length,'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:body);}
 catch{res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'});res.end('Could not serve this page');}
});}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const port=Number(process.env.PORT||3000);
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT');
 makeServer().listen(port,'0.0.0.0',()=>console.log('Phopod listening on port '+port));
}
