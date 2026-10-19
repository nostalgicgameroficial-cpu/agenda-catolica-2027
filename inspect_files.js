const fs = require('fs');

try {
  const html = fs.readFileSync('Agenda Católica 2027 com Liturgia Diária.html', 'utf8');
  const withoutBase64 = html.replace(/data:image\/[^;]+;base64,[^"'\s)]+/g, '[BASE64_IMAGE]');
  fs.writeFileSync('Agenda_text_preview.html', withoutBase64, 'utf8');
  console.log('Saved Agenda_text_preview.html, length:', withoutBase64.length);
} catch (err) {
  console.error('Error with HTML:', err);
}

// Check PDF
try {
  const pdfBuffer = fs.readFileSync('+50 MOLDES DE PESOS DE PORTA EM TECIDO PRONTOS PARA IMPRIMIR(1).PDF');
  console.log('PDF read successfully, byte length:', pdfBuffer.length);
  // Let's search for readable text in PDF
  const str = pdfBuffer.toString('latin1');
  const textMatches = str.match(/[\x20-\x7E\xC0-\xFF]{5,}/g) || [];
  console.log('Sample text snippets from PDF (first 20):');
  console.log(textMatches.filter(s => s.length > 10).slice(0, 30).join('\n'));
} catch (err) {
  console.error('Error with PDF:', err);
}
