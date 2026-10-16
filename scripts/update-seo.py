"""Generate accurate static SEO from the current public page catalog."""
from pathlib import Path
import argparse,html,json,re

ORIGIN='https://phopod.com'
PAGES=[
 ('/during-the-shoot/calculators/', 'Exposure, Focus, ND, Timelapse & Flash Calculators | Phopod', 'Calculate equivalent exposure, depth of field, ND exposure, timelapse timing and manual flash settings in your browser.', 'Photography Calculators', 'Calculate equivalent exposure, depth of field, ND exposure, timelapse timing and direct manual flash aperture or distance locally.'),
 ('/before-the-shoot/', 'Photography Shoot Planner: Light, Weather & Routes | Phopod', 'Choose a location, date and time to explore sunlight and weather together. Check golden and blue hours, add your own stops and save a shoot.', 'Before the Shoot', 'Plan a shoot using location search, destination-local sunlight calculations, hourly weather forecasts, a shared time control and an editable five-stop walking plan. Save one shoot on your device, download a text itinerary, or open external walking directions.'),
 ('/during-the-shoot/', 'Photography Calculators: Exposure, Focus & Timelapse | Phopod', 'Calculate equivalent exposure, depth of field, ND exposure, timelapse timing and manual flash aperture or distance locally with Phopod.', 'During the Shoot', None),
 ('/after-the-shoot/', 'After the Shoot: Seven Photography Tools | Phopod', 'Inspect EXIF, analyze photo statistics, rename originals, check print sizes, crop and export, make contact sheets and build offline photo viewers.', 'After the Shoot', None),
 ('/credits/', 'Data Sources & Credits | Phopod', 'Read about Phopod location and forecast providers, sunlight calculations, browser-local shoot storage and third-party software licenses.', 'Data Sources & Credits', None),

 ('/','Before, During & After the Shoot | Phopod','Plan where and when to shoot, then inspect, prepare, print and deliver your photographs with Phopod. Free photography tools by Mario Romay.','Phopod',None),
 ('/exif/','JPEG EXIF Viewer & Metadata Remover | Phopod','View JPEG camera settings, capture dates and GPS metadata. Remove detected metadata from a new copy without recompressing the photo. Process locally.','EXIF Data','Inspect JPEG shooting metadata and create a cleaned copy without recompressing the image.'),
 ('/photo-stats/','Photo Stats & PDF Inspection Report | Phopod','Analyze JPEG shooting patterns, equipment and missing metadata. Explore matching photos and export a local PDF inspection report with charts or aggregate CSV.','Photo Stats','Analyze recorded JPEG camera settings with camera and lens donut charts, compact ordered bars and an hourly histogram, a separate matching-photo panel, missing-value counts, an inspection summary and local PDF/CSV report exports.'),
 ('/batch-rename/','Batch Photo Renamer & ZIP Download | Phopod','Preview consistent photo filenames with a prefix, sequence and optional JPEG capture date. Download renamed originals in a ZIP, preserving quality and metadata.','Batch Rename','Preview sequential filenames for chosen photos or an arranged Contact Sheet selection; download renamed originals in a ZIP preserving exact bytes and metadata.'),
 ('/print-size/','Photo Print Size & PPI Calculator | Phopod','Check photo print sizes and crop-aware PPI for JPEG, PNG, WebP, HEIC or AVIF. Compare framing and retained pixels locally before choosing a print size.','Print Size','Estimate print sizes, pixel density and the retained image area for a selected print crop.'),
 ('/export/','Crop, Resize & Convert Photos Locally | Phopod','Crop, resize and convert photos locally. Export JPEG, PNG or WebP under a file-size limit, individually or in a batch ZIP. Supports HEIC and AVIF input.','Crop & Export','Crop, resize and convert photographs locally; export JPEG, PNG or WebP with optional per-photo file-size limits, individually or in a batch ZIP.'),
 ('/contact-sheet/','Photo Contact Sheet PDF Maker | Phopod','Create printable PDF contact sheets. Arrange photographs directly on the sheet, add titles and filenames, or send ordered originals to Batch Rename. No photo uploads.','Contact Sheet','Arrange photographs directly on the sheet; export PDFs with optional photographer credit, or transfer ordered originals locally to Photo Viewer and Batch Rename.'),
 ('/photo-viewer/','Offline Photo Gallery & Slideshow Creator | Phopod','Create an offline photo book and slideshow ZIP with page turns, title and photographer credit. Arrange photos, connect to Contact Sheet and share JPEG review copies.','Photo Viewer','Arrange photographs in the creator; export an offline photo book with page turns, manual navigation, swipe gestures, timed playback, optimized JPEG copies, local branding, a website link and light/dark mode; open a self-contained offline preview and download from the completion popup, using direct browser downloads; transfer ordered originals to and from Contact Sheet.'),
 ('/about/','Meet Phopod: The Robot Comic | Phopod','Meet Phopod, the camera-inspired robot behind Mario Romay’s photography utilities, through his black-and-white origin comic.','Meet Phopod',None),
]

def generate(root,indexable):
 for route,title,description,name,feature in PAGES:
  path=root/route.strip('/')/'index.html';s=path.read_text()
  s=re.sub(r'<title>.*?</title>','',s,flags=re.S)
  s=re.sub(r'<meta\b[^>]*(?:name="(?:description|author|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>','',s)
  s=re.sub(r'<link\b[^>]*rel="canonical"[^>]*>','',s)
  s=re.sub(r'<script\b[^>]*type="application/ld\+json"[^>]*>.*?</script>','',s,flags=re.S)
  url=ORIGIN+route;image=ORIGIN+'/brand/inspector-focus-social.png?v=phopod-20261015'
  creator={'@type':'Person','@id':ORIGIN+'/#creator','name':'Mario Romay','url':'https://marioromay.com'}
  site={'@type':'WebSite','@id':ORIGIN+'/#website','name':'Phopod','url':ORIGIN+'/','creator':{'@id':creator['@id']}}
  page={'@type':'WebPage','@id':url+'#page','url':url,'name':title,'description':description,'isPartOf':{'@id':site['@id']},'creator':{'@id':creator['@id']},'inLanguage':'en'}
  graph=[creator,site,page]
  if feature:
   tool={'@type':'WebApplication','@id':url+'#tool','name':name,'url':url,'description':feature,'applicationCategory':'MultimediaApplication','operatingSystem':'Modern web browser','browserRequirements':'JavaScript and browser file APIs required','isAccessibleForFree':True,'offers':{'@type':'Offer','price':'0','priceCurrency':'USD'},'creator':{'@id':creator['@id']},'featureList':feature}
   graph.append(tool);page['mainEntity']={'@id':tool['@id']}
  else:page['about']={'@id':site['@id']}
  esc=lambda v:html.escape(v,quote=True)
  metas=[f'<title>{esc(title)}</title>',f'<meta name="description" content="{esc(description)}">','<meta name="author" content="Mario Romay">',f'<meta name="robots" content="{"index,follow,max-image-preview:large" if indexable else "noindex,nofollow"}">',f'<link rel="canonical" href="{url}">']
  values={'og:type':'website','og:site_name':'Phopod','og:title':title,'og:description':description,'og:url':url,'og:image':image,'og:image:width':'1200','og:image:height':'630','og:image:alt':'Phopod photography utilities by Mario Romay, with the black-and-white robot logo','og:locale':'en_US'}
  metas.extend(f'<meta property="{k}" content="{esc(v)}">' for k,v in values.items())
  metas.extend(f'<meta name="{k}" content="{esc(v)}">' for k,v in {'twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':image,'twitter:image:alt':values['og:image:alt']}.items())
  metas.append('<script type="application/ld+json">'+json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False).replace('<','\\u003c')+'</script>')
  s=s.replace('</head>','\n'+'\n'.join(metas)+'\n</head>');path.write_text(s)
 for path in root.rglob('index.html'):
  route='/'+str(path.parent.relative_to(root)).strip('.')+'/'
  if path==root/'index.html' or route in [p[0] for p in PAGES]:continue
  s=path.read_text();s=re.sub(r'<link rel="canonical" href="(/[^"]*)">',lambda m:'<link rel="canonical" href="'+ORIGIN+m[1]+'">',s)
  s=re.sub(r'<meta name="robots"[^>]*>','',s);s=s.replace('</head>','<meta name="robots" content="noindex,follow"></head>');path.write_text(s)
 urls=''.join('<url><loc>'+ORIGIN+p[0]+'</loc></url>\n' for p in PAGES)
 (root/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls+'</urlset>\n')
 (root/'robots.txt').write_text('User-agent: *\n'+('Allow: /\nSitemap: '+ORIGIN+'/sitemap.xml\n' if indexable else 'Disallow: /\n'))

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--directory',type=Path,default=(Path(__file__).resolve().parents[1]/'dist' if (Path(__file__).resolve().parents[1]/'dist').exists() else Path(__file__).resolve().parents[1]));parser.add_argument('--indexable',action='store_true');args=parser.parse_args();generate(args.directory,args.indexable)
