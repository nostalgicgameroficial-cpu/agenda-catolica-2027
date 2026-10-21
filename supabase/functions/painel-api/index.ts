// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendMetaEvent } from '../_shared/meta.ts';

const ADMIN_PASSWORD = 'Guh@150629';
const PUSHINPAY_FEE_CENTS = 45; // 45 centavos por transação paga

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-password',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

async function sendDeliveryEmail(order: {
  id: string;
  customer_name: string;
  customer_email: string;
  plan: string;
  order_bump?: boolean;
}) {
  const apiKey = Deno.env.get('RESEND_API_KEY') || '';
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY ausente' };
  }

  const isCompleto = order.plan === 'completo';
  const isUpsell = order.plan === 'upsell';
  const isDownsell = order.plan === 'downsell';
  const hasOrderBump = !!order.order_bump;
  const firstName = order.customer_name ? order.customer_name.split(' ')[0] : 'Irmão(ã) em Cristo';
  
  let packageName = isCompleto ? 'Agenda Católica 2027 + 5 Bônus Exclusivos' : 'Agenda Católica 2027 Básica';
  if (isUpsell) {
    packageName = 'Mega Coleção de 150 Quadros Sacros em Alta Definição';
  } else if (isDownsell) {
    packageName = 'Seleção Especial de 50 Quadros Sacros em Alta Definição';
  } else if (hasOrderBump) {
    packageName += ' + 50 Histórias dos Santos para Colorir';
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

async function sendCustomEmail({
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const headerPassword = req.headers.get('x-admin-password');
    let body = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch (_) {
        body = {};
      }
    }

    const providedPassword = headerPassword || body.password || '';

    if (providedPassword !== ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'Senha de administrador inválida.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = body.action || url.searchParams.get('action') || 'list';

    // 1. AÇÃO: LISTAR PEDIDOS E ESTATÍSTICAS
    if (action === 'list') {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar pedidos no banco.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let totalRevenueCents = 0;
      let totalPaidCount = 0;
      let totalPendingCount = 0;
      const campaignStats: Record<string, { total: number; paid: number; revenueCents: number }> = {};
      const sourceStats: Record<string, { total: number; paid: number; revenueCents: number }> = {};

      (orders || []).forEach((o) => {
        const isPaid = o.status === 'paid';
        if (isPaid) {
          totalRevenueCents += o.amount_cents || 0;
          totalPaidCount++;
        } else if (o.status === 'pending') {
          totalPendingCount++;
        }

        const camp = o.utm_campaign || '(Direto / Sem Campanha)';
        if (!campaignStats[camp]) {
          campaignStats[camp] = { total: 0, paid: 0, revenueCents: 0 };
        }
        campaignStats[camp].total++;
        if (isPaid) {
          campaignStats[camp].paid++;
          campaignStats[camp].revenueCents += o.amount_cents || 0;
        }

        const src = o.utm_source || '(Direto / Orgânico)';
        if (!sourceStats[src]) {
          sourceStats[src] = { total: 0, paid: 0, revenueCents: 0 };
        }
        sourceStats[src].total++;
        if (isPaid) {
          sourceStats[src].paid++;
          sourceStats[src].revenueCents += o.amount_cents || 0;
        }
      });

      const totalFeeCents = totalPaidCount * PUSHINPAY_FEE_CENTS;
      const netRevenueCents = totalRevenueCents - totalFeeCents;

      return new Response(
        JSON.stringify({
          success: true,
          orders,
          metrics: {
            totalOrders: orders?.length || 0,
            totalPaid: totalPaidCount,
            totalPending: totalPendingCount,
            totalRevenueCents,
            totalFeeCents,
            netRevenueCents,
            feePerSaleCents: PUSHINPAY_FEE_CENTS,
            conversionRate: orders?.length ? ((totalPaidCount / orders.length) * 100).toFixed(1) : '0.0',
          },
          campaignStats,
          sourceStats,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. AÇÃO: APROVAÇÃO MANUAL DE COMPRA
    if (action === 'approve') {
      const orderId = body.order_id;
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'order_id é obrigatório.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: order, error: findError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (findError || !order) {
        return new Response(
          JSON.stringify({ error: 'Pedido não encontrado.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      order.status = 'paid';

      const emailResult = await sendDeliveryEmail(order);
      if (emailResult.success) {
        await supabase
          .from('orders')
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          })
          .eq('id', orderId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Pedido aprovado manualmente com sucesso! E-mail com links de acesso enviado.',
          email_sent: emailResult.success,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. AÇÃO: REENVIAR ACESSO (GOOGLE DRIVE)
    if (action === 'resend_access') {
      const orderId = body.order_id;
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'order_id é obrigatório.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: order, error: findError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (findError || !order) {
        return new Response(
          JSON.stringify({ error: 'Pedido não encontrado.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const emailResult = await sendDeliveryEmail(order);
      if (emailResult.success) {
        await supabase
          .from('orders')
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          })
          .eq('id', orderId);
      }

      return new Response(
        JSON.stringify({
          success: emailResult.success,
          message: emailResult.success
            ? 'E-mail de acesso reenviado com sucesso!'
            : 'Erro ao reenviar e-mail: verifique as configurações do Resend.',
          details: emailResult,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. AÇÃO: ENVIAR EMAIL DE REMARKETING / OFERTA
    if (action === 'send_remarketing') {
      const { to, subject, html_content } = body;
      if (!to || !subject || !html_content) {
        return new Response(
          JSON.stringify({ error: 'Destinatário, assunto e conteúdo são obrigatórios.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const emailResult = await sendCustomEmail({
        to,
        subject,
        html: html_content,
      });

      return new Response(
        JSON.stringify({
          success: emailResult.success,
          message: emailResult.success
            ? 'E-mail de remarketing enviado com sucesso!'
            : 'Falha no envio do e-mail de remarketing.',
          details: emailResult,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. AÇÃO: APAGAR PEDIDO (DELETE)
    if (action === 'delete_order') {
      const orderId = body.order_id;
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'order_id é obrigatório.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: delError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (delError) {
        console.error('Erro ao excluir pedido:', delError);
        return new Response(
          JSON.stringify({ error: 'Erro ao excluir pedido no banco de dados.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Pedido excluído com sucesso!' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. AÇÃO: APAGAR MÚLTIPLOS PEDIDOS (BULK DELETE)
    if (action === 'delete_bulk_orders') {
      const orderIds = body.order_ids;
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'order_ids inválido ou vazio.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: delError } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);

      if (delError) {
        console.error('Erro ao excluir pedidos em massa:', delError);
        return new Response(
          JSON.stringify({ error: 'Erro ao excluir pedidos selecionados.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: `${orderIds.length} pedido(s) excluído(s) com sucesso!` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. AÇÃO: ENVIAR EVENTO PURCHASE VIA META CAPI (SERVER-SIDE DEDUPLICADO)
    if (action === 'send_capi_purchase') {
      const { order_id, event_id } = body;
      if (!order_id) {
        return new Response(
          JSON.stringify({ error: 'order_id é obrigatório.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: order, error: findError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order_id)
        .single();

      if (findError || !order) {
        return new Response(
          JSON.stringify({ error: 'Pedido não encontrado.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const metaResult = await sendMetaEvent({
        eventName: 'Purchase',
        eventId: event_id || `purchase_${order.id}`,
        eventTime: Math.floor(Date.now() / 1000),
        eventSourceUrl: 'https://agendanossasenhora.online',
        userData: {
          email: order.customer_email,
          phone: order.customer_phone,
          name: order.customer_name,
          externalId: order.id,
        },
        customData: {
          currency: 'BRL',
          value: (order.amount_cents || 2790) / 100,
          content_name: order.plan === 'completo' ? 'Agenda Católica 2027 + 5 Bônus Exclusivos' : 'Agenda Católica 2027 Básica',
          content_type: 'product',
          content_ids: [order.plan || 'completo'],
          order_id: order.id,
        }
      });

      return new Response(
        JSON.stringify({ success: true, meta: metaResult }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação desconhecida.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Erro em painel-api:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno no servidor do painel.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
