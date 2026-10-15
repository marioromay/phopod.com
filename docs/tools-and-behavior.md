# Tools and behavior

Implementation snapshot: October 10, 2026. All photograph processing happens locally in the browser. Originals remain unchanged.

## EXIF Data

Accepts one JPEG up to 50 MB. Shows camera, lens, focal length, aperture, shutter speed, ISO, dimensions, megapixels, file size, and recorded capture time when available. EXIF GPS coordinates are revealed only on request. The copied shooting summary excludes location and capture time.

Metadata cleanup uses the inspected JPEG buffer and reports detected containers, removal actions, and retained information. It removes EXIF, XMP, IPTC, comments, thumbnails, other application blocks, and trailing data. It preserves ICC color profiles and Adobe color-transform information, plus a minimal orientation tag when needed. Compressed image data is not re-encoded. Cleanup verifies the output and is blocked when orientation cannot be established safely.

Do not claim that cleanup removes every possible identifying detail: retained profiles may contain text, and filenames or visible image content may reveal information. Missing EXIF is a normal result, not a parsing error.

## Photo Stats

Accepts up to 2,000 JPEG files, up to 50 MB each. Aggregates focal length, aperture, ISO, shutter speed, camera, lens, orientation, recorded capture hour, and year/month. Each metric distinguishes known values from missing values. Missing values do not enter that metric’s percentage denominator.

The CSV contains aggregate results without filenames or GPS. Stop preserves partial results. Files are not deduplicated. Capture times reflect recorded metadata, not inferred local time.

## Print Size

Accepts JPEG, PNG, or WebP, up to 50 MB and 60 megapixels. Shows common print sizes with crop-aware pixels per inch, portrait/landscape controls, inches or centimeters, and movable framing. It estimates print suitability; it does not export, upscale, add bleed, or guarantee print quality. Guidance should account for viewing distance and image quality.

## Crop / Export

Accepts one image or a batch of up to 100 JPEG, PNG, or WebP files. Input limits are 50 MB and 60 megapixels per image, and 500 MB for the collection.

Ratios: Original, square (1:1), 4:5, 3:2, 2:3, 16:9, and 9:16. The excluded area is shaded. Dragging or position controls move the photograph inside the frame. Zoom ranges from 1× to 4×. Remaining crop dimensions and final output dimensions are visible.

Each photograph remembers its own framing. Export size and quality are shared across the batch. Presets include 2,400 px, 1,600 px, and 600 px; custom long edge is 100–6,000 px. Quality is 50–100, with 85 as the default. Images are never upscaled. Output is limited to 24 megapixels per image and 200 MB for a batch.

One photograph produces a JPEG. Multiple photographs produce a ZIP with unique filenames. Invalid files are skipped and reported. Stop finishes the current photograph and keeps completed output. Clear prevents stale work from producing a download.

Canvas exports use a white background and omit original metadata and embedded profiles. They are intended for everyday web copies; browser encoding and color conversion can vary.

## Contact Sheet

Accepts up to 300 JPEG, PNG, or WebP files, up to 50 MB and 60 megapixels each. Supports Letter or A4, portrait or landscape, 2–6 columns, optional filenames, and filename or added order. Complete photographs retain their aspect ratio.

Every exported PDF page includes the logo, thin separating rules between photographs, centered filename labels when enabled, page information, and the referral **Create your own contact sheet at inspectorfocus.com**. The referral links to https://phopod.com/contact-sheet/.

PDF pages are raster artwork at 144 pixels per inch; labels are not searchable text. Reduced thumbnails are retained locally, and source EXIF/GPS is not copied into the PDF. Clear cancels pending work and releases thumbnails and downloads.

## Processing feedback

Processing uses a shared progress dialog with the floating robot logo, a status message, and file/page progress where meaningful. Indeterminate tasks show activity without inventing a percentage. Cancellation behavior follows the tool: stop after the current item for batch work, or clear the active task where appropriate. Completion, failure, and cancellation close the dialog and restore focus.

