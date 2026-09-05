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

  // TODO: persist the verified event in your orders table and fulfil only PAID orders.
  return res.status(200).json({ received: true });
}
