# Development and deployment

Technical notes for the October 10, 2026 project snapshot.

## Architecture

The user interface is buildless HTML, CSS, and browser JavaScript modules. Photograph processing does not require a server API or image uploads. Pure engine modules implement parsing, crop geometry, resize constraints, statistics, ZIP construction, metadata cleanup, and contact-sheet layout/PDF construction. Tool controllers connect those engines to the interface.

The private preview checkout publishes its dist directory. The production GitHub repository is https://github.com/marioromay/phopod.com and places public files at the repository root. Its Node entrypoint is app.mjs; the browser EXIF controller is exif-app.mjs. Preserve this distinction when copying files from the preview, where the EXIF controller is named dist/app.mjs.

## Important modules

| Concern | Modules |
| --- | --- |
| EXIF inspection and cleanup | exif-app.mjs, exif-reader.mjs, exif-cleanup.mjs, privacy-engine.mjs |
| Combined crop and export | export-app.mjs, crop-engine.mjs, resize-engine.mjs, zip-engine.mjs |
| Print estimates | print-app.mjs, print-engine.mjs |
| Collection statistics | stats-app.mjs, stats-engine.mjs |
| Contact sheets | contact-app.mjs, contact-engine.mjs, contact-renderer.mjs |
| Cross-tool file handoff | workspace.mjs |
| Progress popup | processing.js |
| Theme and shared styling | theme.js, style.css, editorial.css, toolset.css |

## Local commands

Production uses Node 20 or newer and has no runtime package dependencies.

```sh
npm start
npm test
```

The server uses PORT when supplied, otherwise port 3000. It serves an explicit allowlist of public pages and assets, supports GET and HEAD, redirects directory routes to trailing slashes, and rejects upload requests. Server code, tests, project notes, and package metadata are not public routes.

For the private preview checkout, serve dist with a static HTTP server and run:

```sh
node --test tests/*.test.mjs
```

## Compatibility routes

/resize/, /crop/, /batch/, and /batch-resize/ lead to /export/. /privacy/ and /remove-metadata/ lead to /exif/. Preserve temporary handoff tickets through these redirects. Do not remove existing URLs solely because navigation was simplified.

## Release procedure

1. Start from the current production branch and preserve hosting configuration and unrelated changes.
2. Copy the approved public preview assets into the production root, translating the EXIF controller name and its HTML reference.
3. Include all new routes and assets in the server allowlist, including the comic, export modules, metadata modules, and progress popup.
4. Adapt test imports to the production file layout and run the full suite.
5. Check canonical pages, compatibility routes, script imports, asset references, and server restrictions.
6. Publish one commit to main, then check the hosting deployment and the served site. A GitHub push alone is not proof that the public host deployed it.

The production host uses a Hostinger Node entrypoint. Hosting access and automatic deployment configuration must be verified before claiming the public domain is updated. Keep the private preview separate from the public production site.

## Validation and limits

The preview suite has 76 passing tests covering engine behavior, browser-controller cancellation, metadata cleanup, archive generation, and progress lifecycle. Sample contact-sheet PDFs were rendered and visually checked, including multipage and different-column layouts. Live interactive browser QA was unavailable in this environment; do not describe it as completed.

Future changes should preserve bounded metadata offsets, missing-value distinctions, original files, crop bounds, explicit processing limits, cancellation guards, and truthful reports of removed or retained metadata.

