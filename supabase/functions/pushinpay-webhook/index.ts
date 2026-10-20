// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendDeliveryEmail } from '../_shared/email.ts';
import { sendMetaEvent } from '../_shared/meta.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://cittmkbqdzxaexprujyy.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || 'sb_publishable_K8pfshJSKXwLwpWScjer-g_uRx4kCnn';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validação de Segurança do Token do Webhook (Header x-pushinpay-token)
    const EXPECTED_WEBHOOK_TOKEN = 'leaodourado15062929';
    const headerToken = req.headers.get('x-pushinpay-token');

    if (headerToken && headerToken !== EXPECTED_WEBHOOK_TOKEN) {
      console.warn('Webhook PushinPay rejeitado: header x-pushinpay-token inválido:', headerToken);
      return new Response(JSON.stringify({ error: 'Não autorizado: token de webhook inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let payload: any = null;
    try {
      payload = await req.json();
    } catch (_e) {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Webhook PushinPay recebido:', payload);

    const transactionId = payload ? payload.id : null;
    const status = payload ? payload.status : null;

    if (!transactionId) {
      return new Response(JSON.stringify({ error: 'Payload sem transaction id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (status === 'paid') {
      // 1. Busca o pedido pelo ID da transação
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('pushinpay_transaction_id', transactionId)
        .maybeSingle();

      if (error || !order) {
        console.warn(`Pedido não encontrado para a transação ${transactionId}`);
        return new Response(JSON.stringify({ warning: 'Pedido não localizado', transactionId }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 2. Atualiza pedido para pago
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      // 3. Dispara e-mail de entrega via Resend caso ainda não enviado
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
        }
      }

      // 4. Dispara evento Purchase na Meta Conversions API (CAPI)
      // com event_id único correspondente ao ID do pedido para deduplicação sem contagem dupla
      try {
        const purchaseEventId = `purchase_${order.id}`;
        const hasOrderBump = !!order.order_bump;
        const isUpsell = order.plan === 'upsell';
        const isDownsell = order.plan === 'downsell';
        const baseAmount = order.plan === 'basico' ? 19.90 : (isUpsell ? 67.90 : (isDownsell ? 29.90 : 27.90));
        const amount = order.amount_cents ? (order.amount_cents / 100) : (baseAmount + (hasOrderBump ? 7.90 : 0));

        let contentIds = [order.plan === 'completo' ? 'agenda-catolica-2027-completa' : 'agenda-catolica-2027-basica'];
        let contentName = order.plan === 'completo' ? 'Agenda Católica 2027 + 5 Bônus Exclusivos' : 'Agenda Católica 2027 Básica';

        if (isUpsell) {
          contentIds = ['quadros-sacros-150'];
          contentName = 'Mega Coleção 150 Quadros Sacros em Alta Definição';
        } else if (isDownsell) {
          contentIds = ['quadros-sacros-50'];
          contentName = 'Seleção 50 Quadros Sacros em Alta Definição';
        } else if (hasOrderBump) {
          contentIds.push('caderno-colorir-santos');
          contentName += ' + 50 Histórias dos Santos para Colorir';
        }

        sendMetaEvent({
          eventName: 'Purchase',
          eventId: purchaseEventId,
          eventSourceUrl: 'https://agendanossasenhora.online',
          userData: {
            email: order.customer_email,
            phone: order.customer_phone,
            name: order.customer_name,
            fbc: order.fbc || undefined,
            fbp: order.fbp || undefined,
            externalId: order.fbeid || order.id || undefined,
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
        }).catch(metaErr => console.error('Erro assíncrono ao enviar CAPI Purchase (Webhook):', metaErr));
      } catch (metaErr) {
        console.error('Erro ao agendar CAPI Purchase (Webhook):', metaErr);
      }

      console.log(`Pedido ${order.id} processado com sucesso pelo Webhook!`);
    }

    return new Response(JSON.stringify({ received: true, status }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    const errorMsg = err && err.message ? err.message : String(err);
    console.error('Erro no webhook PushinPay:', errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
