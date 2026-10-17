import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
export function checkSEO(root){
 root=resolve(root);
 const ignored=new Set(['dist','node_modules','.git','.wrangler']);
 const origin='https://phopod.com',canonical=[],walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(ignored.has(e.name)?[]:walk(join(dir,e.name))):[join(dir,e.name)]);
 const fail=s=>{throw Error(s);};
 const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#x27;/g,"'");
 const image=readFileSync(join(root,'brand/phopod-logo.png'));if(image.readUInt32BE(16)!==1374||image.readUInt32BE(20)!==1145)fail('Social PNG must be 1374 × 1145');
 for(const path of walk(root).filter(p=>p.endsWith('/index.html'))){
  const html=readFileSync(path,'utf8'),canonicalMatches=[...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
  if(canonicalMatches.length!==1||!canonicalMatches[0][1].startsWith(origin+'/'))fail('Missing/duplicate production canonical: '+path);
  if(html.includes('Opening the combined tool.')){if(!html.includes('noindex,follow'))fail('Alias must be noindex: '+path);continue;}
  const route='/'+relative(root,path).replace(/index\.html$/,'');if(canonicalMatches[0][1]!==origin+route)fail('Incorrect canonical: '+path);canonical.push(origin+route);
  const title=[...html.matchAll(/<title>(.*?)<\/title>/g)];if(title.length!==1||decode(title[0][1]).length>75)fail('Invalid title: '+path);
  const description=html.match(/<meta name="description" content="([^"]+)"/);if(!description||decode(description[1]).length<70||decode(description[1]).length>180)fail('Invalid description: '+path);
  for(const key of ['og:title','og:description','og:url','og:image','og:image:alt','twitter:card','twitter:title','twitter:image'])if(!html.includes('"'+key+'"'))fail('Missing '+key+': '+path);
  if(!html.includes('name="author" content="Mario Romay"'))fail('Missing creator: '+path);
  const ld=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];if(ld.length!==1)fail('Missing/duplicate JSON-LD: '+path);
  const graph=JSON.parse(ld[0][1])['@graph'];if(!graph.some(n=>n['@type']==='WebSite')||!graph.some(n=>n['@type']==='Person'&&n.name==='Mario Romay'))fail('Missing truthful site/creator graph: '+path);
  if(graph.some(n=>n.aggregateRating||n.review))fail('Do not fabricate ratings or reviews');
  if(!['/','/about/','/during-the-shoot/','/after-the-shoot/','/credits/'].includes(route)&&!graph.some(n=>n['@type']==='WebApplication'&&n.url===origin+route))fail('Tool schema missing: '+path);
 }
 const sitemap=readFileSync(join(root,'sitemap.xml'),'utf8'),urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
 if(JSON.stringify([...canonical].sort())!==JSON.stringify([...urls].sort()))fail('Sitemap must contain all canonical public pages exactly once');
 const robots=readFileSync(join(root,'robots.txt'),'utf8');if(robots.includes('Allow: /')&&!robots.includes('Sitemap: '+origin+'/sitemap.xml'))fail('Production robots must advertise sitemap');
 return canonical.length;
}
if(process.argv[1]===new URL(import.meta.url).pathname){const root=process.argv[2]||new URL('../dist/',import.meta.url).pathname;console.log(checkSEO(root)+' canonical pages passed SEO checks.');}
