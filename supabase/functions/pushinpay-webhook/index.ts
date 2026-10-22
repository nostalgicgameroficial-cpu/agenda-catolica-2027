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
    return { success: response.ok, data: result };
  } catch (err) {
    console.error('[Meta CAPI] Erro ao disparar evento:', err);
    return { success: false, error: err };
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
  if (isUpsell) {
    packageName = 'Mega Coleção de 150 Quadros Sacros em Alta Definição';
  } else if (isDownsell) {
    packageName = 'Seleção Especial de 50 Quadros Sacros em Alta Definição';
  }
  if (hasOrderBump) {
    packageName += ' + 50 Histórias dos Santos para Colorir';
  }
  if (hasOrderBumpQuadros) {
    packageName += ' + 50 Quadros Sacros em Alta Definição';
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
                <p style="margin: 0 0 4px; color: #1e40af; font-size: 14px; font-weight: 700;">🖼️ Bônus Incluso: 50 Quadros Sacros em Alta Definição</p>
                <p style="margin: 0 0 10px; font-size: 13px; color: #1e3a8a; line-height: 1.5;">A sua coleção com 50 Quadros Sacros em altíssima resolução (300 DPI) para impressão e oratório já está liberada no seu Google Drive:</p>
                <a href="https://drive.google.com/drive/folders/1UdG6owMKkbJDjlJ4m9Uw4grCpm5JOZyy?usp=drive_link" target="_blank" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 4px; font-weight: 600; font-size: 13px; display: inline-block;">
                  Acessar 50 Quadros no Google Drive
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

` + (hasOrderBump ? '🎨 Bônus Especial: 50 Histórias dos Santos para Colorir incluso na sua pasta do Google Drive!\n\n' : '') + (hasOrderBumpQuadros ? '🖼️ Bônus Especial: 50 Quadros Sacros em Alta Definição incluso no Google Drive:\nhttps://drive.google.com/drive/folders/1UdG6owMKkbJDjlJ4m9Uw4grCpm5JOZyy?usp=drive_link\n\n' : '') + `Instruções de uso:
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

// ========================================================
// SERVIDOR WEBHOOK PUSHINPAY
// ========================================================
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://cittmkbqdzxaexprujyy.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || 'sb_publishable_K8pfshJSKXwLwpWScjer-g_uRx4kCnn';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validação de Segurança opcional do Token do Webhook
    const EXPECTED_WEBHOOK_TOKEN = 'leaodourado15062929';
    const headerToken = req.headers.get('x-pushinpay-token');
    if (headerToken && headerToken !== EXPECTED_WEBHOOK_TOKEN) {
      console.warn('Webhook PushinPay rejeitado: header x-pushinpay-token inválido:', headerToken);
      return new Response(JSON.stringify({ error: 'Não autorizado: token de webhook inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Leitura resiliente do corpo da requisição (Suporta JSON, form-urlencoded e query string)
    let rawText = '';
    try {
      rawText = await req.text();
    } catch (e) {
      console.warn('Não foi possível ler req.text:', e);
    }

    console.log(`Webhook PushinPay recebido (método: ${req.method}, tamanho: ${rawText.length}):`, rawText);

    let payload: any = null;

    // 1. Tentar parsear como JSON
    if (rawText && rawText.trim().length > 0) {
      try {
        payload = JSON.parse(rawText.trim());
      } catch (_jsonErr) {
        // 2. Se falhar, tentar parsear como application/x-www-form-urlencoded (ex: id=xxx&status=paid)
        try {
          const params = new URLSearchParams(rawText);
          const formObj: Record<string, any> = {};
          for (const [key, val] of params.entries()) {
            formObj[key] = val;
          }
          if (Object.keys(formObj).length > 0) {
            payload = formObj;
          }
        } catch (_formErr) {
          console.warn('Falha ao interpretar body como form-data');
        }
      }
    }

    // 3. Fallback: verificar se veio via URL Search Params (GET ou POST com query)
    try {
      const urlObj = new URL(req.url);
      const qId = urlObj.searchParams.get('id') || urlObj.searchParams.get('transaction_id');
      const qStatus = urlObj.searchParams.get('status');
      if (qId) {
        payload = payload || {};
        if (!payload.id) payload.id = qId;
        if (!payload.status && qStatus) payload.status = qStatus;
      }
    } catch (_urlErr) {}

    // Extração normalizada dos dados da transação
    let transactionId = null;
    let status = '';

    if (payload) {
      if (Array.isArray(payload) && payload.length > 0) {
        payload = payload[0];
      }
      transactionId = payload.id || 
                      payload.transaction_id || 
                      (payload.data && (payload.data.id || payload.data.transaction_id)) || 
                      (payload.pix && (payload.pix.id || payload.pix.transaction_id)) ||
                      payload.pix_id || 
                      null;

      status = String(
        payload.status || 
        (payload.data && payload.data.status) || 
        (payload.pix && payload.pix.status) || 
        ''
      ).toLowerCase().trim();
    }

    // Se não tiver transactionId, retorna 200 com alerta (NUNCA 400 para evitar que o gateway marque o webhook como quebrado)
    if (!transactionId) {
      console.warn('Webhook PushinPay recebido sem transaction_id identificável. Body:', rawText);
      return new Response(JSON.stringify({ 
        received: true, 
        warning: 'Nenhum transaction_id identificado no payload',
        received_length: rawText.length
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isPaid = status === 'paid' || 
                   status === 'approved' || 
                   status === 'pago' || 
                   status === 'completed' || 
                   status === 'concluido' ||
                   status === 'success';

    console.log(`Webhook PushinPay: transactionId=${transactionId}, status=${status}, isPaid=${isPaid}`);

    // Se o webhook informar que foi pago (ou se não veio status, consultar PushinPay)
    let shouldProcessPayment = isPaid;

    if (!shouldProcessPayment) {
      // Dupla checagem direta na PushinPay caso o status não seja explicitamente "paid"
      try {
        const pushinToken = Deno.env.get('PUSHINPAY_TOKEN') || '72676|8QUpNQcdgWRminwQupCLHOtgNW7wWdBXGk2OJEdR338642a9';
        if (pushinToken) {
          const directCheck = await fetch(`https://api.pushinpay.com.br/api/transactions/${transactionId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${pushinToken}`,
              'Accept': 'application/json',
            },
          });
          if (directCheck.ok) {
            const directData = await directCheck.json();
            if (directData && String(directData.status).toLowerCase() === 'paid') {
              console.log(`PushinPay API confirmou status pago para a transação ${transactionId}!`);
              shouldProcessPayment = true;
            }
          }
        }
      } catch (checkErr) {
        console.warn('Erro ao consultar status direto na PushinPay:', checkErr);
      }
    }

    if (shouldProcessPayment) {
      const cleanTxId = String(transactionId).trim();
      const txLower = cleanTxId.toLowerCase();
      const txUpper = cleanTxId.toUpperCase();

      console.log(`Buscando pedido no banco para transactionId: "${cleanTxId}" (lower: "${txLower}", upper: "${txUpper}")`);

      // 1. Busca resiliente e insensível a maiúsculas/minúsculas do pedido
      let order: any = null;

      // Tentativa A: ilike direto na coluna pushinpay_transaction_id
      const { data: orderIlike, error: errIlike } = await supabase
        .from('orders')
        .select('*')
        .ilike('pushinpay_transaction_id', cleanTxId)
        .maybeSingle();

      if (orderIlike) {
        order = orderIlike;
        console.log(`Pedido encontrado via ilike(pushinpay_transaction_id): ${order.id}`);
      } else {
        if (errIlike) console.warn('Erro na busca ilike:', errIlike);

        // Tentativa B: comparação exata com lowercase e uppercase
        const { data: orderEq } = await supabase
          .from('orders')
          .select('*')
          .or(`pushinpay_transaction_id.eq.${txLower},pushinpay_transaction_id.eq.${txUpper},pushinpay_transaction_id.eq.${cleanTxId}`)
          .maybeSingle();

        if (orderEq) {
          order = orderEq;
          console.log(`Pedido encontrado via or(eq): ${order.id}`);
        } else {
          // Tentativa C: se for formato UUID válido, tenta pelo ID interno do pedido
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanTxId);
          if (isUuid) {
            const { data: orderById } = await supabase
              .from('orders')
              .select('*')
              .eq('id', txLower)
              .maybeSingle();
            if (orderById) {
              order = orderById;
              console.log(`Pedido encontrado via id interno: ${order.id}`);
            }
          }

          // Tentativa D (Super Fallback de contingência): buscar os pedidos recentes e comparar em memória
          if (!order) {
            console.log('Tentando busca de contingência nos últimos 50 pedidos...');
            const { data: recentOrders } = await supabase
              .from('orders')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(50);

            if (recentOrders && recentOrders.length > 0) {
              order = recentOrders.find((o: any) => {
                const pid = (o.pushinpay_transaction_id || '').trim().toLowerCase();
                const oid = (o.id || '').trim().toLowerCase();
                return pid === txLower || oid === txLower;
              }) || null;

              if (order) {
                console.log(`Pedido encontrado via varredura recente em memória: ${order.id}`);
              }
            }
          }
        }
      }

      if (!order) {
        console.warn(`Pedido NÃO localizado no banco para transaction_id="${cleanTxId}"`);
        return new Response(JSON.stringify({ 
          received: true, 
          warning: 'Pedido não localizado no banco de dados', 
          transactionId: cleanTxId 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 2. Atualiza pedido para pago imediatamente no banco
      const paidDate = order.paid_at || new Date().toISOString();
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: paidDate,
        })
        .eq('id', order.id);

      if (updateError) {
        console.error(`Erro ao atualizar pedido ${order.id} para paid:`, updateError);
      } else {
        console.log(`Pedido ${order.id} confirmado com sucesso como PAID!`);
        order.status = 'paid';
        order.paid_at = paidDate;
      }

      // 3. Dispara e-mail de entrega via Resend caso ainda não enviado
      if (!order.email_sent) {
        try {
          const emailResult = await sendDeliveryEmail(order);
          if (emailResult.success) {
            await supabase
              .from('orders')
              .update({
                email_sent: true,
                email_sent_at: new Date().toISOString(),
              })
              .eq('id', order.id);
            console.log(`E-mail de entrega enviado com sucesso para ${order.customer_email}`);
          } else {
            console.warn('Falha no envio de e-mail de entrega:', emailResult.error);
          }
        } catch (emailEx) {
          console.error('Exceção ao disparar e-mail de entrega:', emailEx);
        }
      }

      // 4. Dispara evento Purchase na Meta Conversions API (CAPI) com deduplicação
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

        if (isUpsell) {
          contentIds = ['quadros-sacros-150'];
          contentName = 'Mega Coleção 150 Quadros Sacros em Alta Definição';
        } else if (isDownsell) {
          contentIds = ['quadros-sacros-50'];
          contentName = 'Seleção 50 Quadros Sacros em Alta Definição';
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

        sendMetaEvent({
          eventName: 'Purchase',
          eventId: purchaseEventId,
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
            num_items: hasOrderBump ? 2 : 1,
            order_id: order.id,
          }
        }).catch(metaErr => console.error('Erro assíncrono CAPI Purchase (Webhook):', metaErr));
      } catch (metaErr) {
        console.error('Erro ao agendar CAPI Purchase (Webhook):', metaErr);
      }

      return new Response(JSON.stringify({ 
        received: true, 
        order_id: order.id, 
        status: 'paid',
        message: 'Pedido confirmado e processado com sucesso' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      received: true, 
      status: status || 'pending',
      transaction_id: transactionId,
      message: 'Status registrado' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    const errorMsg = err && err.message ? err.message : String(err);
    console.error('Erro interno no webhook PushinPay:', errorMsg);
    // Retorna 200 com status do erro para não quebrar a fila do webhook da PushinPay
    return new Response(JSON.stringify({ 
      received: true, 
      error: errorMsg,
      warning: 'Erro interno capturado e isolado com segurança' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
