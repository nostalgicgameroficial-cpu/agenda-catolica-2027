// @ts-nocheck

export async function sendDeliveryEmail(order: {
  id: string;
  customer_name: string;
  customer_email: string;
  plan: string;
  order_bump?: boolean;
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY') || '';
  if (!apiKey) {
    console.error('RESEND_API_KEY não configurada');
    return { success: false, error: 'RESEND_API_KEY ausente' };
  }

  const isCompleto = order.plan === 'completo';
  const hasOrderBump = !!order.order_bump;
  const firstName = order.customer_name ? order.customer_name.split(' ')[0] : 'Irmão(ã) em Cristo';
  
  let packageName = isCompleto ? 'Agenda Católica 2027 + 5 Bônus Exclusivos' : 'Agenda Católica 2027 Básica';
  if (hasOrderBump) {
    packageName += ' + 50 Histórias dos Santos para Colorir';
  }

  const driveLink = isCompleto
    ? 'https://drive.google.com/drive/folders/1z-omzWDOf-s8h2XWGW_BCgCagGWU5vtq?usp=sharing'
    : 'https://drive.google.com/drive/folders/1vstC1uvFR11TZIg5zXpILGT-khchTjJp?usp=sharing';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Seus arquivos da Agenda Católica 2027</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="display: none; font-size: 1px; color: #f8fafc; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Seu acesso à Agenda Católica 2027 está liberado no Google Drive.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px 24px; text-align: left;">
          <tr>
            <td>
              <h2 style="color: #0c1830; font-size: 20px; font-weight: 700; margin: 0 0 16px;">Seus arquivos estão disponíveis</h2>
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Olá, <strong>${firstName}</strong>!</p>
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
                Confirmamos o seu pagamento da <strong>${packageName}</strong>. Seus arquivos digitais já estão prontos para consulta e download na pasta oficial do Google Drive.
              </p>
              
              <div style="text-align: center; margin: 28px 0;">
                <a href="${driveLink}" target="_blank" style="background-color: #15803d; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">
                  Acessar arquivos no Google Drive
                </a>
              </div>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 20px 0; word-break: break-all;">
                <p style="font-size: 13px; color: #475569; margin: 0 0 6px; font-weight: 600;">Link direto de acesso:</p>
                <a href="${driveLink}" target="_blank" style="color: #1d4d90; font-size: 13px; text-decoration: underline;">${driveLink}</a>
              </div>

              ${hasOrderBump ? `
              <div style="background-color: #fefce8; border: 1px solid #fef08a; border-left: 4px solid #ca8a04; border-radius: 6px; padding: 14px; margin: 20px 0;">
                <p style="margin: 0 0 4px; color: #854d0e; font-size: 14px; font-weight: 700;">🎨 Bônus Incluso: 50 Histórias dos Santos para Crianças Colorir</p>
                <p style="margin: 0; font-size: 13px; color: #713f12; line-height: 1.5;">O seu caderno infantil com mais de 50 páginas de desenhos e histórias para colorir já está liberado dentro da sua pasta no Google Drive!</p>
              </div>
              ` : ''}

              <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 16px 0;">
                <strong>Instruções de uso:</strong> Os arquivos estão organizados em alta definição para impressão (formatos A4 e A5) e também prontos para leitura no celular, tablet ou computador. Você pode salvar a pasta no seu próprio Google Drive para ter acesso permanente.
              </p>

              <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 16px 0 0;">
                Se precisar de qualquer apoio ou tiver dúvidas, basta responder diretamente a esta mensagem.<br>
                Que Deus e Nossa Senhora Aparecida abençoem o seu ano de 2027.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;">
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                Agenda Católica 2027 · Suporte: suporte@suporteagenda.online · Site: agendanossasenhora.online
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Olá, ${firstName}!

Confirmamos o seu pagamento da ${packageName}. Seus arquivos digitais já estão prontos para consulta e download na pasta oficial do Google Drive.

Link direto de acesso:
${driveLink}
${hasOrderBump ? '\n🎨 Bônus Especial: 50 Histórias dos Santos para Colorir incluso na sua pasta do Google Drive!\n' : ''}

Instruções de uso:
Os arquivos estão organizados em alta definição para impressão (formatos A4 e A5) e também prontos para leitura no celular, tablet ou computador. Você pode salvar a pasta no seu próprio Google Drive para ter acesso permanente.

Se precisar de qualquer apoio ou tiver dúvidas, basta responder diretamente a este e-mail.
Que Deus e Nossa Senhora Aparecida abençoem o seu ano de 2027.

Agenda Católica 2027
Suporte: suporte@suporteagenda.online
Site oficial: https://agendanossasenhora.online
`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Agenda Católica 2027 <suporte@suporteagenda.online>',
        reply_to: 'suporte@suporteagenda.online',
        to: [order.customer_email],
        subject: 'Seus arquivos da Agenda Católica 2027',
        html: html,
        text: text,
      }),
    });

    const data = await res.json();
    return { success: res.ok, data };
  } catch (err) {
    console.error('Erro ao enviar e-mail via Resend:', err);
    return { success: false, error: err };
  }
}

export async function sendPixPendingEmail(order: {
  customer_name: string;
  customer_email: string;
  plan: string;
  amount_cents: number;
  pix_code: string;
  order_bump?: boolean;
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY') || '';
  if (!apiKey) {
    console.error('RESEND_API_KEY não configurada');
    return { success: false, error: 'RESEND_API_KEY ausente' };
  }

  const firstName = order.customer_name ? order.customer_name.split(' ')[0] : 'Irmão(ã) em Cristo';
  const isCompleto = order.plan === 'completo';
  const hasOrderBump = !!order.order_bump;
  let packageName = isCompleto ? 'Agenda Católica 2027 Completa + 5 Bônus' : 'Agenda Católica 2027 Básica';
  if (hasOrderBump) {
    packageName += ' + 50 Histórias dos Santos para Colorir';
  }
  const valorFormatado = (order.amount_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Instruções para pagamento: Agenda Católica 2027</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="display: none; font-size: 1px; color: #f8fafc; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Dados para pagamento via Pix do seu pedido da Agenda Católica 2027.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px 24px; text-align: left;">
          <tr>
            <td>
              <h2 style="color: #0c1830; font-size: 20px; font-weight: 700; margin: 0 0 16px;">Instruções para pagamento do seu pedido</h2>
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Olá, <strong>${firstName}</strong>!</p>
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
                Recebemos o registro do seu pedido da <strong>${packageName}</strong> no valor de <strong>${valorFormatado}</strong>.
              </p>
              <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px; color: #334155;">
                Segue abaixo o seu código <strong>Pix Copia e Cola</strong> para realizar o pagamento no aplicativo do seu banco:
              </p>

              <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; margin: 18px 0;">
                <p style="font-size: 11px; color: #475569; margin: 0 0 6px; font-weight: 600; text-transform: uppercase;">Código Pix Copia e Cola:</p>
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; font-family: monospace; font-size: 12px; color: #0f172a; word-break: break-all; max-height: 90px; overflow-y: auto;">
                  ${order.pix_code}
                </div>
              </div>

              <div style="background-color: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 4px; padding: 12px 14px; margin: 18px 0;">
                <p style="margin: 0 0 6px; color: #166534; font-size: 13px; font-weight: 600;">Como pagar pelo seu banco:</p>
                <ol style="margin: 0; padding-left: 18px; font-size: 12px; color: #166534; line-height: 1.7;">
                  <li>Copie todo o código Pix acima.</li>
                  <li>Abra o aplicativo do seu banco no celular.</li>
                  <li>Acesse a opção Pix e escolha <strong>Pix Copia e Cola</strong>.</li>
                  <li>Cole o código e confirme o pagamento.</li>
                </ol>
              </div>

              <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 18px 0 0;">
                Assim que a transferência for confirmada pelo Banco Central, o sistema envia automaticamente a confirmação e o link de acesso aos arquivos para este mesmo e-mail.<br><br>
                Se tiver qualquer dificuldade para pagar ou precisar de ajuda, responda a esta mensagem.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;">
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                Agenda Católica 2027 · Suporte: suporte@suporteagenda.online · Site: agendanossasenhora.online
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Olá, ${firstName}!

Recebemos o registro do seu pedido da ${packageName} no valor de ${valorFormatado}.

Segue abaixo o seu código Pix Copia e Cola para realizar o pagamento no aplicativo do seu banco:

${order.pix_code}

Como pagar pelo seu celular:
1. Copie o código Pix acima.
2. Abra o aplicativo do seu banco no celular.
3. Acesse a opção Pix e escolha "Pix Copia e Cola".
4. Cole o código e confirme a transferência.

Assim que a transferência for confirmada pelo Banco Central, o sistema envia automaticamente a confirmação e o link de acesso aos arquivos para este mesmo e-mail.

Se tiver qualquer dificuldade para pagar ou precisar de ajuda, responda a este e-mail.

Agenda Católica 2027
Suporte: suporte@suporteagenda.online
Site oficial: https://agendanossasenhora.online
`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Agenda Católica 2027 <suporte@suporteagenda.online>',
        reply_to: 'suporte@suporteagenda.online',
        to: [order.customer_email],
        subject: 'Instruções para pagamento: Agenda Católica 2027',
        html: html,
        text: text,
      }),
    });

    const data = await res.json();
    return { success: res.ok, data };
  } catch (err) {
    console.error('Erro ao enviar e-mail de PIX pendente:', err);
    return { success: false, error: err };
  }
}

export async function sendCustomEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY') || '';
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY ausente' };
  }

  // Gera texto puro simples removendo tags HTML
  const plainText = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Agenda Católica 2027 <suporte@suporteagenda.online>',
        reply_to: 'suporte@suporteagenda.online',
        to: [to],
        subject: subject,
        html: html,
        text: plainText,
      }),
    });

    const data = await res.json();
    return { success: res.ok, data };
  } catch (err) {
    console.error('Erro ao enviar email customizado:', err);
    return { success: false, error: err };
  }
}
