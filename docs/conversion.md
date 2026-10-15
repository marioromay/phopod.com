# image conversion

Crop / Convert / Export accepts JPEG, PNG, WebP, HEIC/HEIF and AVIF. JPEG, PNG and WebP downloads use browser canvas encoding, with strict output MIME checking. PNG and WebP preserve transparency; JPEG flattens it using the selected background. The Convert only button retains the full frame and original dimensions. It applies to the selected image; each batch image retains its own frame.

HEIC first tries native browser decoding, then uses a local worker. The worker is terminated after each decode, on cancellation, or after 90 seconds. It uses the first image in multi-image containers. Input limits are 50 MB and 60 MP per image. Resized exports are limited to 24 MP; original-size conversion is limited to 60 MP. ZIP exports retain the existing 200 MB combined limit. AVIF depends on native browser support. HDR, wide-gamut color and source metadata are not preserved by this canvas export workflow. EXIF Data and Photo Stats remain JPEG-only.

Print Size and Contact Sheet use the same local input decoder. No photograph is sent to a conversion service.

## bundled decoder

`dist/vendor/heic-worker.js` is the unmodified standalone worker extracted from **heic-to 1.6.5** (`dist/next/heic-to.js`), licensed under LGPL-3.0. Its license is distributed beside the worker in `heic-to-license.txt`. The application wrapper only bounds pixel allocation; decoder code is separate and replaceable. Upstream includes libheif 1.23.5 and libde265.

- package and source: https://github.com/hoppergee/heic-to (version 1.6.5)
- exact distribution: https://registry.npmjs.org/heic-to/-/heic-to-1.6.5.tgz
- decoder source / build instructions: https://github.com/strukturag/libheif and https://github.com/strukturag/libheif/blob/v1.23.5/build-emscripten.sh
- HEVC decoder source: https://github.com/strukturag/libde265 (1.0.16, upstream build instructions)

The generated worker can be reproduced by extracting the embedded worker string in the above package's next build. See upstream README for Emscripten build steps. The application does not download decoder code at runtime from a third party.
