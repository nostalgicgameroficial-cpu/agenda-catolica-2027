const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\welington\\.gemini\\antigravity-ide\\brain\\3a781b2d-3900-45a7-abf9-0770942bc19c';
const targetDir = path.join(__dirname, 'assets');

const bonusFiles = [
  { src: path.join(brainDir, 'bonus1_novenas_1792333252983.jpg'), dest: 'bonus1_novenas.jpg' },
  { src: path.join(brainDir, 'bonus2_viasacra_1792333344380.jpg'), dest: 'bonus2_viasacra.jpg' },
  { src: path.join(brainDir, 'bonus3_calendario_1792333443054.jpg'), dest: 'bonus3_calendario.jpg' },
  { src: path.join(brainDir, 'bonus4_leitura_biblia_1792333536398.jpg'), dest: 'bonus4_leitura_biblia.jpg' },
  { src: path.join(brainDir, 'bonus5_marcadores_1792333631140.jpg'), dest: 'bonus5_marcadores.jpg' }
];

for (let item of bonusFiles) {
  if (fs.existsSync(item.src)) {
    fs.copyFileSync(item.src, path.join(targetDir, item.dest));
    console.log(`Copied ${item.dest}`);
  } else {
    console.log(`Missing ${item.src}`);
  }
}
