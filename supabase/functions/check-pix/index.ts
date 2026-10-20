// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendDeliveryEmail } from '../_shared/email.ts';
import { sendMetaEvent } from '../_shared/meta.ts';

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
    const { order_id } = body;

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Busca o pedido no Supabase
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (error || !order) {
      return new Response(
        JSON.stringify({ error: 'Pedido não encontrado.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se já foi pago anteriormente, retorna imediatamente
    if (order.status === 'paid') {
      return new Response(
        JSON.stringify({ status: 'paid', order }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Se estiver pendente, consulta na PushinPay pelo transaction_id
    if (order.status === 'pending' && order.pushinpay_transaction_id && pushinToken) {
      try {
        const checkRes = await fetch(
          `https://api.pushinpay.com.br/api/transactions/${order.pushinpay_transaction_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${pushinToken}`,
              'Accept': 'application/json',
            },
          }
        );

        if (checkRes.ok) {
          const pushinData = await checkRes.json();
          
          if (pushinData && pushinData.status === 'paid') {
            console.log(`Pedido ${order.id} confirmado como PAGO pela PushinPay!`);
            
            // Atualiza status no Supabase
            await supabase
              .from('orders')
              .update({
                status: 'paid',
                paid_at: new Date().toISOString(),
              })
              .eq('id', order.id);

            order.status = 'paid';

            // Envia e-mail de entrega via Resend caso ainda não enviado
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

            // Dispara evento Purchase na Meta Conversions API (CAPI)
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

              const finalFbc = order.fbc || (order.fbclid ? `fb.1.${new Date(order.created_at || Date.now()).getTime()}.${order.fbclid}` : undefined);

              sendMetaEvent({
                eventName: 'Purchase',
                eventId: purchaseEventId,
                eventSourceUrl: 'https://agendanossasenhora.online',
                userData: {
                  email: order.customer_email,
                  phone: order.customer_phone,
                  name: order.customer_name,
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
              }).catch(metaErr => console.error('Erro assíncrono ao enviar CAPI Purchase (CheckPix):', metaErr));
            } catch (metaErr) {
              console.error('Erro ao agendar CAPI Purchase (CheckPix):', metaErr);
            }

            return new Response(
              JSON.stringify({ status: 'paid', order }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (checkErr) {
        console.error('Erro ao consultar PushinPay:', checkErr);
      }
    }

    return new Response(
      JSON.stringify({ status: order.status, order }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Erro em check-pix:', err);
    return new Response(
      JSON.stringify({ error: 'Erro ao verificar status do pagamento.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
