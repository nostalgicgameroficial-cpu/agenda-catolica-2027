// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pushinpay-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// ========================================================
// META CONVERSIONS API (CAPI)
// ========================================================
async function sha256(str: string): Promise<string> {
  if (!str) return '';
  const clean = str.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(clean);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizePhone(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = '55' + digits;
  }
  return digits;
}

async function sendMetaEvent(payload: any) {
  const META_PIXEL_ID = Deno.env.get('META_PIXEL_ID') || '1133049763020624';
  const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN') || '';
  const META_TEST_EVENT_CODE = Deno.env.get('META_TEST_EVENT_CODE') || '';

  if (!META_ACCESS_TOKEN || !META_PIXEL_ID) {
    return { success: false, error: 'Credenciais CAPI ausentes' };
  }

  try {
    const { eventName, eventId, eventTime, eventSourceUrl, userData, customData } = payload;

    const [hashedEmail, hashedPhone, hashedFirstName, hashedLastName] = await Promise.all([
      userData.email ? sha256(userData.email) : '',
      userData.phone ? sha256(normalizePhone(userData.phone)) : '',
      userData.name ? sha256(userData.name.trim().split(' ')[0]) : '',
      userData.name && userData.name.trim().includes(' ') 
        ? sha256(userData.name.trim().split(' ').slice(1).join(' ')) 
        : ''
    ]);

    const formattedUserData: Record<string, any> = {};
    if (hashedEmail) formattedUserData.em = [hashedEmail];
    if (hashedPhone) formattedUserData.ph = [hashedPhone];
    if (hashedFirstName) formattedUserData.fn = [hashedFirstName];
    if (hashedLastName) formattedUserData.ln = [hashedLastName];
    if (userData.clientIp) formattedUserData.client_ip_address = userData.clientIp;
    if (userData.clientUserAgent) formattedUserData.client_user_agent = userData.clientUserAgent;
    if (userData.fbc) formattedUserData.fbc = userData.fbc;
    if (userData.fbp) formattedUserData.fbp = userData.fbp;
    if (userData.externalId) {
      formattedUserData.external_id = [await sha256(userData.externalId)];
    }

    const eventData: Record<string, any> = {
      event_name: eventName,
      event_time: eventTime || Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      event_source_url: eventSourceUrl || 'https://agendanossasenhora.online',
      user_data: formattedUserData,
      custom_data: {
        currency: customData.currency || 'BRL',
        value: typeof customData.value === 'number' ? customData.value : parseFloat(String(customData.value || 0)),
        content_name: customData.content_name,
        content_category: customData.content_category || 'Produtos Digitais > Agenda Católica',
        content_ids: customData.content_ids || ['agenda-catolica-2027'],
        content_type: customData.content_type || 'product',
        num_items: customData.num_items || 1,
        ...(customData.order_id ? { order_id: customData.order_id } : {})
      }
    };

    const requestBody: Record<string, any> = {
      data: [eventData]
    };
    if (META_TEST_EVENT_CODE) {
      requestBody.test_event_code = META_TEST_EVENT_CODE;
    }

    const apiUrl = `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(META_ACCESS_TOKEN)}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const result = await response.json();
    console.log(`[Meta CAPI CheckPix] Evento ${eventName} (ID: ${eventId}) enviado: status=${response.status}, ok=${response.ok}`, result);
    if (!response.ok) {
      console.error(`[Meta CAPI CheckPix] Erro retornado pela Meta para ${eventName}:`, result);
    }
    return { success: response.ok, status: response.status, data: result };
  } catch (err) {
    console.error('[Meta CAPI CheckPix] Erro ao disparar evento:', err);
    return { success: false, error: String(err) };
  }
}

// ========================================================
// ENVIO DE E-MAIL DE ENTREGA VIA RESEND
// ========================================================
async function sendDeliveryEmail(order: {
  id: string;
  customer_name: string;
  customer_email: string;
  plan: string;
  order_bump?: boolean;
  order_bump_quadros?: boolean;
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY') || '';
  if (!apiKey) {
    console.error('RESEND_API_KEY não configurada');
    return { success: false, error: 'RESEND_API_KEY ausente' };
  }

  const isCompleto = order.plan === 'completo';
  const isUpsell = order.plan === 'upsell';
  const isDownsell = order.plan === 'downsell';
  const hasOrderBump = !!order.order_bump;
  const hasOrderBumpQuadros = !!order.order_bump_quadros;
  const firstName = order.customer_name ? order.customer_name.split(' ')[0] : 'Irmão(ã) em Cristo';
  
  let packageName = isCompleto ? 'Agenda Católica 2027 + 5 Bônus Exclusivos' : 'Agenda Católica 2027 Básica';
  if (order.plan === 'fisica' || isUpsell) {
    packageName = 'Agenda Católica 2027 Física Personalizada (Edição Impressa)';
  } else if (isDownsell) {
    packageName = 'Calendário Litúrgico 2027 com Moldura de Parede';
  }
  if (hasOrderBump) {
    packageName += ' + 50 Histórias dos Santos para Colorir';
  }
  if (hasOrderBumpQuadros) {
    packageName += ' + 90 Quadros Sacros em Alta Definição';
  }

  let driveLink = 'https://drive.google.com/drive/folders/1z-omzWDOf-s8h2XWGW_BCgCagGWU5vtq?usp=sharing';
  if (isUpsell || isDownsell) {
    driveLink = 'https://drive.google.com/drive/folders/1UdG6owMKkbJDjlJ4m9Uw4grCpm5JOZyy?usp=sharing';
  } else if (!isCompleto) {
    driveLink = 'https://drive.google.com/drive/folders/1vstC1uvFR11TZIg5zXpILGT-khchTjJp?usp=sharing';
  }

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
              <h2 style="color: #0c1830; font-size: 20px; font-weight: 700; margin: 0 0 16px;">Seus arquivos estão disponíveis 🙏✨</h2>
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

              ${hasOrderBumpQuadros ? `
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; border-radius: 6px; padding: 14px; margin: 20px 0;">
                <p style="margin: 0 0 4px; color: #1e40af; font-size: 14px; font-weight: 700;">🖼️ Bônus Incluso: 90 Quadros Sacros em Alta Definição</p>
                <p style="margin: 0 0 10px; font-size: 13px; color: #1e3a8a; line-height: 1.5;">A sua coleção com +90 Quadros Sacros em altíssima resolução (300 DPI) para impressão e oratório já está liberada no seu Google Drive:</p>
                <a href="https://drive.google.com/drive/folders/1UdG6owMKkbJDjlJ4m9Uw4grCpm5JOZyy?usp=drive_link" target="_blank" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 4px; font-weight: 600; font-size: 13px; display: inline-block;">
                  Acessar 90 Quadros no Google Drive
                </a>
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

` + (hasOrderBump ? '🎨 Bônus Especial: 50 Histórias dos Santos para Colorir incluso na sua pasta do Google Drive!\n\n' : '') + (hasOrderBumpQuadros ? '🖼️ Bônus Especial: 90 Quadros Sacros em Alta Definição incluso no Google Drive:\nhttps://drive.google.com/drive/folders/1UdG6owMKkbJDjlJ4m9Uw4grCpm5JOZyy?usp=drive_link\n\n' : '') + `Instruções de uso:
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
        subject: '🙏 Seus arquivos da Agenda Católica 2027 chegaram! [Acesso Liberado]',
        html: html,
        text: text,
      }),
    });

    const data = await res.json();
    return { success: res.ok, data };
  } catch (err) {
    console.error('Erro ao enviar e-mail via Resend:', err);
    return { success: false, error: String(err) };
  }
}



serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://cittmkbqdzxaexprujyy.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || 'sb_publishable_K8pfshJSKXwLwpWScjer-g_uRx4kCnn';
    const pushinToken = Deno.env.get('PUSHINPAY_TOKEN') || '72676|8QUpNQcdgWRminwQupCLHOtgNW7wWdBXGk2OJEdR338642a9';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: any = null;
    try {
      body = await req.json();
    } catch (_e) {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { order_id, transaction_id } = body || {};

    if (!order_id && !transaction_id) {
      return new Response(
        JSON.stringify({ error: 'order_id ou transaction_id é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Busca o pedido no Supabase
    let query = supabase.from('orders').select('*');
    if (order_id) {
      query = query.eq('id', order_id);
    } else {
      query = query.eq('pushinpay_transaction_id', transaction_id);
    }

    const { data: order, error } = await query.maybeSingle();

    if (error || !order) {
      return new Response(
        JSON.stringify({ error: 'Pedido não encontrado.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se já está pago no banco
    if (order.status === 'paid') {
      return new Response(
        JSON.stringify({ status: 'paid', plan: order.plan, order }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Se estiver pendente, consulta na PushinPay
    const transId = transaction_id || order.pushinpay_transaction_id;
    if (transId && pushinToken) {
      try {
        const checkRes = await fetch(`https://api.pushinpay.com.br/api/transactions/${transId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${pushinToken}`,
            'Accept': 'application/json',
          },
        });

        if (checkRes.ok) {
          const pushinData = await checkRes.json();
          if (pushinData && pushinData.status === 'paid') {
            console.log(`Pedido ${order.id} confirmado como PAGO pela PushinPay (CheckPix)!`);

            const paidDate = new Date().toISOString();
            // Atualiza status no banco
            await supabase
              .from('orders')
              .update({
                status: 'paid',
                paid_at: paidDate,
              })
              .eq('id', order.id);

            order.status = 'paid';
            order.paid_at = paidDate;

            // Dispara e-mail de entrega caso ainda não enviado
            if (!order.email_sent) {
              const emailResult = await sendDeliveryEmail(order);
              if (emailResult.success) {
                await supabase
                  .from('orders')
                  .update({
                    email_sent: true,
                    email_sent_at: new Date().toISOString(),
                  })
                  .eq('id', order.id);
                order.email_sent = true;
              }
            }

            // Dispara Purchase na Meta Conversions API (CAPI) com deduplicação
            if (!order.meta_purchase_sent) {
              try {
                const purchaseEventId = `purchase_${order.id}`;
                const hasOrderBump = !!order.order_bump;
                const hasOrderBumpQuadros = !!order.order_bump_quadros;
                const isUpsell = order.plan === 'upsell';
                const isDownsell = order.plan === 'downsell';
                const baseAmount = order.plan === 'basico' ? 19.90 : (isUpsell ? 67.90 : (isDownsell ? 29.90 : 27.90));
                const amount = order.amount_cents ? (order.amount_cents / 100) : (baseAmount + (hasOrderBump ? 7.90 : 0) + (hasOrderBumpQuadros ? 7.50 : 0));

                let contentIds = [order.plan === 'completo' ? 'agenda-catolica-2027-completa' : 'agenda-catolica-2027-basica'];
                let contentName = order.plan === 'completo' ? 'Agenda Católica 2027 + 5 Bônus Exclusivos' : 'Agenda Católica 2027 Básica';

                if (isUpsell || order.plan === 'fisica') {
                  contentIds = ['agenda-catolica-2027-fisica'];
                  contentName = 'Agenda Católica 2027 Física Personalizada (Edição Impressa)';
                } else if (isDownsell) {
                  contentIds = ['calendario-liturgico-moldura-29'];
                  contentName = 'Calendário Litúrgico 2027 com Moldura de Parede';
                }
                if (hasOrderBump) {
                  contentIds.push('caderno-colorir-santos');
                  contentName += ' + 50 Histórias dos Santos para Colorir';
                }
                if (hasOrderBumpQuadros) {
                  contentIds.push('quadros-sacros-90');
                  contentName += ' + 90 Quadros Sacros em Alta Definição';
                }

                const finalFbc = order.fbc || (order.fbclid ? `fb.1.${new Date(order.created_at || Date.now()).getTime()}.${order.fbclid}` : undefined);

                const metaResult = await sendMetaEvent({
                  eventName: 'Purchase',
                  eventId: purchaseEventId,
                  eventTime: Math.floor(new Date(paidDate).getTime() / 1000),
                  eventSourceUrl: 'https://agendanossasenhora.online',
                  userData: {
                    email: order.customer_email,
                    phone: order.customer_phone,
                    name: order.customer_name,
                    clientIp: order.client_ip || undefined,
                    clientUserAgent: order.client_user_agent || undefined,
                    fbc: finalFbc,
                    fbp: order.fbp || undefined,
                    externalId: order.id || undefined,
                  },
                  customData: {
                    currency: 'BRL',
                    value: amount,
                    content_name: contentName,
                    content_ids: contentIds,
                    content_type: 'product',
                    num_items: (hasOrderBump ? 1 : 0) + (hasOrderBumpQuadros ? 1 : 0) + 1,
                    order_id: order.id,
                  }
                });

                console.log(`[Meta CAPI CheckPix] Evento Purchase disparado para pedido ${order.id}:`, metaResult);

                if (metaResult && metaResult.success) {
                  await supabase
                    .from('orders')
                    .update({
                      meta_purchase_sent: true,
                      meta_purchase_sent_at: new Date().toISOString()
                    })
                    .eq('id', order.id);
                  order.meta_purchase_sent = true;
                }
              } catch (metaErr) {
                console.error('[Meta CAPI CheckPix] Erro ao disparar CAPI Purchase:', metaErr);
              }
            } else {
              console.log(`[Meta CAPI CheckPix] Purchase já havia sido enviado para pedido ${order.id}`);
            }

            return new Response(
              JSON.stringify({ status: 'paid', plan: order.plan, order }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (checkErr) {
        console.error('Erro ao consultar PushinPay:', checkErr);
      }
    }

    return new Response(
      JSON.stringify({ status: order.status, plan: order.plan, order }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Erro em check-pix:', err);
    return new Response(
      JSON.stringify({ error: 'Erro ao verificar status do pagamento.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
