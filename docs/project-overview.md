# Phopod

Phopod is Mario Romay’s photography utility site at https://phopod.com. It helps photographers inspect a file, understand a collection, plan a print, frame and resize an image, and create a contact sheet.

## Product principles

- Process photographs in the browser. Do not upload them to a server.
- Preserve original files and download new copies locally.
- Keep tools practical, focused, and connected.
- Explain missing data and processing limits precisely.
- Keep the robot’s story accessible without crowding the tool navigation.

## Navigation

| Menu item | Route | Purpose |
| --- | --- | --- |
| EXIF Data | /exif/ | Inspect JPEG metadata and remove metadata from a copy. |
| Photo Stats | /photo-stats/ | Summarize shooting patterns across JPEG photographs. |
| Print Size | /print-size/ | Preview print framing and estimate pixel density. |
| Crop / Export | /export/ | Crop, resize, and download one JPEG or a batch ZIP. |
| Contact Sheet | /contact-sheet/ | Preview and download a multipage PDF. |
| Robot logo | /about/ | Open the Phopod comic. |

The homepage is a compact tool directory. The footer link reads **Meet Phopod**. The comic page uses the supplied comic artwork and does not include a “Read the comic text” section.

## Combined workflows

Crop, Resize / Export, and Batch Resize / Export share one Crop / Export tool. The workflow is **frame it → size it → download it**. Metadata removal belongs within EXIF Data rather than a separate Privacy tool.

Single-image tools can carry the original photograph across deliberate same-tab navigation. This handoff temporarily uses IndexedDB and a sessionStorage ticket; the destination consumes and deletes the record. It expires logically after two minutes, with abandoned records cleaned on a later workspace visit. Crop settings do not transfer, and EXIF accepts JPEG only.

## Source assets

- The approved Phopod robot logo is the site’s brand asset.
- The supplied comic is used on the Meet Phopod page.
- Preserve the approved assets when refining the interface; do not substitute a generic robot.

The original planning document and artwork should remain alongside these notes as project sources. These notes describe the implemented project snapshot dated October 10, 2026.

