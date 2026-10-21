// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pushinpay-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// ========================================================
// META CONVERSIONS API (CAPI) SELF-CONTAINED
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

async function sendPixPendingEmail(order: {
  customer_name: string;
  customer_email: string;
  plan: string;
  order_bump?: boolean;
  order_bump_quadros?: boolean;
  amount_cents: number;
  pix_code: string;
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY') || '';
  if (!apiKey) {
    console.error('RESEND_API_KEY não configurada');
    return { success: false, error: 'RESEND_API_KEY ausente' };
  }

  const firstName = order.customer_name ? order.customer_name.split(' ')[0] : 'Irmão(ã) em Cristo';
  let baseName = 'Agenda Católica 2027 Completa + 5 Bônus';
  if (order.plan === 'basico') {
    baseName = 'Agenda Católica 2027 Básica';
  } else if (order.plan === 'upsell') {
    baseName = 'Mega Coleção 150 Quadros Sacros em Alta Definição';
  } else if (order.plan === 'downsell') {
    baseName = 'Seleção 50 Quadros Sacros em Alta Definição';
  }
  let packageName = baseName;
  if (order.order_bump) packageName += ' + Caderno de Colorir dos Santos';
  if (order.order_bump_quadros) packageName += ' + 50 Quadros Sacros';
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
    console.log('Resposta do envio de PIX pendente Resend:', data);
    return { success: res.ok, data };
  } catch (err) {
    console.error('Erro ao enviar e-mail de PIX pendente:', err);
    return { success: false, error: err };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const pushinToken = Deno.env.get('PUSHINPAY_TOKEN') || '72676|8QUpNQcdgWRminwQupCLHOtgNW7wWdBXGk2OJEdR338642a9';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { name, email, phone, cpf, plan, order_bump, order_bump_quadros, tracking, event_id, event_source_url } = body;

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     req.headers.get('x-real-ip') || '';
    const clientUserAgent = req.headers.get('user-agent') || '';

    if (!name || !email || !phone) {
      return new Response(
        JSON.stringify({ error: 'Nome, e-mail e telefone são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let selectedPlan = 'completo';
    let baseCents = 2790;
    let contentName = 'Agenda Católica 2027 + 5 Bônus Exclusivos';
    let contentIds = ['agenda-catolica-2027-completa'];

    if (plan === 'basico') {
      selectedPlan = 'basico';
      baseCents = 1990;
      contentName = 'Agenda Católica 2027 Básica';
      contentIds = ['agenda-catolica-2027-basica'];
    } else if (plan === 'upsell') {
      selectedPlan = 'upsell';
      baseCents = 6790;
      contentName = 'Mega Coleção 150 Quadros Sacros em Alta Definição';
      contentIds = ['quadros-sacros-150'];
    } else if (plan === 'downsell') {
      selectedPlan = 'downsell';
      baseCents = 2990;
      contentName = 'Seleção 50 Quadros Sacros em Alta Definição';
      contentIds = ['quadros-sacros-50'];
    }

    const hasOrderBump = (selectedPlan === 'basico' || selectedPlan === 'completo') && 
      (order_bump === true || order_bump === 'true' || order_bump === 1 || order_bump === '1');
    const hasOrderBumpQuadros = (selectedPlan === 'basico' || selectedPlan === 'completo') && 
      (order_bump_quadros === true || order_bump_quadros === 'true' || order_bump_quadros === 1 || order_bump_quadros === '1');

    let amountCents = baseCents;
    if (hasOrderBump) {
      amountCents += 790;
      contentName += ' + Caderno de Colorir dos Santos';
      contentIds.push('caderno-colorir-santos');
    }
    if (hasOrderBumpQuadros) {
      amountCents += 1450;
      contentName += ' + 50 Quadros Sacros em Alta Definição';
      contentIds.push('quadros-sacros-50');
    }

    const finalEventId = event_id || `eid_ic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const resolvedFbc = tracking?.fbc || (tracking?.fbclid ? `fb.1.${Date.now()}.${tracking.fbclid}` : null);

    // 1. Cria o registro inicial do pedido no Supabase
    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        customer_cpf: cpf || null,
        plan: selectedPlan,
        order_bump: hasOrderBump,
        order_bump_quadros: hasOrderBumpQuadros,
        amount_cents: amountCents,
        status: 'pending',
        utm_source: tracking?.utm_source || null,
        utm_medium: tracking?.utm_medium || null,
        utm_campaign: tracking?.utm_campaign || null,
        utm_content: tracking?.utm_content || null,
        utm_term: tracking?.utm_term || null,
        fbclid: tracking?.fbclid || null,
        fbc: resolvedFbc,
        fbp: tracking?.fbp || null,
        client_ip: clientIp || null,
        client_user_agent: clientUserAgent || null,
      })
      .select()
      .single();

    if (insertError || !order) {
      console.error('Erro ao inserir pedido:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao registrar pedido no banco de dados.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Chama a API da PushinPay para gerar o QR Code PIX
    if (!pushinToken) {
      console.warn('PUSHINPAY_TOKEN não configurada.');
      return new Response(
        JSON.stringify({
          error: 'Configuração pendente: Defina o PUSHINPAY_TOKEN no Supabase Secrets para gerar o PIX real.',
          order_id: order.id,
          require_token: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/pushinpay-webhook`;

    const pushinResponse = await fetch('https://api.pushinpay.com.br/api/pix/cashIn', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pushinToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: amountCents,
        webhook_url: webhookUrl,
      }),
    });

    const pushinData = await pushinResponse.json();

    if (!pushinResponse.ok || !pushinData.qr_code) {
      console.error('Erro na API PushinPay:', pushinData);
      return new Response(
        JSON.stringify({
          error: pushinData.message || 'Erro ao gerar o código PIX na operadora.',
          details: pushinData
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Atualiza o pedido com os dados recebidos da PushinPay
    await supabase
      .from('orders')
      .update({
        pushinpay_transaction_id: String(pushinData.id).trim().toLowerCase(),
        pix_code: pushinData.qr_code,
        pix_qr_code_base64: pushinData.qr_code_base64,
      })
      .eq('id', order.id);

    // 4. Envia imediatamente o código PIX para o e-mail do cliente com proteções anti-spam
    try {
      sendPixPendingEmail({
        customer_name: name,
        customer_email: email,
        plan: selectedPlan,
        order_bump: hasOrderBump,
        order_bump_quadros: hasOrderBumpQuadros,
        amount_cents: amountCents,
        pix_code: pushinData.qr_code,
      }).catch(e => console.error('Falha assíncrona ao enviar PIX por email:', e));
    } catch (emailErr) {
      console.error('Erro ao agendar envio de email PIX:', emailErr);
    }

    // 5. Dispara evento InitiateCheckout na Meta Conversions API (CAPI) de forma assíncrona
    // com o MESMO event_id para deduplicação sem contagem dupla
    try {
      sendMetaEvent({
        eventName: 'InitiateCheckout',
        eventId: finalEventId,
        eventSourceUrl: event_source_url || 'https://agendanossasenhora.online',
        userData: {
          email: email,
          phone: phone,
          name: name,
          clientIp: clientIp,
          clientUserAgent: clientUserAgent,
          fbc: resolvedFbc || undefined,
          fbp: tracking?.fbp || undefined,
          externalId: tracking?.external_id || undefined,
        },
        customData: {
          currency: 'BRL',
          value: amountCents / 100,
          content_name: contentName,
          content_ids: contentIds,
          content_type: 'product',
          num_items: hasOrderBump ? 2 : 1,
          order_id: order.id,
        }
      }).catch(metaErr => console.error('Erro assíncrono ao enviar CAPI InitiateCheckout:', metaErr));
    } catch (metaErr) {
      console.error('Erro ao agendar CAPI InitiateCheckout:', metaErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        transaction_id: pushinData.id,
        qr_code: pushinData.qr_code,
        qr_code_base64: pushinData.qr_code_base64,
        amount_cents: amountCents,
        status: 'pending',
        event_id: finalEventId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Erro inesperado em create-pix:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao processar requisição.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
