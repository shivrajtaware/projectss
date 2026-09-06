const CASHFREE_API_VERSION = '2023-08-01';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const { projectId, projectName, amount, customer = {} } = req.body || {};
  const numericAmount = Number(amount);
  if (!projectId || !projectName || !Number.isFinite(numericAmount) || numericAmount < 1 || !customer.name || !customer.email || !customer.phone) {
    return json(res, 400, { error: 'Project, customer details and a valid amount are required.' });
  }
  if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
    return json(res, 503, { error: 'Cashfree is not configured on this deployment.' });
  }
  let buyerId = null;
  let attributionId = null;
  let admin = null;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient } = await import('@supabase/supabase-js');
    admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (token) {
      const { data: { user } } = await admin.auth.getUser(token);
      buyerId = user?.id || null;
      if (buyerId) {
        const { data } = await admin.from('referral_attributions').select('id').eq('referred_user_id', buyerId).maybeSingle();
        attributionId = data?.id || null;
      }
    }
  }

  const base = process.env.CASHFREE_MODE === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
  const orderId = `pv_${projectId}_${Date.now()}`;
  const origin = process.env.APP_URL || `https://${req.headers.host}`;
  try {
    const response = await fetch(`${base}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': CASHFREE_API_VERSION,
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: Math.round(numericAmount * 100) / 100,
        order_currency: 'INR',
        customer_details: {
          customer_id: `customer_${String(customer.phone).replace(/\D/g, '').slice(-10) || Date.now()}`,
          customer_name: String(customer.name).slice(0, 100),
          customer_email: String(customer.email).slice(0, 150),
          customer_phone: String(customer.phone).replace(/\D/g, '').slice(-15),
        },
        order_meta: {
          return_url: `${origin}/payment-success?order_id={order_id}`,
          notify_url: process.env.CASHFREE_WEBHOOK_URL || undefined,
        },
        order_note: String(projectName).slice(0, 200),
      }),
    });
    const data = await response.json();
    if (!response.ok) return json(res, response.status, { error: data.message || 'Cashfree rejected the order.' });
    if (admin) await admin.from('orders').insert({ order_id: orderId, buyer_id: buyerId, project_name: String(projectName).slice(0, 200), order_amount: numericAmount, referral_attribution_id: attributionId });
    return json(res, 200, { order_id: orderId, payment_session_id: data.payment_session_id });
  } catch (error) {
    return json(res, 502, { error: 'Unable to reach Cashfree. Please try again.' });
  }
};
