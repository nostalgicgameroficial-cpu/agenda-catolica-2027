import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendDeliveryEmail } from '../_shared/email.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('Webhook PushinPay recebido:', payload);

    const transactionId = payload.id;
    const status = payload.status;

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
        .single();

      if (error || !order) {
        console.warn(`Pedido não encontrado para a transação ${transactionId}`);
        return new Response(JSON.stringify({ warning: 'Pedido não localizado' }), {
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

      console.log(`Pedido ${order.id} processado com sucesso pelo Webhook!`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Erro no webhook PushinPay:', err);
    return new Response(JSON.stringify({ error: 'Erro interno ao processar webhook' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
