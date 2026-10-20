import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Trata CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const pushinToken = Deno.env.get('PUSHINPAY_TOKEN') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { name, email, phone, cpf, plan, tracking } = body;

    if (!name || !email || !phone) {
      return new Response(
        JSON.stringify({ error: 'Nome, e-mail e telefone são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const selectedPlan = plan === 'basico' ? 'basico' : 'completo';
    const amountCents = selectedPlan === 'basico' ? 1990 : 2790;

    // 1. Cria o registro inicial do pedido no Supabase
    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        customer_cpf: cpf || null,
        plan: selectedPlan,
        amount_cents: amountCents,
        status: 'pending',
        utm_source: tracking?.utm_source || null,
        utm_medium: tracking?.utm_medium || null,
        utm_campaign: tracking?.utm_campaign || null,
        utm_content: tracking?.utm_content || null,
        utm_term: tracking?.utm_term || null,
        fbclid: tracking?.fbclid || null,
        fbc: tracking?.fbc || null,
        fbp: tracking?.fbp || null,
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
      console.warn('PUSHINPAY_TOKEN não configurada nos segredos do Supabase.');
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
        pushinpay_transaction_id: pushinData.id,
        pix_code: pushinData.qr_code,
        pix_qr_code_base64: pushinData.qr_code_base64,
      })
      .eq('id', order.id);

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        transaction_id: pushinData.id,
        qr_code: pushinData.qr_code,
        qr_code_base64: pushinData.qr_code_base64,
        amount_cents: amountCents,
        status: 'pending',
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
