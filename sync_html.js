const fs = require('fs');

const origPath = 'Agenda Católica 2027 com Liturgia Diária.html';
const backupPath = 'Agenda Católica 2027 com Liturgia Diária.backup.html';
const newContent = fs.readFileSync('index.html', 'utf8');

if (fs.existsSync(origPath) && !fs.existsSync(backupPath)) {
  fs.copyFileSync(origPath, backupPath);
  console.log('Created backup:', backupPath);
}

fs.writeFileSync(origPath, newContent, 'utf8');
console.log('Updated', origPath, 'with new sales page.');
