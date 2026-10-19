const fs = require('fs');

// In Skia/Chrome PDFs, text is often stored in TJ or Tj operators with ToUnicode cmap
// Let's parse the ToUnicode cmaps in the PDF to decode the text!
const buf = fs.readFileSync('+50 MOLDES DE PESOS DE PORTA EM TECIDO PRONTOS PARA IMPRIMIR(1).PDF');

// Find all ToUnicode cmaps
let pos = 0;
const cmaps = [];
while (true) {
  let idx = buf.indexOf('/ToUnicode', pos);
  if (idx === -1) break;
  // find reference or stream
  pos = idx + 10;
}

// Alternatively, let's extract all readable ASCII / Latin1 phrases from the uncompressed streams
const uncompressedStreams = [];
const zlib = require('zlib');
pos = 0;
while (true) {
  let sIdx = buf.indexOf('stream', pos);
  if (sIdx === -1) break;
  let nlIdx = buf.indexOf('\n', sIdx);
  let start = nlIdx + 1;
  let end = buf.indexOf('endstream', start);
  if (end === -1) break;

  try {
    let uncompressed = zlib.inflateSync(buf.slice(start, end));
    let str = uncompressed.toString('latin1');
    if (str.includes('/CIDInit') || str.includes('beginbfchar') || str.includes('beginbfrange')) {
      cmaps.push(str);
    }
  } catch(e) {}
  pos = end + 9;
}
console.log('Found cmaps:', cmaps.length);

// Let's build a map from CID to unicode
const charMap = {};
for (const cmap of cmaps) {
  const bfcharMatches = cmap.matchAll(/<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>/g);
  for (const m of bfcharMatches) {
    const src = parseInt(m[1], 16);
    const dst = String.fromCharCode(parseInt(m[2], 16));
    charMap[src] = dst;
  }
  const bfrangeMatches = cmap.matchAll(/<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>/g);
  for (const m of bfrangeMatches) {
    const startSrc = parseInt(m[1], 16);
    const endSrc = parseInt(m[2], 16);
    let startDst = parseInt(m[3], 16);
    for (let s = startSrc; s <= endSrc; s++, startDst++) {
      charMap[s] = String.fromCharCode(startDst);
    }
  }
}
console.log('Mapped characters:', Object.keys(charMap).length);

// Now decode TJ in pdf_text_streams.txt
const streamsTxt = fs.readFileSync('pdf_text_streams.txt', 'utf8');
let decodedText = '';
const tjRegex = /\[(.*?)\]\s*TJ/gs;
let match;
while ((match = tjRegex.exec(streamsTxt)) !== null) {
  let content = match[1];
  let hexMatches = content.matchAll(/<([0-9a-fA-F]+)>/g);
  let line = '';
  for (let hm of hexMatches) {
    let hex = hm[1];
    for (let i = 0; i < hex.length; i += 4) {
      let code = parseInt(hex.substr(i, 4), 16);
      line += charMap[code] || '?';
    }
  }
  if (line.trim().length > 0) {
    decodedText += line + '\n';
  }
}

fs.writeFileSync('pdf_decoded_text.txt', decodedText, 'utf8');
console.log('Saved pdf_decoded_text.txt, length:', decodedText.length);
console.log('Sample decoded text:\n', decodedText.slice(0, 1500));
