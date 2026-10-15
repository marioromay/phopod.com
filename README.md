# Phopod

Photography tools for **before, during and after the shoot**.

## Create the Cloudflare Worker

1. Connect this repository: marioromay/phopod.com.
2. Use the main branch and repository root.
3. Worker name: phopod-com.
4. Build command: npm run build.
5. Deploy command: npx wrangler deploy.
6. After deployment, connect phopod.com as its custom domain.

The build validates SEO and packages only the public allowlist into dist/.
No database, R2 bucket, secrets or Node server binding is required.
The existing Inspector Focus Worker is a separate service and is not modified by
deploying this repository. No redirects are configured here.

Public metadata and generated website links are prepared for https://phopod.com.
The domain is not connected by this repository migration.

Validation: npm test, npm run build.

## Migration source

Imported from marioromay/inspectorfocus.com at
5f4f70d0494b427711709c4648a3198f7b7f0bf2, including the Phopod naming update,
Meet Phopod comic, shoot planner and removal of ShootWalk referral links.
Legacy asset paths and browser storage keys remain compatible intentionally.

---


Browser-based photography tools for https://phopod.com. Photograph processing stays local; originals remain unchanged.

Seven tools: EXIF Data with metadata removal, Photo Stats with camera/lens donuts and compact settings bars, Batch Rename, Print Size, Crop & Export with batch ZIP download, Contact Sheet PDFs with author credit and direct arrangement, and Photo Viewer. Contact Sheet and Photo Viewer share ordered selections. Photo Viewer creates a branded offline ZIP with manual or timed playback and light/dark mode; its separate-tab preview embeds the JPEGs. Photo Viewer and Batch Rename retain completion popups with direct ZIP downloads; other tools dismiss progress when finished. Viewer controls use aligned icons, and its photo-book preview uses the offline layout. Meet Phopod opens the supplied robot comic.

## Development

Use Node 20 or newer. Run `npm start` to serve locally and `npm test` for checks. The server entrypoint is `app.mjs`; the browser EXIF controller is `exif-app.mjs`. Public files are at the repository root. The Node server requires no runtime dependencies.

## Cloudflare Workers static hosting

Run `npm run build` to recreate `dist/` from the Node server's public file allowlist. It preserves public paths and file bytes, including browser modules, brand assets, decoder/license, robots.txt and sitemap.xml. Server code, package files, tests, scripts, documentation and node_modules are excluded. Generated `dist/` and Wrangler state are ignored by Git.

In Cloudflare Workers Builds, set the build command to `npm run build` and deploy command to `npx wrangler deploy`. `wrangler.jsonc` configures `phopod-com` with only `./dist` as its assets directory. Folder pages retain trailing-slash URLs and unmatched paths return genuine 404s; there is no SPA fallback or Worker server entrypoint. `npm run deploy` builds and deploys from a local checkout. Keep the existing Node entrypoint for Hostinger/local use. No DNS or domain migration is performed by this configuration change.

## Project notes

- [Project overview](docs/project-overview.md)
- [Tools and behavior](docs/tools-and-behavior.md)
- [Design and brand](docs/design-and-brand.md)
- [Development and deployment](docs/development-and-deployment.md)

See the notes for processing limits, metadata cleanup guarantees, file handoff behavior, and deployment checks.


## Photo Stats inspection report


After analyzing JPEGs, choose **Inspection report / PDF**. The collection-wide report offers an optional title and photographer credit, US Letter/A4, and a native PDF download. CSV remains available. Sample data cannot be exported.

The four-page summary covers collection/metadata totals, equipment, weighted median ISO and range, tied shooting-pattern leaders, exact repeated-filename counts, largest oriented image dimensions, uncropped 300-PPI print estimate, distinct reduced aspect ratios, recorded dates, and all nine statistics. Charts display up to eight categories; truncated or abbreviated categories receive complete, paginated exact-value appendix tables. Shooting times use the recorded camera clock; percentages exclude missing fields. Stopped analyses remain explicitly partial, including when more photos are appended later.

`stats-report.mjs` generates the model and PDF locally, with vector charts, searchable standard Helvetica/Helvetica-Bold text, a JPEG robot logo, page numbers and a linked footer. Titles and labels use safe hex encoding; unsupported WinAnsi characters are replaced with `?` and reported. Export includes no individual filenames, source photo bytes, GPS or serial numbers. Optional title/credit text is intentionally included. Repeated filenames are case-sensitive and do not imply duplicate image contents. Near-duplicates are not assessed. Print size is an estimate, not a quality guarantee.

Collection changes revoke old PDF URLs and prevent unfinished exports from downloading stale results. Real interactive browser/mobile PDF download QA remains pending. The production server allowlist includes the report module; the EXIF controller/server naming split is preserved.

PDF presentation refinement: compact white header with the original robot at its native proportions, INSPECTION REPORT, optional collection title, photographer/report date, and a thin red rule. Removed Inspection Complete/Completed Collection; only stopped collections receive a partial note. Every page repeats the footer “Inspection report by Phopod.” and “Get yours at inspectorfocus.com”, linked to the public homepage, with page numbering at right. Logo raster preparation retains up to a 600px edge at quality 98 instead of the former padded 240px square.

## Before, During and After the Shoot — October 15, 2026

Phopod now groups the experience around three stages. The homepage links
to /before-the-shoot/, /during-the-shoot/ and /after-the-shoot/. The seven existing
photo tools retain their canonical routes, browser controllers, file handoffs and
download behavior. After the Shoot links to them in the same tab. The robot comic
remains available from Meet Phopod.

Before the Shoot adds real place search, device location, destination-time-zone
sunlight calculations, hourly forecasts, nearby places and editable five-stop walks.
A shoot can be explicitly saved on this device, deleted or downloaded as a text
itinerary. Google Maps supplies external walking directions; in-page distances and
times are rough estimates. During the Shoot is clearly marked coming next.

Location and forecast requests use third-party providers; no photographs are
requested by the planner. See /credits/ for Photon/OpenStreetMap, Open-Meteo,
SunCalc and tz-lookup details and licenses. No secrets or new Cloudflare resources
are needed. ShootWalk remains unchanged; no redirects are added.

Validation: 167 automated tests, 13 canonical-page SEO checks, and the allowlist
static build passed. Interactive desktop/mobile testing remains pending.

## Phopod naming update

Phopod is the platform and the robot. Visible interface copy, generated-report branding,
download names, social artwork and the Meet Phopod comic use the new name. The robot
design is preserved. Meet Phopod remains available in new-page footers on phones.
Existing domains, repo/Worker identifiers, asset URLs and browser storage keys remain
compatible; phopod.com is a separately registered destination awaiting domain cutover.

## During the Shoot calculators

The stage opens as a five-tool directory. Calculators at /during-the-shoot/calculators/ cover equivalent exposure, depth of field/hyperfocal distance, ND exposure, timelapse and direct manual flash. The header contains only field tools. Calculations run locally; assumptions are expandable. Flash supports ISO, manual power and independent guide-number/distance units. Its estimate excludes bounce, modifiers and HSS.

Validation: 179 tests passed, 14 canonical-page SEO checks passed, 92 public assets built. Interactive desktop/mobile acceptance testing remains pending.
