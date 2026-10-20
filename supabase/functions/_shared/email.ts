export async function sendDeliveryEmail(order: {
  id: string;
  customer_name: string;
  customer_email: string;
  plan: string;
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.error('RESEND_API_KEY não configurada');
    return { success: false, error: 'RESEND_API_KEY ausente' };
  }

  const isCompleto = order.plan === 'completo';
  const firstName = order.customer_name ? order.customer_name.split(' ')[0] : 'Irmão(ã) em Cristo';

  // Links de entrega direta / download
  // O cliente pode acessar a página de downloads com o ID do pedido ou baixar diretamente
  const siteUrl = 'https://agendacatolica2027.com.br'; // ou URL onde a página estiver hospedada
  
  const bonusHtml = isCompleto ? `
    <div style="background-color: #f7f9fc; border: 2px solid #d8a436; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <h3 style="color: #0c1830; margin-top: 0; font-size: 18px; text-transform: uppercase;">🎁 Seus 5 Bônus Exclusivos Inclusos:</h3>
      <ul style="color: #334155; line-height: 1.8; padding-left: 20px; margin-bottom: 16px;">
        <li><strong>Bônus 1:</strong> Caderno de Novenas & Orações Poderosas (PDF)</li>
        <li><strong>Bônus 2:</strong> Guia da Via Sacra Ilustrada de Santo Afonso (PDF)</li>
        <li><strong>Bônus 3:</strong> Calendário Litúrgico de Parede 2027 para Imprimir (PDF A4)</li>
        <li><strong>Bônus 4:</strong> Plano de Leitura da Bíblia Sagrada em 1 Ano (PDF)</li>
        <li><strong>Bônus 5:</strong> Kit de 12 Marcadores de Páginas Católicos em Alta Resolução (PDF)</li>
      </ul>
      <p style="font-size: 14px; color: #64748b; margin: 0;">Todos os materiais já estão liberados para você baixar e imprimir quando desejar!</p>
    </div>
  ` : '';

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Sua Agenda Católica 2027 Chegou!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0f4f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
          
          <!-- TOPO AZUL MARIANO -->
          <tr>
            <td style="background: linear-gradient(135deg, #0c1830 0%, #1d4d90 100%); padding: 36px 30px; text-align: center; color: #ffffff;">
              <span style="display: inline-block; background: rgba(247, 214, 121, 0.2); border: 1px solid #f7d679; color: #f7d679; font-size: 12px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; padding: 5px 14px; border-radius: 20px; margin-bottom: 12px;">PAGAMENTO CONFIRMADO</span>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; line-height: 1.3;">Sua Agenda Católica 2027 está pronta! 🙏✨</h1>
              <p style="margin: 10px 0 0; color: #cbd8ef; font-size: 15px;">Sob o manto sagrado de Nossa Senhora Aparecida</p>
            </td>
          </tr>

          <!-- CONTEÚDO PRINCIPAL -->
          <tr>
            <td style="padding: 32px 30px; color: #181f2c;">
              <p style="font-size: 17px; line-height: 1.6; margin-top: 0;">
                Olá, <strong>${firstName}</strong>! Graça e paz!
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #42526e;">
                Recebemos com muita alegria a confirmação do seu pagamento. Que o ano de 2027 seja um tempo de profunda oração, bênçãos diárias e intimidade com Deus para você e toda a sua família.
              </p>

              <!-- DETALHES DO PEDIDO -->
              <div style="background-color: #f8fafc; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #15803d; font-weight: bold;">
                  ✔ Pacote Adquirido: <strong>${isCompleto ? 'Agenda Católica 2027 + 5 Bônus Exclusivos' : 'Agenda Católica 2027 Básica'}</strong>
                </p>
                <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">
                  Código do Pedido: <code style="font-family: monospace;">${order.id}</code>
                </p>
              </div>

              <!-- BOTÃO DE DOWNLOAD -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${siteUrl}/sucesso.html?order_id=${order.id}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff; text-decoration: none; padding: 18px 36px; font-size: 16px; font-weight: 900; letter-spacing: 0.5px; border-radius: 50px; box-shadow: 0 6px 20px rgba(22, 163, 74, 0.35);">
                  📥 BAIXAR MEUS ARQUIVOS AGORA
                </a>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 10px;">Acesso vitalício · Você pode baixar quantas vezes quiser</p>
              </div>

              ${bonusHtml}

              <!-- INSTRUÇÕES DE USO -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 24px;">
                <h4 style="color: #0c1830; margin: 0 0 10px; font-size: 15px;">💡 Como aproveitar o seu material:</h4>
                <ul style="font-size: 14px; color: #475569; line-height: 1.6; padding-left: 20px; margin: 0;">
                  <li><strong>Impressão:</strong> Leve o arquivo a uma gráfica ou imprima em casa nos tamanhos <strong>A4 ou A5</strong> (frente e verso).</li>
                  <li><strong>Digital:</strong> Abra no tablet/celular com apps como GoodNotes, Samsung Notes, Xodo ou Adobe Acrobat.</li>
                  <li><strong>Oratório:</strong> Reserve 10 minutos todas as manhãs com uma vela e um terço para rezar a liturgia do dia.</li>
                </ul>
              </div>

            </td>
          </tr>

          <!-- RODAPÉ -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 30px; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0;">Precisa de ajuda ou suporte com seus arquivos?</p>
              <p style="margin: 4px 0 0;">Basta responder diretamente a este e-mail que nossa equipe de atendimento irá te ajudar com carinho.</p>
              <p style="margin: 12px 0 0; color: #cbd5e1;">© 2026-2027 Agenda Católica com Liturgia Diária. Todos os direitos reservados.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Agenda Católica 2027 <onboarding@resend.dev>',
        to: [order.customer_email],
        subject: '🙏 Sua Agenda Católica 2027 Chegou! [Acesso Imediato]',
        html: html,
      }),
    });

    const data = await res.json();
    console.log('Resposta do Resend:', data);
    return { success: res.ok, data };
  } catch (err) {
    console.error('Erro ao enviar e-mail via Resend:', err);
    return { success: false, error: err };
  }
}
