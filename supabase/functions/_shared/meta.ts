// @ts-nocheck
// ========================================================
// META CONVERSIONS API (CAPI) - AGYSYSTEM
// Envia eventos para a Graph API da Meta v19.0/v20.0
// Com hashing SHA-256 obrigatório, deduplicação por event_id
// e suporte avançado para fbp, fbc, IP, User Agent e URLs.
// ========================================================

const META_PIXEL_ID = Deno.env.get('META_PIXEL_ID') || '1133049763020624';
const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN') || '';
const META_TEST_EVENT_CODE = Deno.env.get('META_TEST_EVENT_CODE') || '';

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

export interface MetaUserData {
  email?: string;
  phone?: string;
  name?: string;
  clientIp?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
  externalId?: string;
}

export interface MetaCustomData {
  currency?: string;
  value?: number;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  num_items?: number;
  order_id?: string;
}

export interface MetaEventPayload {
  eventName: 'InitiateCheckout' | 'Purchase' | 'ViewContent' | 'AddToCart';
  eventId: string;
  eventTime?: number;
  eventSourceUrl?: string;
  userData: MetaUserData;
  customData: MetaCustomData;
}

export async function sendMetaEvent(payload: MetaEventPayload) {
  if (!META_ACCESS_TOKEN || !META_PIXEL_ID) {
    console.warn('[Meta CAPI] META_ACCESS_TOKEN ou META_PIXEL_ID não configurado.');
    return { success: false, error: 'Credenciais CAPI ausentes' };
  }

  try {
    const { eventName, eventId, eventTime, eventSourceUrl, userData, customData } = payload;

    // Normalização e Hash dos dados do cliente (LGPD e Meta Compliance)
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    console.log(`[Meta CAPI] Evento ${eventName} (ID: ${eventId}) enviado:`, result);

    return {
      success: response.ok,
      status: response.status,
      data: result,
      eventId: eventId
    };
  } catch (err) {
    console.error(`[Meta CAPI] Erro ao disparar evento ${payload.eventName}:`, err);
    return { success: false, error: err };
  }
}
