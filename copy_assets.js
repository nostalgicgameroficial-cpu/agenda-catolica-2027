const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'assets');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const brainDir = 'C:\\Users\\welington\\.gemini\\antigravity-ide\\brain\\3a781b2d-3900-45a7-abf9-0770942bc19c';

// Copy generated images
const filesToCopy = [
  { src: path.join(brainDir, 'agenda_hero_mockup_1792332064860.jpg'), dest: 'agenda_hero_mockup.jpg' },
  { src: path.join(brainDir, 'agenda_bonus_bundle_1792332122838.jpg'), dest: 'agenda_bonus_bundle.jpg' },
  { src: path.join(brainDir, 'agenda_in_use_1792332186217.jpg'), dest: 'agenda_in_use.jpg' },
  { src: path.join(brainDir, 'como_usar_passo_a_passo_1792332250948.jpg'), dest: 'como_usar_passo_a_passo.jpg' },
  { src: path.join(__dirname, 'pdf_images', 'img_41_1536x1024.png'), dest: 'selo_garantia_15_dias.png' },
  { src: path.join(__dirname, 'original_html_images', 'orig_2.png'), dest: 'preview_quaresma.png' },
  { src: path.join(__dirname, 'original_html_images', 'orig_3.png'), dest: 'preview_consagracao.png' },
  { src: path.join(__dirname, 'original_html_images', 'orig_1.png'), dest: 'preview_capa_original.png' }
];

for (let item of filesToCopy) {
  if (fs.existsSync(item.src)) {
    fs.copyFileSync(item.src, path.join(targetDir, item.dest));
    console.log(`Copied ${item.dest}`);
  } else {
    console.log(`Missing ${item.src}`);
  }
}
