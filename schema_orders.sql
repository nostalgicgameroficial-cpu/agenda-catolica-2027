-- ============================================================
-- CRIAÇÃO DA TABELA DE PEDIDOS (ORDERS) - AGENDA CATÓLICA 2027
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_cpf TEXT,
    plan TEXT NOT NULL CHECK (plan IN ('basico', 'completo')),
    amount_cents INTEGER NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'pix',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'canceled')),
    
    -- Dados retornados pela PushinPay
    pushinpay_transaction_id TEXT,
    pix_code TEXT,
    pix_qr_code_base64 TEXT,
    
    -- Envio de e-mail de entrega via Resend
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    
    -- Rastreamento de tráfego (UTMs e Facebook CAPI)
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    fbclid TEXT,
    fbc TEXT,
    fbp TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_pushinpay_id ON public.orders(pushinpay_transaction_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON public.orders;
CREATE TRIGGER trigger_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança:
-- 1. Qualquer usuário anônimo pode criar um pedido
CREATE POLICY "Allow public insert to orders"
ON public.orders
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

-- 2. Qualquer usuário pode consultar um pedido se souber o ID dele (para ver tela de pagamento)
CREATE POLICY "Allow public select by id"
ON public.orders
FOR SELECT
TO anon, authenticated, service_role
USING (true);

-- 3. Atualizações são restritas ao service_role (Edge Functions / Webhook)
CREATE POLICY "Allow service_role full update"
ON public.orders
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
