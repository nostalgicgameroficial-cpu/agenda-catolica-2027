const fs = require('fs');
const path = require('path');

const buf = fs.readFileSync('+50 MOLDES DE PESOS DE PORTA EM TECIDO PRONTOS PARA IMPRIMIR(1).PDF');
console.log('PDF length:', buf.length);

const outDir = path.join(__dirname, 'pdf_images');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

// Search for DCTDecode (JPEG) images
let pos = 0;
let imgCount = 0;
while (true) {
  let streamIdx = buf.indexOf('stream', pos);
  if (streamIdx === -1) break;
  let newlineIdx = buf.indexOf('\n', streamIdx);
  let start = newlineIdx + 1;
  let end = buf.indexOf('endstream', start);
  if (end === -1) break;
  
  // check preceding dictionary
  let dictStart = Math.max(0, streamIdx - 400);
  let dict = buf.slice(dictStart, streamIdx).toString('ascii');
  
  if (dict.includes('/Subtype/Image') || dict.includes('/Subtype /Image')) {
    imgCount++;
    console.log(`Image #${imgCount}: dict length ~ ${streamIdx - dictStart}`);
    if (dict.includes('DCTDecode')) {
      // It is a JPEG!
      let imgData = buf.slice(start, end);
      // clean trailing \r \n if any
      while (imgData[imgData.length - 1] === 10 || imgData[imgData.length - 1] === 13) {
        imgData = imgData.slice(0, imgData.length - 1);
      }
      let filename = path.join(outDir, `img_${imgCount}.jpg`);
      fs.writeFileSync(filename, imgData);
      console.log(`Saved JPEG ${filename}, size: ${imgData.length}`);
    } else if (dict.includes('FlateDecode')) {
      // Might be PNG / raw uncompressed
      try {
        const zlib = require('zlib');
        let uncompressed = zlib.inflateSync(buf.slice(start, end));
        console.log(`Flate image uncompressed size: ${uncompressed.length}`);
      } catch(e) {
        // ignore
      }
    }
  }
  pos = end + 9;
}
console.log(`Finished searching. Total image objects found: ${imgCount}`);
