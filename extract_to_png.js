const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height, rgbBuffer) {
  // PNG signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type 2 = RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  // scanlines: 1 filter byte (0) + width * 3 bytes
  const scanlineLength = 1 + width * 3;
  const rawIdat = Buffer.alloc(scanlineLength * height);
  for (let y = 0; y < height; y++) {
    const srcRow = y * width * 3;
    const dstRow = y * scanlineLength;
    rawIdat[dstRow] = 0; // None filter
    for (let x = 0; x < width * 3; x++) {
      rawIdat[dstRow + 1 + x] = rgbBuffer[srcRow + x];
    }
  }
  const compressedIdat = zlib.deflateSync(rawIdat);
  const idatChunk = makeChunk('IDAT', compressedIdat);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  table[i] = c;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const head = Buffer.alloc(4);
  head.writeUInt32BE(len, 0);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crcVal, 0);
  return Buffer.concat([head, toCrc, tail]);
}

// Convert extracted flate images
const buf = fs.readFileSync('+50 MOLDES DE PESOS DE PORTA EM TECIDO PRONTOS PARA IMPRIMIR(1).PDF');
let pos = 0;
let imgCount = 0;
while (true) {
  let sIdx = buf.indexOf('stream', pos);
  if (sIdx === -1) break;
  let nlIdx = buf.indexOf('\n', sIdx);
  let start = nlIdx + 1;
  let end = buf.indexOf('endstream', start);
  if (end === -1) break;

  let dictStart = Math.max(0, sIdx - 500);
  let dict = buf.slice(dictStart, sIdx).toString('ascii');

  if (dict.includes('/Subtype/Image') || dict.includes('/Subtype /Image')) {
    imgCount++;
    const wMatch = dict.match(/\/Width\s+(\d+)/);
    const hMatch = dict.match(/\/Height\s+(\d+)/);
    const width = wMatch ? parseInt(wMatch[1]) : 0;
    const height = hMatch ? parseInt(hMatch[1]) : 0;

    if (dict.includes('FlateDecode') && width > 200 && height > 200) {
      try {
        const uncompressed = zlib.inflateSync(buf.slice(start, end));
        if (uncompressed.length === width * height * 3) {
          const pngPath = path.join(__dirname, 'pdf_images', `img_${imgCount}_${width}x${height}.png`);
          const pngBuf = createPng(width, height, uncompressed);
          fs.writeFileSync(pngPath, pngBuf);
          console.log(`Saved PNG: ${pngPath}`);
        }
      } catch (e) {}
    }
  }
  pos = end + 9;
}
