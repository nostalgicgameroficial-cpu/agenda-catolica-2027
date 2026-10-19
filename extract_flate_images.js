const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const buf = fs.readFileSync('+50 MOLDES DE PESOS DE PORTA EM TECIDO PRONTOS PARA IMPRIMIR(1).PDF');

// Helper to save raw RGB to BMP (very simple, no external library required)
function saveBmp(filename, width, height, rgbBuffer) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const header = Buffer.alloc(54);
  header.write('BM', 0);
  header.writeUInt32LE(fileSize, 2);
  header.writeUInt32LE(54, 10);
  header.writeUInt32LE(40, 14);
  header.writeInt32LE(width, 18);
  header.writeInt32LE(-height, 22); // top-down
  header.writeUInt16LE(1, 26);
  header.writeUInt16LE(24, 28);
  header.writeUInt32LE(0, 30);
  header.writeUInt32LE(pixelArraySize, 34);

  const pixelData = Buffer.alloc(pixelArraySize);
  for (let y = 0; y < height; y++) {
    const srcRow = y * width * 3;
    const dstRow = y * rowSize;
    for (let x = 0; x < width; x++) {
      const r = rgbBuffer[srcRow + x * 3];
      const g = rgbBuffer[srcRow + x * 3 + 1];
      const b = rgbBuffer[srcRow + x * 3 + 2];
      pixelData[dstRow + x * 3] = b;
      pixelData[dstRow + x * 3 + 1] = g;
      pixelData[dstRow + x * 3 + 2] = r;
    }
  }
  fs.writeFileSync(filename, Buffer.concat([header, pixelData]));
}

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
    console.log(`Image ${imgCount}: ${width}x${height}`);

    if (dict.includes('FlateDecode') && width > 100 && height > 100) {
      try {
        const uncompressed = zlib.inflateSync(buf.slice(start, end));
        if (uncompressed.length === width * height * 3) {
          const bmpPath = path.join(__dirname, 'pdf_images', `flate_${imgCount}_${width}x${height}.bmp`);
          saveBmp(bmpPath, width, height, uncompressed);
          console.log(`Saved BMP: ${bmpPath}`);
        } else {
          console.log(`Size mismatch for img ${imgCount}: ${uncompressed.length} vs expected ${width*height*3}`);
        }
      } catch (e) {
        console.log(`Inflate error img ${imgCount}:`, e.message);
      }
    }
  }
  pos = end + 9;
}
