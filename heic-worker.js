// Bound allocations before the decoder creates an RGBA image.
const NativeImageData=self.ImageData;
self.ImageData=class extends NativeImageData {constructor(width,height){if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<=0||height<=0||width*height>60_000_000)throw Error('Choose a photograph up to 60 MP.');super(width,height);}};
importScripts('./vendor/heic-worker.js');
