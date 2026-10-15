# October 10, 2026 update

Approved preview source: `0c87e758fbe8500f52da8673d075548f7734be8f`.

- Crop & Export can fit each photo under a 10 KB–50 MB decimal file-size limit. JPEG/WebP quality reduces to a floor of 50 before dimensions shrink; PNG remains lossless and shrinks dimensions. Results report measured bytes, final dimensions and quality. Limits apply per photo before ZIP packaging. Convert only disables the target limit. Inputs and originals remain unchanged.
- Photo Stats uses the shared upload design. Charts appear first. Clicking a chart bar, exact value or highlight opens matching photos; Back to charts closes them. Matching uses the same normalized keys as the aggregate counts, including rounded focal length/aperture, shutter buckets, recorded dates and orientation. The gallery has 24 photos per page and sequential 320px thumbnail generation. Files and statistic keys stay in this tab until clearing, replacement or reload; generated URLs are released on clear, page changes and pagehide. No photo uploads. Sample charts have no photographs.
- Contact Sheet defaults to the preview. Organize photos opens thumbnails beside a live sheet on desktop and Organize/Preview controls on phones. Drag hover previews a proposed position without committing; dropping commits. Done organizing restores the larger sheet and page settings. Ordering/removal invalidates earlier PDF downloads.

Validation: 112 production tests and all eight canonical page SEO checks pass. The existing static server already allowlists every changed public asset; its Node entrypoint remains separate from the EXIF browser controller. Interactive browser and phone acceptance testing remains outstanding.
