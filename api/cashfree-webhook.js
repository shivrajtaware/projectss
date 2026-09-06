import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Cashfree signs: timestamp + raw request body.
  const timestamp = req.headers['x-webhook-timestamp'];
  const signature = req.headers['x-webhook-signature'];
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  if (!timestamp || !signature || !process.env.CASHFREE_CLIENT_SECRET) {
    return res.status(400).json({ error: 'Webhook headers or secret are missing.' });
  }
  const expected = crypto.createHmac('sha256', process.env.CASHFREE_CLIENT_SECRET).update(`${timestamp}${rawBody}`).digest('base64');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }

  let event;
  try { event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; } catch { return res.status(400).json({ error: 'Invalid webhook JSON.' }); }
  const orderId = event.data?.order?.order_id || event.data?.order_id;
  const paymentStatus = event.data?.payment?.payment_status || event.type;
  console.log(JSON.stringify({ received_at: new Date().toISOString(), order_id: orderId, payment_status: paymentStatus }));

  if (orderId && paymentStatus === 'SUCCESS' && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient } = await import('@supabase/supabase-js');
    const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: order } = await admin.from('orders').select('order_id,order_amount,referral_attribution_id,status').eq('order_id', orderId).maybeSingle();
    if (order) {
      await admin.from('orders').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('order_id', orderId);
      if (order.referral_attribution_id && order.status !== 'paid') {
        const amount = Number(order.order_amount);
        const reward = amount >= 10001 ? 1000 : amount >= 6001 ? 750 : amount >= 3000 ? 500 : 0;
        if (reward) await admin.from('referral_rewards').upsert({ attribution_id: order.referral_attribution_id, order_id: orderId, order_amount: amount, reward_amount: reward, status: 'pending' }, { onConflict: 'order_id' });
      }
    }
  }
  return res.status(200).json({ received: true });
}
