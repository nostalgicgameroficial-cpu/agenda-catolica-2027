const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const testimonials = [
  {
    id: 1,
    name: 'Mariana Ferreira',
    carrier: 'Vivo 4G',
    time: '11:32 AM',
    battery: '84%',
    avatar: 'avatar_mariana.jpg',
    dateBanner: '18 de Outubro de 2026',
    clientPhoto: 'depoimento_foto_agenda_calendario.jpg',
    messages: [
      { type: 'in', text: 'Menina do céu olha issoooo 😍😭', time: '11:29 AM' },
      { type: 'in', text: 'Mandei imprimir hoje cedo na gráfica aqui perto', time: '11:30 AM' },
      { type: 'photo_in', photo: 'depoimento_foto_agenda_calendario.jpg', time: '11:30 AM' },
      { type: 'in', text: 'A qualidade do papel ficou impecável, não vaza nada a caneta!', time: '11:31 AM' },
      { type: 'in', text: 'E o calendário de brinde é perfeito, já vai direto pra minha parede! Amei muito ❤️🙏', time: '11:31 AM' },
      { type: 'out', text: 'Que bênção Mari!! Ficou linda demais! Que Nossa Senhora abençoe seu 2027! 🙏✨', time: '11:32 AM' }
    ],
    outputName: 'depoimento_whatsapp_1.png'
  },
  {
    id: 2,
    name: 'Gabriel - Paróquia Aparecida',
    carrier: 'Claro 5G',
    time: '15:47',
    battery: '91%',
    avatar: 'avatar_gabriel.jpg',
    dateBanner: 'Hoje',
    clientPhoto: 'depoimento_foto_grafica.jpg',
    messages: [
      { type: 'in', text: 'Fala irmão, beleza?', time: '15:44' },
      { type: 'in', text: 'Acabei de sair da papelaria com a agenda pronta na mão 🔥', time: '15:45' },
      { type: 'photo_in', photo: 'depoimento_foto_grafica.jpg', time: '15:45' },
      { type: 'in', text: 'O rapaz da gráfica elogiou muito a resolução, falou que as margens vieram certinhas pro espiral', time: '15:46' },
      { type: 'out', text: 'Sensacional Gabriel! Deus abençoe meu irmão! O grupo jovem vai curtir muito 👊⛪', time: '15:46' },
      { type: 'in', text: 'Com certeza, já passei o link pra galera! Tmj! 👊🙏', time: '15:47' }
    ],
    outputName: 'depoimento_whatsapp_2.png'
  },
  {
    id: 3,
    name: 'Dona Teresa - Pastoral',
    carrier: 'TIM 4G',
    time: '09:18',
    battery: '78%',
    avatar: 'avatar_teresa.jpg',
    dateBanner: 'Hoje',
    clientPhoto: 'depoimento_foto_aberta_calendario.jpg',
    messages: [
      { type: 'out', text: 'Bom dia Dona Teresa! A paz de Cristo! Deu tudo certo com o download dos arquivos?', time: '09:14' },
      { type: 'in', text: 'Bom dia minha filha! A paz de Cristo! Deu tudo certo sim, muito obrigada 🙏', time: '09:15' },
      { type: 'in', text: 'Mandei imprimir ontem à tarde e já encadernaram pra mim', time: '09:16' },
      { type: 'photo_in', photo: 'depoimento_foto_aberta_calendario.jpg', time: '09:16' },
      { type: 'in', text: 'As letras são bem nítidas, fáceis de ler, e a liturgia de cada dia é uma riqueza só', time: '09:17' },
      { type: 'in', text: 'O calendário também ficou maravilhoso na mesa de oração. Parabéns pelo carinho 🌹🕯️', time: '09:17' },
      { type: 'out', text: 'Que alegria no coração ver esse cantinho abençoado! Muito obrigado Dona Teresa! ❤️', time: '09:18' }
    ],
    outputName: 'depoimento_whatsapp_3.png'
  },
  {
    id: 4,
    name: 'Fernanda Vasconcelos',
    carrier: 'Vivo 5G',
    time: '18:24',
    battery: '88%',
    avatar: 'avatar_mariana.jpg',
    dateBanner: 'Hoje',
    clientPhoto: 'depoimento_foto_mae.jpg',
    messages: [
      { type: 'in', text: 'Oi Ju, boa tarde! Tinha que vir te mostrar isso 🥹❤️', time: '18:20' },
      { type: 'in', text: 'Entreguei hoje a agenda de presente pra minha mãe', time: '18:21' },
      { type: 'photo_in', photo: 'depoimento_foto_mae.jpg', time: '18:21' },
      { type: 'in', text: 'Ela quase chorou de emoção! Ficou apaixonada pela capa de Nossa Senhora', time: '18:22' },
      { type: 'in', text: 'Disse que vai acompanhar as leituras todo santo dia', time: '18:23' },
      { type: 'out', text: 'Que foto mais emocionante!! Que Nossa Senhora cubra a sua mãezinha de bênçãos! 🥹🙏✨', time: '18:24' }
    ],
    outputName: 'depoimento_whatsapp_4.png'
  }
];

function generateHtml(t) {
  const avatarPath = path.resolve('assets', t.avatar);
  const avatarB64 = 'data:image/jpeg;base64,' + fs.readFileSync(avatarPath).toString('base64');
  
  const clientPhotoPath = path.resolve('assets', t.clientPhoto);
  const clientPhotoB64 = 'data:image/jpeg;base64,' + fs.readFileSync(clientPhotoPath).toString('base64');

  const ticksSvg = `
    <span class="ticks">
      <svg viewBox="0 0 16 11">
        <path d="M11.5 0.5L5.5 6.5L3.5 4.5L2 6L5.5 9.5L13 2L11.5 0.5Z"/>
        <path d="M14.5 0.5L8.5 6.5L8 6L7 7L8.5 8.5L16 1L14.5 0.5Z"/>
      </svg>
    </span>
  `;

  // Render chat messages
  let messagesHtml = '';
  t.messages.forEach((m, idx) => {
    const prevM = t.messages[idx - 1];
    const nextM = t.messages[idx + 1];
    const isFirstOfGroup = !prevM || prevM.type !== m.type;
    const isLastOfGroup = !nextM || nextM.type !== m.type;

    if (m.type === 'in') {
      const tailClass = isFirstOfGroup ? 'tail-in' : '';
      messagesHtml += `
        <div class="msg-row in-row">
          <div class="msg-bubble-in ${tailClass}">
            <span class="bubble-text">${m.text}</span>
            <div class="bubble-meta in-meta">
              <span class="bubble-time">${m.time}</span>
            </div>
          </div>
        </div>
      `;
    } else if (m.type === 'out') {
      const tailClass = isLastOfGroup ? 'tail-out' : '';
      messagesHtml += `
        <div class="msg-row out-row">
          <div class="msg-bubble-out ${tailClass}">
            <span class="bubble-text">${m.text}</span>
            <div class="bubble-meta out-meta">
              <span class="bubble-time">${m.time}</span>
              ${ticksSvg}
            </div>
          </div>
        </div>
      `;
    } else if (m.type === 'photo_in') {
      messagesHtml += `
        <div class="msg-row in-row photo-in-row">
          <div class="photo-bubble-in">
            <div class="photo-inner">
              <img src="${clientPhotoB64}" alt="Foto da cliente">
              <div class="photo-meta-overlay">
                <span class="photo-time">${m.time}</span>
              </div>
            </div>
          </div>
          <div class="forward-btn-circle-right">
            <svg viewBox="0 0 24 24"><path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z"/></svg>
          </div>
        </div>
      `;
    }
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    html, body {
      width: 414px;
      margin: 0;
      padding: 0;
      background-color: #0c151c;
    }
    
    .screen {
      width: 414px;
      min-height: 100vh;
      background-color: #0c151c;
      /* WhatsApp dark background pattern */
      background-image: 
        radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
        radial-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 26px 26px;
      background-position: 0 0, 13px 13px;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    /* iOS Status Bar */
    .status-bar {
      height: 44px;
      padding: 10px 20px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #ffffff;
      font-size: 14.5px;
      font-weight: 600;
      letter-spacing: -0.2px;
      z-index: 10;
      background: #111b21;
    }
    .status-left {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13.5px;
    }
    .status-center {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      top: 11px;
      font-weight: 600;
      font-size: 14.5px;
    }
    .status-right {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }
    .battery-icon {
      width: 23px;
      height: 12px;
      border: 1.5px solid #ffffff;
      border-radius: 3.5px;
      padding: 1px;
      position: relative;
      display: flex;
      align-items: center;
    }
    .battery-icon::after {
      content: '';
      position: absolute;
      right: -3.5px;
      top: 3px;
      width: 2px;
      height: 4px;
      background: #ffffff;
      border-radius: 0 1px 1px 0;
    }
    .battery-fill {
      height: 100%;
      width: 85%;
      background: #34c759;
      border-radius: 1.5px;
    }

    /* WhatsApp Header */
    .chat-header {
      height: 54px;
      background: #111b21;
      display: flex;
      align-items: center;
      padding: 0 14px;
      border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
      z-index: 10;
    }
    .back-btn {
      display: flex;
      align-items: center;
      gap: 1px;
      color: #53bdeb;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      margin-right: 8px;
    }
    .back-btn svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: #53bdeb;
      stroke-width: 2.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .avatar-wrap {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      overflow: hidden;
      margin-right: 10px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      flex-shrink: 0;
    }
    .avatar-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .contact-info {
      flex: 1;
      overflow: hidden;
    }
    .contact-name {
      color: #e9edef;
      font-size: 16px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.2px;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 20px;
      color: #53bdeb;
    }
    .header-actions svg {
      width: 22px;
      height: 22px;
      stroke: #53bdeb;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    /* Chat Messages Container */
    .chat-body {
      flex: 1;
      padding: 8px 12px 6px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      position: relative;
    }

    /* Date Pill */
    .date-badge {
      align-self: center;
      background: #182229;
      color: #8696a0;
      font-size: 11.5px;
      font-weight: 600;
      padding: 3px 12px;
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.3);
      margin: 0 auto 4px;
    }

    /* Rows */
    .msg-row {
      display: flex;
      width: 100%;
      margin-bottom: 2px;
    }
    .msg-row.in-row {
      justify-content: flex-start;
    }
    .msg-row.out-row {
      justify-content: flex-end;
    }

    /* Incoming Bubble (Left - Cliente) */
    .msg-bubble-in {
      background: #202c33;
      color: #e9edef;
      border-radius: 4px 10px 10px 4px;
      padding: 6px 9px 5px 11px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.25);
      display: inline-flex;
      flex-direction: row;
      align-items: flex-end;
      gap: 8px;
      max-width: 86%;
    }
    .msg-bubble-in.tail-in {
      border-radius: 0 10px 10px 4px;
    }

    /* Outgoing Bubble (Right - Loja/Você) */
    .msg-bubble-out {
      background: #005c4b;
      color: #e9edef;
      border-radius: 10px 4px 4px 10px;
      padding: 6px 9px 5px 11px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.3);
      display: inline-flex;
      flex-direction: row;
      align-items: flex-end;
      gap: 8px;
      max-width: 86%;
    }
    .msg-bubble-out.tail-out {
      border-radius: 10px 0 10px 10px;
    }

    .bubble-text {
      font-size: 14px;
      line-height: 1.35;
      color: #e9edef;
      word-break: break-word;
    }

    .bubble-meta {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      margin-left: auto;
      flex-shrink: 0;
      position: relative;
      top: 2px;
    }
    .in-meta .bubble-time {
      font-size: 10.5px;
      color: #8696a0;
    }
    .out-meta .bubble-time {
      font-size: 10.5px;
      color: #85c4b4;
    }
    .ticks svg {
      width: 15px;
      height: 10px;
      fill: #53bdeb;
      display: block;
    }

    /* Incoming Photo Row */
    .photo-in-row {
      align-items: center;
      gap: 8px;
      margin: 2px 0;
    }
    .photo-bubble-in {
      background: #202c33;
      border-radius: 4px 10px 10px 4px;
      padding: 4px;
      max-width: 86%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.35);
    }
    .photo-inner {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      position: relative;
      background: #111b21;
    }
    .photo-inner img {
      width: 100%;
      height: 220px;
      object-fit: cover;
      display: block;
    }
    .photo-meta-overlay {
      position: absolute;
      bottom: 5px;
      right: 7px;
      background: rgba(11, 20, 26, 0.65);
      padding: 1px 5px;
      border-radius: 6px;
      display: flex;
      align-items: center;
    }
    .photo-time {
      font-size: 10px;
      color: #ffffff;
    }

    .forward-btn-circle-right {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(32, 44, 51, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
    .forward-btn-circle-right svg {
      width: 15px;
      height: 15px;
      fill: #8696a0;
    }

    /* WhatsApp Input Footer */
    .chat-footer {
      height: 54px;
      background: #111b21;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-top: 0.5px solid rgba(255, 255, 255, 0.08);
      z-index: 10;
    }
    .plus-btn {
      color: #8696a0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
    }
    .plus-btn svg {
      width: 24px;
      height: 24px;
      stroke: #8696a0;
      fill: none;
      stroke-width: 2.2;
    }
    .input-box {
      flex: 1;
      height: 38px;
      background: #2a3942;
      border-radius: 20px;
      padding: 0 12px 0 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #8696a0;
      font-size: 15px;
    }
    .input-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #8696a0;
    }
    .input-actions svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: #8696a0;
      stroke-width: 2;
    }
    .mic-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #00a884;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      flex-shrink: 0;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    }
    .mic-btn svg {
      width: 19px;
      height: 19px;
      fill: #ffffff;
    }

    /* iOS Bottom Home Bar */
    .home-bar-area {
      height: 16px;
      background: #111b21;
      display: flex;
      justify-content: center;
      align-items: center;
      padding-bottom: 2px;
    }
    .home-bar {
      width: 135px;
      height: 4px;
      background: #ffffff;
      border-radius: 3px;
      opacity: 0.5;
    }
  </style>
</head>
<body>

  <div class="screen" id="capture-screen">
    
    <!-- Status Bar -->
    <div class="status-bar">
      <div class="status-left">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="#fff">
          <rect x="0" y="8" width="3" height="4" rx="0.8"/>
          <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.8"/>
          <rect x="9" y="3" width="3" height="9" rx="0.8"/>
          <rect x="13.5" y="0" width="3" height="12" rx="0.8"/>
        </svg>
        <span>${t.carrier}</span>
      </div>
      <div class="status-center">${t.time}</div>
      <div class="status-right">
        <span>${t.battery}</span>
        <div class="battery-icon">
          <div class="battery-fill"></div>
        </div>
      </div>
    </div>

    <!-- Chat Header -->
    <div class="chat-header">
      <div class="back-btn">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
        <span>1</span>
      </div>
      <div class="avatar-wrap">
        <img src="${avatarB64}" alt="${t.name}">
      </div>
      <div class="contact-info">
        <div class="contact-name">${t.name}</div>
      </div>
      <div class="header-actions">
        <svg viewBox="0 0 24 24"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
        <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      </div>
    </div>

    <!-- Chat Body -->
    <div class="chat-body">
      <div class="date-badge">${t.dateBanner}</div>

      <!-- Messages Stream -->
      ${messagesHtml}

    </div>

    <!-- Chat Footer -->
    <div class="chat-footer">
      <div class="plus-btn">
        <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>
      <div class="input-box">
        <span>Mensagem</span>
        <div class="input-actions">
          <svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          <svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </div>
      </div>
      <div class="mic-btn">
        <svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23" stroke="#fff" stroke-width="2.5"/><line x1="8" y1="23" x2="16" y2="23" stroke="#fff" stroke-width="2.5"/></svg>
      </div>
    </div>

    <!-- Home indicator -->
    <div class="home-bar-area">
      <div class="home-bar"></div>
    </div>

  </div>

</body>
</html>`;
}

console.log('Rendering realistic client-side testimonials...');
for (const t of testimonials) {
  const htmlContent = generateHtml(t);
  const tempHtmlPath = path.resolve(`temp_testimonial_${t.id}.html`);
  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8');

  const outputPath = path.resolve('assets', t.outputName);
  
  // Height 820px
  const cmd = `"${chromePath}" --headless=new --screenshot="${outputPath}" --window-size=414,820 --default-background-color=0c151cff --hide-scrollbars "file://${tempHtmlPath}"`;
  console.log(`Generating ${t.outputName}...`);
  execSync(cmd);
  console.log(`Saved ${t.outputName}`);

  fs.unlinkSync(tempHtmlPath);
}
console.log('All 4 realistic testimonials generated successfully!');
