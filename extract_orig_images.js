const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('Agenda Católica 2027 com Liturgia Diária.html', 'utf8');
const outDir = path.join(__dirname, 'original_html_images');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

let count = 0;
const re = /data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)/g;
let match;
while ((match = re.exec(html)) !== null) {
  count++;
  const ext = match[1];
  const b64 = match[2];
  const buf = Buffer.from(b64, 'base64');
  const filename = path.join(outDir, `orig_${count}.${ext}`);
  fs.writeFileSync(filename, buf);
  console.log(`Saved ${filename}, size: ${buf.length}`);
}
console.log('Total extracted:', count);
